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
