using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Phase.Analytics.Models;

public sealed class BatchItemConverter : JsonConverter<BatchItem>
{
    public override BatchItem? ReadJson(
        JsonReader reader,
        Type objectType,
        BatchItem? existingValue,
        bool hasExistingValue,
        JsonSerializer serializer
    )
    {
        if (reader.TokenType == JsonToken.Null)
        {
            return null;
        }

        var obj = JObject.Load(reader);
        var type = obj.Value<string>("type");
        BatchItem item = type switch
        {
            "device" => new BatchDeviceItem(),
            "session" => new BatchSessionItem(),
            "event" => new BatchEventItem(),
            "ping" => new BatchPingItem(),
            _ => throw new JsonSerializationException($"Unknown batch item type: {type}"),
        };

        serializer.Populate(obj.CreateReader(), item);
        return item;
    }

    public override bool CanWrite => false;

    public override void WriteJson(JsonWriter writer, BatchItem? value, JsonSerializer serializer)
    {
        throw new NotSupportedException("BatchItemConverter is read-only.");
    }
}
