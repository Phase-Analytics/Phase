using Newtonsoft.Json;

namespace Phase.Analytics.Models;

public sealed class CreateSessionRequest
{
    [JsonProperty("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonProperty("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonProperty("startedAt")]
    public string StartedAt { get; set; } = string.Empty;
}
