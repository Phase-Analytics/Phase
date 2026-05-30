namespace Phase.Analytics.Config;

/// <summary>Phase SDK configuration.</summary>
public sealed class PhaseConfig
{
    /// <summary>Phase API key (required, starts with <c>phase_</c>).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Custom API endpoint. Default: https://api.phase.sh</summary>
    public string BaseUrl { get; set; } = "https://api.phase.sh";

    /// <summary>Console logging level.</summary>
    public LogLevel LogLevel { get; set; } = LogLevel.None;

    /// <summary>Mark identify/events as debug data.</summary>
    public bool DebugData { get; set; }

    /// <summary>Collect device metadata (model, OS, app version).</summary>
    public bool DeviceInfo { get; set; } = true;

    /// <summary>Collect locale and allow server geolocation from IP.</summary>
    public bool UserLocale { get; set; } = true;

    /// <summary>Auto-create lifecycle hook on initialize.</summary>
    public bool AutoBootstrap { get; set; } = true;

    /// <summary>Skip network calls in Unity Editor.</summary>
    public bool DisableInEditor { get; set; }

    /// <summary>
    /// Use <c>UnityWebRequest</c> for HTTP (marshaled to the main thread).
    /// Default is <c>System.Net.Http</c>, which is safe after <c>ConfigureAwait(false)</c>.
    /// </summary>
    public bool UseUnityWebRequestTransport { get; set; }

    /// <summary>Allow http base URL (development only).</summary>
    public bool AllowInsecureDev { get; set; }

    public string NormalizedBaseUrl =>
        string.IsNullOrWhiteSpace(BaseUrl)
            ? "https://api.phase.sh"
            : BaseUrl.TrimEnd('/');
}
