namespace Phase.Analytics.Models;

/// <summary>Device metadata collected locally.</summary>
public sealed class DeviceInfo
{
    public string? OsVersion { get; set; }

    public string? Locale { get; set; }

    public string? Model { get; set; }

    public string? AppVersion { get; set; }

    public string? UnityVersion { get; set; }
}
