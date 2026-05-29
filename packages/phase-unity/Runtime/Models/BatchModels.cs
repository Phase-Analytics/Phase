using System.Collections.Generic;
using Newtonsoft.Json;

namespace Phase.Analytics.Models;

public sealed class BatchRequest
{
    [JsonProperty("items")]
    public List<BatchItem> Items { get; set; } = new();
}

[JsonConverter(typeof(BatchItemConverter))]
public abstract class BatchItem
{
    [JsonProperty("type")]
    public abstract string Type { get; }

    [JsonProperty("clientOrder")]
    public int ClientOrder { get; set; }

    [JsonProperty("retryCount", NullValueHandling = NullValueHandling.Ignore)]
    public int? RetryCount { get; set; }
}

public sealed class BatchDeviceItem : BatchItem
{
    public override string Type => "device";

    [JsonProperty("payload")]
    public CreateDeviceRequest Payload { get; set; } = new();
}

public sealed class BatchSessionItem : BatchItem
{
    public override string Type => "session";

    [JsonProperty("payload")]
    public CreateSessionRequest Payload { get; set; } = new();
}

public sealed class BatchEventItem : BatchItem
{
    public override string Type => "event";

    [JsonProperty("payload")]
    public CreateEventRequest Payload { get; set; } = new();
}

public sealed class BatchPingItem : BatchItem
{
    public override string Type => "ping";

    [JsonProperty("payload")]
    public PingSessionRequest Payload { get; set; } = new();
}

public sealed class PingSessionRequest
{
    [JsonProperty("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonProperty("timestamp")]
    public string Timestamp { get; set; } = string.Empty;
}

public sealed class BatchResponse
{
    [JsonProperty("processed")]
    public int Processed { get; set; }

    [JsonProperty("failed")]
    public int Failed { get; set; }

    [JsonProperty("errors")]
    public List<BatchError> Errors { get; set; } = new();

    [JsonProperty("results")]
    public List<BatchResultItem> Results { get; set; } = new();
}

public sealed class BatchError
{
    [JsonProperty("clientOrder")]
    public int ClientOrder { get; set; }

    [JsonProperty("code")]
    public string Code { get; set; } = string.Empty;

    [JsonProperty("detail")]
    public string Detail { get; set; } = string.Empty;
}

public sealed class BatchResultItem
{
    [JsonProperty("clientOrder")]
    public int ClientOrder { get; set; }

    [JsonProperty("type")]
    public string Type { get; set; } = string.Empty;

    [JsonProperty("id")]
    public string Id { get; set; } = string.Empty;
}
