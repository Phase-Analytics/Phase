using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Phase.Analytics.Client;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Queue;

public sealed class BatchSender
{
    private readonly SdkHttpClient _httpClient;
    private readonly OfflineQueue _offlineQueue;
    private bool _isFlushing;

    public BatchSender(SdkHttpClient httpClient, OfflineQueue offlineQueue)
    {
        _httpClient = httpClient;
        _offlineQueue = offlineQueue;
    }

    public async Task FlushAsync()
    {
        if (_isFlushing)
        {
            Logger.Warn("Flush already in progress. Skipping duplicate flush.");
            return;
        }

        _isFlushing = true;
        try
        {
            await FlushWithTimeoutAsync().ConfigureAwait(false);
        }
        finally
        {
            _isFlushing = false;
        }
    }

    private async Task FlushWithTimeoutAsync()
    {
        var flushTask = PerformFlushAsync();
        var delayTask = Task.Delay(ValidationConstants.FlushTimeoutMs);

        try
        {
            var completed = await Task.WhenAny(flushTask, delayTask).ConfigureAwait(false);
            if (completed != flushTask)
            {
                throw new TimeoutException("Flush timeout");
            }

            await flushTask.ConfigureAwait(false);
        }
        catch (Exception error)
        {
            Logger.Error("Flush failed or timed out. Dropping remaining items.", error);
        }
    }

    private async Task PerformFlushAsync()
    {
        var items = await _offlineQueue.DequeueAllAsync().ConfigureAwait(false);
        if (items.Count == 0)
        {
            return;
        }

        var deduplicatedItems = DeduplicateByTimestamp(items);
        var batches = SplitIntoBatches(deduplicatedItems);

        foreach (var batch in batches)
        {
            try
            {
                await SendBatchAsync(batch).ConfigureAwait(false);
            }
            catch (Exception error)
            {
                Logger.Error("Batch send error. Dropping batch (fire & forget).", error);
            }
        }
    }

    private async Task SendBatchAsync(List<BatchItem> items)
    {
        foreach (var item in items)
        {
            item.RetryCount = null;
        }

        var result = await _httpClient
            .SendBatchAsync(new BatchRequest { Items = items })
            .ConfigureAwait(false);

        if (!result.Success)
        {
            Logger.Warn("Batch request failed. Dropping batch (fire & forget).", new Dictionary<string, object>
            {
                ["error"] = result.Error?.Message ?? "unknown",
            });
            return;
        }

        if (result.Data != null && result.Data.Failed > 0)
        {
            Logger.Warn(
                $"Batch partially failed: {result.Data.Failed}/{(result.Data.Processed) + result.Data.Failed} items dropped."
            );
        }
    }

    private static List<BatchItem> DeduplicateByTimestamp(List<BatchItem> items)
    {
        var seenEvents = new Dictionary<string, long>();
        var dedupedItems = new List<BatchItem>();

        foreach (var item in items)
        {
            if (item is not BatchEventItem eventItem)
            {
                dedupedItems.Add(item);
                continue;
            }

            var key = CreateEventKey(eventItem.Payload.Name, eventItem.Payload.Params);
            if (
                !DateTimeOffset.TryParse(
                    eventItem.Payload.Timestamp,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind,
                    out var timestamp
                )
            )
            {
                Logger.Warn("Invalid timestamp format. Including event anyway.");
                dedupedItems.Add(item);
                continue;
            }

            var timestampMs = timestamp.ToUnixTimeMilliseconds();
            if (
                seenEvents.TryGetValue(key, out var lastTime)
                && timestampMs - lastTime < ValidationConstants.DedupWindowMs
            )
            {
                Logger.Warn(
                    "Duplicate event in batch detected. Dropping event.",
                    new Dictionary<string, object> { ["name"] = eventItem.Payload.Name }
                );
                continue;
            }

            seenEvents[key] = timestampMs;
            dedupedItems.Add(item);
        }

        var droppedCount = items.Count - dedupedItems.Count;
        if (droppedCount > 0)
        {
            Logger.Info($"Dropped {droppedCount} duplicate event(s) from batch based on timestamp.");
        }

        return dedupedItems;
    }

    private static string CreateEventKey(string name, EventParams? parameters)
    {
        if (parameters == null || parameters.Count == 0)
        {
            return name;
        }

        try
        {
            var sorted = new EventParams();
            foreach (var key in parameters.Keys.OrderBy(static k => k, StringComparer.Ordinal))
            {
                sorted[key] = parameters[key];
            }

            return $"{name}:{JsonHelper.Serialize(sorted)}";
        }
        catch
        {
            return name;
        }
    }

    private static List<List<BatchItem>> SplitIntoBatches(List<BatchItem> items)
    {
        var batches = new List<List<BatchItem>>();
        for (var i = 0; i < items.Count; i += ValidationConstants.BatchMaxSize)
        {
            batches.Add(items.Skip(i).Take(ValidationConstants.BatchMaxSize).ToList());
        }

        return batches;
    }
}
