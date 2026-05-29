using Newtonsoft.Json;

namespace Phase.Analytics.Models;

public sealed class CreateEventRequest
{
    [JsonProperty("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("params")]
    public EventParams? Params { get; set; }

    [JsonProperty("isScreen")]
    public bool IsScreen { get; set; }

    [JsonProperty("timestamp")]
    public string Timestamp { get; set; } = string.Empty;
}

public sealed class EventResponse
{
    [JsonProperty("eventId")]
    public string EventId { get; set; } = string.Empty;

    [JsonProperty("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonProperty("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("isScreen")]
    public bool IsScreen { get; set; }

    [JsonProperty("timestamp")]
    public string Timestamp { get; set; } = string.Empty;
}
