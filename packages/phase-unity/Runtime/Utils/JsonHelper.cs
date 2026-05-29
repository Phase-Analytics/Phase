using System.Collections.Generic;
using System.Linq;
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
        if (value is List<BatchItem> batchItems)
        {
            return SerializeBatchItems(batchItems);
        }

        return JsonConvert.SerializeObject(value, DefaultSettings);
    }

    public static string SerializeBatchItems(List<BatchItem> items)
    {
        var tokens = items.Select(item => JObject.FromObject(item, DefaultSerializer));
        return new JArray(tokens).ToString(Formatting.None);
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
        return array
            .Select(token => token.ToObject<BatchItem>(BatchReadSerializer)!)
            .ToList();
    }
}
