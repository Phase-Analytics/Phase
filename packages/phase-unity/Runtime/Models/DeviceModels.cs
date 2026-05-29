using Newtonsoft.Json;

namespace Phase.Analytics.Models;

public sealed class CreateDeviceRequest
{
    [JsonProperty("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonProperty("osVersion")]
    public string? OsVersion { get; set; }

    [JsonProperty("platform", NullValueHandling = NullValueHandling.Include)]
    public string? Platform { get; set; }

    [JsonProperty("locale")]
    public string? Locale { get; set; }

    [JsonProperty("model")]
    public string? Model { get; set; }

    [JsonProperty("properties")]
    public DeviceProperties? Properties { get; set; }

    [JsonProperty("disableGeolocation")]
    public bool? DisableGeolocation { get; set; }
}

public sealed class DeviceResponse
{
    [JsonProperty("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonProperty("osVersion")]
    public string? OsVersion { get; set; }

    [JsonProperty("platform")]
    public string? Platform { get; set; }

    [JsonProperty("locale")]
    public string? Locale { get; set; }

    [JsonProperty("country")]
    public string? Country { get; set; }

    [JsonProperty("city")]
    public string? City { get; set; }

    [JsonProperty("firstSeen")]
    public string FirstSeen { get; set; } = string.Empty;
}
