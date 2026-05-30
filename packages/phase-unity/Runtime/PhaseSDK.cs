using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Phase.Analytics.Client;
using Phase.Analytics.Config;
using Phase.Analytics.Device;
using Phase.Analytics.Managers;
using Phase.Analytics.Models;
using Phase.Analytics.Network;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics;

public sealed class PhaseSDK
{
    private readonly object _sync = new();
    private readonly List<Func<Task>> _pendingCalls = new();
    private readonly IDeviceInfoProvider _deviceInfoProvider;
    private readonly INetworkMonitor _networkMonitor;
    private readonly Func<PhaseConfig, IHttpTransport> _transportFactory;

    private PhaseConfig? _config;
    private SdkHttpClient? _httpClient;
    private OfflineQueue? _offlineQueue;
    private BatchSender? _batchSender;
    private DeviceManager? _deviceManager;
    private SessionManager? _sessionManager;
    private EventManager? _eventManager;
    private IDisposable? _networkSubscription;
    private bool _isInitialized;
    private bool _isInitializing;
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
        _deviceInfoProvider = deviceInfoProvider ?? CreateDefaultDeviceInfoProvider();
        _networkMonitor = networkMonitor ?? CreateDefaultNetworkMonitor();
        _transportFactory = config =>
            httpTransport ?? CreateDefaultTransport(config);
    }

    public bool IsInitialized
    {
        get
        {
            lock (_sync)
            {
                return _isInitialized;
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

    public async Task<bool> InitializeAsync(PhaseConfig config)
    {
        lock (_sync)
        {
            if (_isInitialized)
            {
                Logger.Warn("SDK already initialized. Skipping duplicate initialization.");
                return true;
            }

            if (_isInitializing)
            {
                Logger.Warn(
                    "SDK initialization already in progress. Skipping duplicate call."
                );
                return false;
            }

            _isInitializing = true;
        }

        if (!ConfigValidator.TryValidate(config, out var validationError))
        {
            Logger.Error(validationError);
            lock (_sync)
            {
                _isInitializing = false;
            }

            return false;
        }

        Logger.SetLogLevel(config.LogLevel);

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
#endif

            var deviceInfoProvider = _deviceInfoProvider;
#if UNITY_5_3_OR_NEWER
            deviceInfoProvider = new StaticDeviceInfoProvider(
                _deviceInfoProvider.GetDeviceInfo()
            );
#endif

            var transport = _transportFactory(config);
            _httpClient = new SdkHttpClient(
                config.ApiKey,
                transport,
                config.NormalizedBaseUrl,
                config.DebugData
            );

            _offlineQueue = new OfflineQueue();
            await _offlineQueue.InitializeAsync().ConfigureAwait(false);

            _batchSender = new BatchSender(_httpClient, _offlineQueue);
            _deviceManager = new DeviceManager(
                _httpClient,
                _offlineQueue,
                deviceInfoProvider,
                config
            );

            var deviceId = await _deviceManager.InitializeAsync().ConfigureAwait(false);
            _sessionManager = new SessionManager(_httpClient, _offlineQueue, deviceId);
            _eventManager = new EventManager(
                _httpClient,
                _offlineQueue,
                () => _sessionManager?.GetSessionId()
            );

            SetupNetworkListener();

            lock (_sync)
            {
                _isInitialized = true;
            }

            Logger.Info(
                "Phase SDK initialized successfully. Call Identify() to start tracking."
            );

            await ProcessPendingCallsAsync().ConfigureAwait(false);
            return true;
        }
        catch (Exception error)
        {
            Cleanup();
            Logger.Error("Failed to initialize SDK", error);
            return false;
        }
        finally
        {
            lock (_sync)
            {
                _isInitializing = false;
            }
        }
    }

    public Task IdentifyAsync(DeviceProperties? properties = null)
    {
        lock (_sync)
        {
            if (!_isInitialized)
            {
                Logger.Warn("SDK not initialized. Queuing identify() call.");
                var identifyTask = new TaskCompletionSource<object?>();
                _pendingCalls.Add(async () =>
                {
                    try
                    {
                        await IdentifyInternalAsync(properties).ConfigureAwait(false);
                        identifyTask.TrySetResult(null);
                    }
                    catch (Exception error)
                    {
                        identifyTask.TrySetException(error);
                    }
                });

                return identifyTask.Task;
            }
        }

        return IdentifyInternalAsync(properties);
    }

    public void Track(string name, EventParams? parameters = null)
    {
        lock (_sync)
        {
            if (!_isInitialized)
            {
                Logger.Warn("SDK not initialized. Queuing track() call.");
                _pendingCalls.Add(() =>
                {
                    Track(name, parameters);
                    return Task.CompletedTask;
                });
                return;
            }

            if (!_isIdentified)
            {
                Logger.Warn("Device not identified. Queuing track() call.");
                _pendingCalls.Add(() =>
                {
                    Track(name, parameters);
                    return Task.CompletedTask;
                });
                return;
            }
        }

        if (_eventManager == null)
        {
            Logger.Error("Event manager not ready. Initialization may have failed.");
            return;
        }

        _eventManager.Track(name, parameters);
    }

    public void Pause()
    {
        _sessionManager?.Pause();
    }

    public async Task ResumeAsync()
    {
        if (_sessionManager != null)
        {
            await _sessionManager.ResumeAsync().ConfigureAwait(false);
        }
    }

    public Task FlushAsync()
    {
        if (!IsIdentified || _batchSender == null)
        {
            return Task.CompletedTask;
        }

        return _batchSender.FlushAsync();
    }

    public void Dispose()
    {
        Cleanup();
    }

    private async Task IdentifyInternalAsync(DeviceProperties? properties)
    {
        if (_deviceManager == null || _sessionManager == null || _offlineQueue == null)
        {
            Logger.Error("SDK components not ready. Initialization may have failed.");
            return;
        }

        if (ShouldSkipNetwork())
        {
            lock (_sync)
            {
                _isIdentified = true;
            }

            await ProcessPendingCallsAsync().ConfigureAwait(false);
            return;
        }

        var networkState = await _networkMonitor.FetchNetworkStateAsync().ConfigureAwait(false);
        var isOnline = networkState.IsConnected;

        await _deviceManager.IdentifyAsync(isOnline, properties).ConfigureAwait(false);
        await _sessionManager.StartAsync(isOnline).ConfigureAwait(false);

        lock (_sync)
        {
            _isIdentified = true;
        }

        Logger.Info("Device identified and session started");
        await ProcessPendingCallsAsync().ConfigureAwait(false);

        if (isOnline && _batchSender != null && _offlineQueue.GetSize() > 0)
        {
            var queueSize = _offlineQueue.GetSize();
            Logger.Info($"Flushing offline queue after identification ({queueSize} items)");
            _ = _batchSender.FlushAsync().ContinueWith(
                task =>
                {
                    if (task.IsFaulted)
                    {
                        Logger.Error("Failed to flush offline queue. Will retry later.");
                    }
                },
                TaskScheduler.Default
            );
        }
    }

    private void SetupNetworkListener()
    {
        _networkSubscription?.Dispose();
        _networkSubscription = _networkMonitor.Subscribe(state =>
        {
            var isOnline = state.IsConnected;
            _sessionManager?.UpdateNetworkState(isOnline);
            _eventManager?.UpdateNetworkState(isOnline);

            if (
                isOnline
                && IsIdentified
                && _batchSender != null
                && _offlineQueue != null
                && _offlineQueue.GetSize() > 0
            )
            {
                Logger.Info("Network restored. Flushing offline queue.");
                _ = _batchSender.FlushAsync().ContinueWith(
                    task =>
                    {
                        if (task.IsFaulted)
                        {
                            Logger.Error("Failed to flush offline queue. Will retry later.");
                        }
                    },
                    TaskScheduler.Default
                );
            }
        });
    }

    private async Task ProcessPendingCallsAsync()
    {
        List<Func<Task>> calls;
        lock (_sync)
        {
            if (_pendingCalls.Count == 0)
            {
                return;
            }

            calls = new List<Func<Task>>(_pendingCalls);
            _pendingCalls.Clear();
        }

        Logger.Info($"Processing {calls.Count} queued calls");
        foreach (var call in calls)
        {
            try
            {
                await call().ConfigureAwait(false);
            }
            catch (Exception error)
            {
                Logger.Error("Failed to process queued call. Call may be lost.", error);
            }
        }
    }

    private void Cleanup()
    {
#if UNITY_5_3_OR_NEWER
        if (_networkMonitor is UnityNetworkMonitor unityNetworkMonitor)
        {
            PhaseLifecycleHook.UnregisterNetworkMonitor(unityNetworkMonitor);
        }
#endif

        _networkSubscription?.Dispose();
        _networkSubscription = null;
        _sessionManager?.Dispose();
        _sessionManager = null;
        _httpClient = null;
        _offlineQueue = null;
        _batchSender = null;
        _deviceManager = null;
        _eventManager = null;
        _config = null;

        lock (_sync)
        {
            _isInitialized = false;
            _isIdentified = false;
            _pendingCalls.Clear();
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

    private static IDeviceInfoProvider CreateDefaultDeviceInfoProvider() =>
        new UnityDeviceInfoProvider();

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

}
