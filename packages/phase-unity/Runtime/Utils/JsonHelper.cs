using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Phase.Analytics.Models;

namespace Phase.Analytics.Utils;

public static class JsonHelper
{
    // Timestamps are wire strings; DateParseHandling.None keeps them byte-for-byte instead of
    // round-tripping through DateTime into a culture-formatted string the server rejects.
    public static readonly JsonSerializerSettings DefaultSettings = new()
    {
        NullValueHandling = NullValueHandling.Ignore,
        DateParseHandling = DateParseHandling.None,
    };

    private static readonly JsonSerializer DefaultSerializer =
        JsonSerializer.Create(DefaultSettings);

    private static readonly JsonSerializer BatchReadSerializer = JsonSerializer.Create(
        new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            DateParseHandling = DateParseHandling.None,
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

        using var reader = new JsonTextReader(new StringReader(json))
        {
            DateParseHandling = DateParseHandling.None,
        };
        var array = JArray.Load(reader);
        var items = new List<BatchItem>(array.Count);
        var skipped = 0;
        foreach (var token in array)
        {
            // One unreadable item (e.g. written by a newer SDK) must not discard the whole queue.
            try
            {
                var item = token.ToObject<BatchItem>(BatchReadSerializer);
                if (item != null)
                {
                    items.Add(item);
                }
            }
            catch (JsonException)
            {
                skipped++;
            }
        }

        if (skipped > 0)
        {
            Logger.Warn($"Skipped {skipped} unreadable queued item(s).");
        }

        return items;
    }
}
