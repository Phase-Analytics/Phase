using Newtonsoft.Json;

namespace Phase.Analytics.Models;

public sealed class CreateEventRequest
{
    /// <summary>Client-generated ULID, stable across retries so the server can deduplicate.</summary>
    [JsonProperty("eventId", NullValueHandling = NullValueHandling.Ignore)]
    public string? EventId { get; set; }

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
