using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Phase.Analytics.Models;

namespace Phase.Analytics.Utils;

public static class JsonHelper
{
    public static readonly JsonSerializerSettings DefaultSettings = new()
    {
        NullValueHandling = NullValueHandling.Ignore,
    };

    private static readonly JsonSerializer DefaultSerializer =
        JsonSerializer.Create(DefaultSettings);

    private static readonly JsonSerializer BatchReadSerializer = JsonSerializer.Create(
        new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            Converters = { new BatchItemConverter() },
        }
    );

    public static string Serialize(object? value)
    {
        using var writer = new StringWriter();
        Serialize(writer, value);
        return writer.ToString();
    }

    /// <summary>Writes JSON straight to <paramref name="writer"/> without an intermediate tree.</summary>
    public static void Serialize(TextWriter writer, object? value)
    {
        using var jsonWriter = new JsonTextWriter(writer) { CloseOutput = false };
        DefaultSerializer.Serialize(jsonWriter, value);
        jsonWriter.Flush();
    }

    /// <summary>Wire format for <c>POST /sdk/batch</c>; omits local bookkeeping such as retry counts.</summary>
    public static string SerializeBatchRequest(IReadOnlyList<BatchItem> items)
    {
        using var writer = new StringWriter();
        using (var jsonWriter = new JsonTextWriter(writer) { CloseOutput = false })
        {
            jsonWriter.WriteStartObject();
            jsonWriter.WritePropertyName("items");
            jsonWriter.WriteStartArray();
            foreach (var item in items)
            {
                jsonWriter.WriteStartObject();
                jsonWriter.WritePropertyName("type");
                jsonWriter.WriteValue(item.Type);
                jsonWriter.WritePropertyName("clientOrder");
                jsonWriter.WriteValue(item.ClientOrder);
                jsonWriter.WritePropertyName("payload");
                DefaultSerializer.Serialize(jsonWriter, item.PayloadValue);
                jsonWriter.WriteEndObject();
            }

            jsonWriter.WriteEndArray();
            jsonWriter.WriteEndObject();
        }

        return writer.ToString();
    }

    public static T? Deserialize<T>(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return default;
        }

        if (typeof(T) == typeof(List<BatchItem>))
        {
            return (T?)(object?)DeserializeBatchItems(json);
        }

        return JsonConvert.DeserializeObject<T>(json, DefaultSettings);
    }

    public static List<BatchItem>? DeserializeBatchItems(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        var array = JArray.Parse(json);
        var items = new List<BatchItem>(array.Count);
        foreach (var token in array)
        {
            var item = token.ToObject<BatchItem>(BatchReadSerializer);
            if (item != null)
            {
                items.Add(item);
            }
        }

        return items;
    }
}
