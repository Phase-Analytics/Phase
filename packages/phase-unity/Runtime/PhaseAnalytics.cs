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

    /// <summary>Tracks a custom event. Requires prior identify.</summary>
    public static void Track(string name, EventParams? parameters = null)
    {
        lock (Sync)
        {
            _sdk ??= new PhaseSDK();
            _sdk.Track(name, parameters);
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

    internal static Task ResumeAsync()
    {
        lock (Sync)
        {
            return _sdk?.ResumeAsync() ?? Task.CompletedTask;
        }
    }

    internal static Task FlushAsync()
    {
        lock (Sync)
        {
            return _sdk?.FlushAsync() ?? Task.CompletedTask;
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
