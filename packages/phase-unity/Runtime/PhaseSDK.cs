using System;
using System.Threading.Tasks;
using Phase.Analytics.Client;
using Phase.Analytics.Config;
using Phase.Analytics.Constants;
using Phase.Analytics.Device;
using Phase.Analytics.Managers;
using Phase.Analytics.Models;
using Phase.Analytics.Network;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics;

public sealed class PhaseSDK : IDisposable
{
    private readonly object _sync = new();
    // Exists before initialize so Track calls made before identify are captured, not dropped.
    private readonly EventManager _events = new();
    private readonly IDeviceInfoProvider _deviceInfoProvider;
    private readonly INetworkMonitor _networkMonitor;
    private readonly Func<PhaseConfig, IHttpTransport> _transportFactory;

    private Components? _components;
    private Task<bool>? _initTask;
    private PendingIdentify? _pendingIdentify;
    private Task? _resetTask;
    private IDisposable? _networkSubscription;
    private PhaseConfig? _config;
    private volatile bool _isOnline = true;
    private bool _isIdentified;
#if UNITY_5_3_OR_NEWER && UNITY_EDITOR
    private bool _disableInEditorLogged;
#endif

    public PhaseSDK()
        : this(null, null, null)
    {
    }

    internal PhaseSDK(
        IDeviceInfoProvider? deviceInfoProvider,
        INetworkMonitor? networkMonitor,
        IHttpTransport? httpTransport
    )
    {
        _deviceInfoProvider = deviceInfoProvider ?? new UnityDeviceInfoProvider();
        _networkMonitor = networkMonitor ?? CreateDefaultNetworkMonitor();
        _transportFactory = config => httpTransport ?? CreateDefaultTransport(config);
    }

    public bool IsInitialized
    {
        get
        {
            lock (_sync)
            {
                return _components != null;
            }
        }
    }

    public bool IsIdentified
    {
        get
        {
            lock (_sync)
            {
                return _isIdentified;
            }
        }
    }

    /// <summary>Concurrent callers share the in-flight initialization.</summary>
    public Task<bool> InitializeAsync(PhaseConfig config)
    {
        lock (_sync)
        {
            if (_components != null)
            {
                Logger.Warn("SDK already initialized. Skipping duplicate initialization.");
                return Task.FromResult(true);
            }

            if (_initTask == null || _initTask.IsCompleted)
            {
                _initTask = InitializeCoreAsync(config);
            }

            return _initTask;
        }
    }

    public Task IdentifyAsync(DeviceProperties? properties = null)
    {
        lock (_sync)
        {
            if (_components == null)
            {
                Logger.Info("SDK not initialized yet. Identify will run after initialization.");
                // The server merges device properties, so merging queued calls is equivalent.
                _pendingIdentify ??= new PendingIdentify();
                _pendingIdentify.Merge(properties);
                return _pendingIdentify.Completion.Task;
            }
        }

        return IdentifyAfterResetAsync(properties);
    }

    public void Track(string name, EventParams? parameters = null) =>
        _events.Track(name, parameters, isScreen: false);

    public void TrackScreen(string name, EventParams? parameters = null) =>
        _events.Track(name, parameters, isScreen: true);

    /// <summary>Sends queued data now (ignoring local failure backoff) and persists what remains.</summary>
    public async Task FlushAsync()
    {
        var components = GetComponents();
        if (components == null)
        {
            return;
        }

        if (CanFlush())
        {
            await components.Sender.FlushAsync(ignoreBackoff: true).ConfigureAwait(false);
        }

        await components.Queue.PersistAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// Forgets the current device (e.g. on logout): ends the session, tries to deliver queued data,
    /// clears the queue and generates a new device ID. Call identify again to resume tracking.
    /// </summary>
    public Task ResetAsync()
    {
        lock (_sync)
        {
            if (_resetTask == null || _resetTask.IsCompleted)
            {
                _resetTask = ResetCoreAsync();
            }

            return _resetTask;
        }
    }

    /// <summary>App went to background: stop heartbeats, start a flush and save the queue.</summary>
    public void Pause()
    {
        var components = GetComponents();
        if (components == null)
        {
            return;
        }

        components.Session.Pause();
        components.Scheduler.Trigger(ignoreBackoff: true);
        _ = components.Queue.PersistAsync();
    }

    public void Resume()
    {
        var components = GetComponents();
        if (components == null)
        {
            return;
        }

        components.Session.Resume();
        components.Scheduler.Trigger();
    }

    /// <summary>
    /// Blocking save for app quit. Never waits on the network: with the UnityWebRequest transport a
    /// request needs the main thread, so waiting for it here would deadlock.
    /// </summary>
    public void PersistOnQuit()
    {
        GetComponents()?.Queue.PersistNow(
            TimeSpan.FromMilliseconds(ValidationConstants.QueuePersistOnQuitTimeoutMs)
        );
    }

    public void Dispose()
    {
        PersistOnQuit();
        Teardown();
    }

    private async Task<bool> InitializeCoreAsync(PhaseConfig config)
    {
        if (!ConfigValidator.TryValidate(config, out var validationError))
        {
            Logger.Error(validationError);
            FailPendingIdentify();
            return false;
        }

        Logger.SetLogLevel(config.LogLevel);
        OfflineQueue? queue = null;

        try
        {
            EnsureStorageAdapter();
            _config = config;

#if UNITY_5_3_OR_NEWER
            if (config.AutoBootstrap)
            {
                PhaseLifecycleHook.EnsureExists();
            }

            if (_networkMonitor is UnityNetworkMonitor unityNetworkMonitor)
            {
                PhaseLifecycleHook.RegisterNetworkMonitor(unityNetworkMonitor);
            }

            // Application/SystemInfo are main-thread only; read them before the first await.
            IDeviceInfoProvider deviceInfoProvider = new StaticDeviceInfoProvider(
                _deviceInfoProvider.GetDeviceInfo()
            );
#else
            var deviceInfoProvider = _deviceInfoProvider;
#endif

            var httpClient = new SdkHttpClient(
                config.ApiKey,
                _transportFactory(config),
                config.NormalizedBaseUrl,
                config.DebugData
            );

            queue = new OfflineQueue();
            await queue.InitializeAsync().ConfigureAwait(false);

            var device = new DeviceManager(queue, deviceInfoProvider, config);
            await device.InitializeAsync().ConfigureAwait(false);

            var sender = new BatchSender(httpClient, queue);
            var components = new Components(
                queue,
                sender,
                new FlushScheduler(sender, queue, CanFlush),
                device,
                new SessionManager(queue, device.GetDeviceId)
            );

            await SetupNetworkListenerAsync(components).ConfigureAwait(false);

            PendingIdentify? pending;
            lock (_sync)
            {
                _components = components;
                pending = _pendingIdentify;
                _pendingIdentify = null;
            }

            Logger.Info("Phase SDK initialized successfully. Call Identify() to start tracking.");
            components.Scheduler.Trigger();

            if (pending != null)
            {
                IdentifyNow(components, pending.Properties);
                pending.Completion.TrySetResult(null);
            }

            return true;
        }
        catch (Exception error)
        {
            Logger.Error("Failed to initialize SDK", error);
            queue?.Dispose();
            Teardown();
            FailPendingIdentify();
            return false;
        }
    }

    private async Task IdentifyAfterResetAsync(DeviceProperties? properties)
    {
        Task? reset;
        lock (_sync)
        {
            reset = _resetTask;
        }

        if (reset != null)
        {
            await reset.ConfigureAwait(false);
        }

        var components = GetComponents();
        if (components != null)
        {
            IdentifyNow(components, properties);
        }
    }

    private void IdentifyNow(Components components, DeviceProperties? properties)
    {
        if (ShouldSkipNetwork())
        {
            lock (_sync)
            {
                _isIdentified = true;
            }

            return;
        }

        components.Device.Identify(properties);
        components.Session.Start(_events.GetEarliestPendingUtc());
        _events.Attach(
            components.Queue,
            components.Session.GetSessionId,
            () =>
            {
                components.Session.MarkActivity();
                components.Scheduler.NotifyEnqueued();
            }
        );

        lock (_sync)
        {
            _isIdentified = true;
        }

        components.Scheduler.Trigger(ignoreBackoff: true);
        Logger.Info("Device identified and session started");
    }

    private async Task ResetCoreAsync()
    {
        Components? components;
        lock (_sync)
        {
            _pendingIdentify?.Completion.TrySetResult(null);
            _pendingIdentify = null;
            components = _components;
            _isIdentified = false;
        }

        if (components == null)
        {
            Logger.Warn("Reset called before initialization. Nothing to reset.");
            return;
        }

        _events.Detach();
        components.Session.End();

        if (CanFlush())
        {
            await components.Sender.FlushAsync(ignoreBackoff: true).ConfigureAwait(false);
        }

        var unsent = components.Queue.GetSize();
        if (unsent > 0)
        {
            Logger.Warn($"Reset discarded {unsent} unsent item(s).");
        }

        await components.Queue.ClearAsync().ConfigureAwait(false);
        await components.Device.ResetAsync().ConfigureAwait(false);
        Logger.Info("SDK reset. Call Identify() to start tracking again.");
    }

    private async Task SetupNetworkListenerAsync(Components components)
    {
        try
        {
            var state = await _networkMonitor.FetchNetworkStateAsync().ConfigureAwait(false);
            _isOnline = state.IsConnected;
        }
        catch (Exception error)
        {
            Logger.Warn($"Failed to read network state. Assuming online. {error.Message}");
            _isOnline = true;
        }

        _networkSubscription?.Dispose();
        _networkSubscription = _networkMonitor.Subscribe(state =>
        {
            var wasOnline = _isOnline;
            _isOnline = state.IsConnected;
            if (state.IsConnected && !wasOnline)
            {
                Logger.Info("Network restored. Flushing offline queue.");
                components.Sender.ResetBackoff();
                components.Scheduler.Trigger();
            }
        });
    }

    private bool CanFlush() => _isOnline && !ShouldSkipNetwork();

    private Components? GetComponents()
    {
        lock (_sync)
        {
            return _components;
        }
    }

    private void FailPendingIdentify()
    {
        PendingIdentify? pending;
        lock (_sync)
        {
            pending = _pendingIdentify;
            _pendingIdentify = null;
        }

        // Identify is fire-and-forget for callers; initialization already reported the failure.
        pending?.Completion.TrySetResult(null);
    }

    private void Teardown()
    {
#if UNITY_5_3_OR_NEWER
        if (_networkMonitor is UnityNetworkMonitor unityNetworkMonitor)
        {
            PhaseLifecycleHook.UnregisterNetworkMonitor(unityNetworkMonitor);
        }
#endif

        _networkSubscription?.Dispose();
        _networkSubscription = null;
        _events.Detach();

        Components? components;
        lock (_sync)
        {
            components = _components;
            _components = null;
            _isIdentified = false;
            _config = null;
        }

        if (components != null)
        {
            components.Scheduler.Dispose();
            components.Session.Dispose();
            components.Queue.Dispose();
        }
    }

    private static void EnsureStorageAdapter()
    {
        if (StorageService.HasAdapter)
        {
            return;
        }

#if UNITY_5_3_OR_NEWER
        StorageService.UseUnityDefaults();
#else
        throw new InvalidOperationException(
            "Storage adapter not initialized. Call StorageService.SetAdapter before Initialize."
        );
#endif
    }

    private bool ShouldSkipNetwork()
    {
#if UNITY_5_3_OR_NEWER && UNITY_EDITOR
        if (_config?.DisableInEditor != true)
        {
            return false;
        }

        if (!_disableInEditorLogged)
        {
            Logger.Info("DisableInEditor enabled. Skipping network calls in Unity Editor.");
            _disableInEditorLogged = true;
        }

        return true;
#else
        return false;
#endif
    }

    private static INetworkMonitor CreateDefaultNetworkMonitor()
    {
#if UNITY_5_3_OR_NEWER
        return new UnityNetworkMonitor();
#else
        return new AlwaysOnlineNetworkMonitor();
#endif
    }

    private static IHttpTransport CreateDefaultTransport(PhaseConfig config)
    {
#if UNITY_5_3_OR_NEWER
        return config.UseUnityWebRequestTransport
            ? new UnityWebRequestTransport()
            : new SystemNetHttpTransport();
#else
        return new SystemNetHttpTransport();
#endif
    }

    private sealed class Components
    {
        public Components(
            OfflineQueue queue,
            BatchSender sender,
            FlushScheduler scheduler,
            DeviceManager device,
            SessionManager session
        )
        {
            Queue = queue;
            Sender = sender;
            Scheduler = scheduler;
            Device = device;
            Session = session;
        }

        public OfflineQueue Queue { get; }

        public BatchSender Sender { get; }

        public FlushScheduler Scheduler { get; }

        public DeviceManager Device { get; }

        public SessionManager Session { get; }
    }

    private sealed class PendingIdentify
    {
        public DeviceProperties? Properties { get; private set; }

        public TaskCompletionSource<object?> Completion { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public void Merge(DeviceProperties? properties)
        {
            if (properties == null)
            {
                return;
            }

            Properties ??= new DeviceProperties();
            foreach (var entry in properties)
            {
                Properties[entry.Key] = entry.Value;
            }
        }
    }
}
