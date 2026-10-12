using System.Threading.Tasks;
using Phase.Analytics.Config;
using Phase.Analytics.Models;

namespace Phase.Analytics;

/// <summary>Public static entry points for the Phase Unity SDK.</summary>
public static class PhaseAnalytics
{
    private static readonly object Sync = new();
    private static PhaseSDK? _sdk;

    /// <summary>Whether <see cref="InitializeAsync"/> completed successfully.</summary>
    public static bool IsInitialized
    {
        get
        {
            lock (Sync)
            {
                return _sdk?.IsInitialized ?? false;
            }
        }
    }

    /// <summary>Whether <see cref="IdentifyAsync"/> completed successfully.</summary>
    public static bool IsIdentified
    {
        get
        {
            lock (Sync)
            {
                return _sdk?.IsIdentified ?? false;
            }
        }
    }

    /// <summary>Initializes storage, HTTP, managers, and optional lifecycle hook.</summary>
    public static Task<bool> InitializeAsync(PhaseConfig config)
    {
        lock (Sync)
        {
            _sdk ??= new PhaseSDK();
            return _sdk.InitializeAsync(config);
        }
    }

    /// <summary>Registers the device and starts a session.</summary>
    public static Task IdentifyAsync(DeviceProperties? properties = null)
    {
        lock (Sync)
        {
            _sdk ??= new PhaseSDK();
            return _sdk.IdentifyAsync(properties);
        }
    }

    /// <summary>
    /// Tracks a custom event. The id and timestamp are taken now; events tracked before identify
    /// are buffered (up to 200) and delivered once a session exists.
    /// </summary>
    public static void Track(string name, EventParams? parameters = null)
    {
        lock (Sync)
        {
            _sdk ??= new PhaseSDK();
            _sdk.Track(name, parameters);
        }
    }

    /// <summary>Tracks a screen view. Same delivery rules as <see cref="Track"/>.</summary>
    public static void TrackScreen(string name, EventParams? parameters = null)
    {
        lock (Sync)
        {
            _sdk ??= new PhaseSDK();
            _sdk.TrackScreen(name, parameters);
        }
    }

    /// <summary>Sends queued data now and saves whatever could not be delivered.</summary>
    public static Task FlushAsync()
    {
        lock (Sync)
        {
            return _sdk?.FlushAsync() ?? Task.CompletedTask;
        }
    }

    /// <summary>
    /// Forgets the current device (e.g. on logout): ends the session, tries to deliver queued data,
    /// clears the queue and generates a new device ID. Call <see cref="IdentifyAsync"/> again after.
    /// </summary>
    public static Task ResetAsync()
    {
        lock (Sync)
        {
            return _sdk?.ResetAsync() ?? Task.CompletedTask;
        }
    }

    /// <summary>Clears persisted Phase SDK data on device.</summary>
    public static Task ClearLocalDataAsync() => PhaseStorage.ClearLocalDataAsync();

    internal static void Pause()
    {
        lock (Sync)
        {
            _sdk?.Pause();
        }
    }

    internal static void Resume()
    {
        lock (Sync)
        {
            _sdk?.Resume();
        }
    }

    internal static void PersistOnQuit()
    {
        lock (Sync)
        {
            _sdk?.PersistOnQuit();
        }
    }

#if UNITY_EDITOR
    internal static void ResetForEditor()
    {
        lock (Sync)
        {
            _sdk?.Dispose();
            _sdk = null;
        }
    }
#endif
}
