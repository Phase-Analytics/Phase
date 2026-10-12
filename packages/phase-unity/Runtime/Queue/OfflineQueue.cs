using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Queue;

/// <summary>
/// Persistent FIFO of batch items. Items leave the queue only when the sender reports them
/// delivered or permanently rejected, so an interrupted flush never loses data.
/// Disk writes are coalesced and happen at most once per <see cref="ValidationConstants.QueuePersistDelayMs"/>.
/// </summary>
public sealed class OfflineQueue : IDisposable
{
    private readonly object _sync = new();
    private readonly SemaphoreSlim _persistGate = new(1, 1);
    private readonly List<BatchItem> _queue = new();
    private readonly Timer _persistTimer;
    private int _clientOrder;
    private long _totalBytes;
    private long _version;
    private long _persistedVersion;
    private bool _persistScheduled;
    private bool _initialized;
    private bool _disposed;

    public OfflineQueue()
    {
        _persistTimer = new Timer(_ => OnPersistTimer(), null, Timeout.Infinite, Timeout.Infinite);
    }

    public async Task InitializeAsync()
    {
        var result = await StorageService
            .GetItemAsync<List<BatchItem>>(StorageKeys.OfflineQueue)
            .ConfigureAwait(false);

        var loaded = result.Success && result.Data != null ? result.Data : new List<BatchItem>();
        foreach (var item in loaded)
        {
            item.SizeBytes = MeasureSize(item);
        }

        lock (_sync)
        {
            _queue.Clear();
            _totalBytes = 0;
            var maxOrder = -1;
            foreach (var item in loaded)
            {
                _queue.Add(item);
                _totalBytes += item.SizeBytes;
                maxOrder = Math.Max(maxOrder, item.ClientOrder);
            }

            _clientOrder = maxOrder + 1;
            while (_queue.Count > 0 && IsOverCapacityLocked(0))
            {
                DropOldestSessionLocked();
            }

            _initialized = true;
        }
    }

    public void Enqueue(BatchItem item)
    {
        var size = MeasureSize(item);
        lock (_sync)
        {
            if (!_initialized)
            {
                Logger.Error("OfflineQueue not initialized. Call InitializeAsync() first.");
                return;
            }

            if (item is BatchPingItem ping)
            {
                // Only the latest heartbeat per session carries information.
                var sessionId = ping.Payload.SessionId;
                RemoveAllLocked(queued =>
                    queued is BatchPingItem queuedPing && queuedPing.Payload.SessionId == sessionId
                );
            }

            while (_queue.Count > 0 && IsOverCapacityLocked(size))
            {
                DropOldestSessionLocked();
            }

            item.ClientOrder = _clientOrder++;
            item.SizeBytes = size;
            _queue.Add(item);
            _totalBytes += size;
            MarkDirtyLocked();
        }
    }

    /// <summary>
    /// Returns the oldest items without removing them. Stops early at a device boundary because
    /// the server rejects batches that mix devices.
    /// </summary>
    public List<BatchItem> PeekBatch(int maxItems)
    {
        lock (_sync)
        {
            var batch = new List<BatchItem>(Math.Min(maxItems, _queue.Count));
            string? batchDeviceId = null;
            foreach (var item in _queue)
            {
                if (batch.Count >= maxItems)
                {
                    break;
                }

                var deviceId = GetDeviceId(item);
                if (deviceId != null)
                {
                    batchDeviceId ??= deviceId;
                    if (deviceId != batchDeviceId)
                    {
                        break;
                    }
                }

                batch.Add(item);
            }

            return batch;
        }
    }

    /// <summary>
    /// Removes <paramref name="completed"/> items and counts a failed attempt for
    /// <paramref name="retry"/> items, dropping those that hit the retry cap.
    /// Items no longer in the queue (replaced or evicted meanwhile) are ignored.
    /// </summary>
    /// <returns>Number of items kept for another attempt.</returns>
    public int CompleteBatch(IReadOnlyCollection<BatchItem> completed, IReadOnlyCollection<BatchItem> retry)
    {
        var exhausted = 0;
        var retained = 0;
        lock (_sync)
        {
            foreach (var item in completed)
            {
                RemoveLocked(item);
            }

            foreach (var item in retry)
            {
                if (!_queue.Contains(item))
                {
                    continue;
                }

                var attempts = (item.RetryCount ?? 0) + 1;
                if (attempts >= ValidationConstants.MaxItemRetryAttempts)
                {
                    RemoveLocked(item);
                    exhausted++;
                    continue;
                }

                item.RetryCount = attempts;
                retained++;
            }

            MarkDirtyLocked();
        }

        if (exhausted > 0)
        {
            Logger.Warn(
                $"Dropped {exhausted} item(s) after {ValidationConstants.MaxItemRetryAttempts} failed delivery attempts."
            );
        }

        return retained;
    }

    public async Task ClearAsync()
    {
        await _persistGate.WaitAsync().ConfigureAwait(false);
        try
        {
            lock (_sync)
            {
                _queue.Clear();
                _totalBytes = 0;
                _version++;
                _persistedVersion = _version;
            }

            var result = await StorageService
                .RemoveItemAsync(StorageKeys.OfflineQueue)
                .ConfigureAwait(false);
            if (!result.Success)
            {
                Logger.Error("Failed to clear queue from storage. Check permissions.", result.Error);
                lock (_sync)
                {
                    MarkDirtyLocked();
                }
            }
        }
        finally
        {
            _persistGate.Release();
        }
    }

    public int GetSize()
    {
        lock (_sync)
        {
            return _queue.Count;
        }
    }

    /// <summary>Writes pending changes to storage now instead of waiting for the debounce.</summary>
    public async Task PersistAsync()
    {
        await _persistGate.WaitAsync().ConfigureAwait(false);
        try
        {
            List<BatchItem> snapshot;
            long version;
            lock (_sync)
            {
                if (!_initialized || _version == _persistedVersion)
                {
                    return;
                }

                snapshot = new List<BatchItem>(_queue);
                version = _version;
            }

            var result = await StorageService
                .SetItemAsync(StorageKeys.OfflineQueue, snapshot)
                .ConfigureAwait(false);
            if (!result.Success)
            {
                Logger.Error("Failed to persist queue. Data may be lost on app crash.", result.Error);
                return;
            }

            lock (_sync)
            {
                _persistedVersion = Math.Max(_persistedVersion, version);
            }
        }
        finally
        {
            _persistGate.Release();
        }
    }

    /// <summary>
    /// Blocking persist for shutdown paths. Storage I/O runs on the thread pool, so this is safe to
    /// call from the Unity main thread.
    /// </summary>
    public bool PersistNow(TimeSpan timeout)
    {
        try
        {
            return PersistAsync().Wait(timeout);
        }
        catch (Exception error)
        {
            Logger.Error("Failed to persist queue.", error);
            return false;
        }
    }

    public void Dispose()
    {
        lock (_sync)
        {
            _disposed = true;
            _persistScheduled = false;
        }

        _persistTimer.Dispose();
    }

    private void OnPersistTimer()
    {
        lock (_sync)
        {
            _persistScheduled = false;
        }

        _ = PersistSafeAsync();
    }

    private async Task PersistSafeAsync()
    {
        try
        {
            await PersistAsync().ConfigureAwait(false);
        }
        catch (Exception error)
        {
            Logger.Error("Failed to persist queue.", error);
        }
    }

    private void MarkDirtyLocked()
    {
        _version++;
        if (_persistScheduled || _disposed)
        {
            return;
        }

        _persistScheduled = true;
        _persistTimer.Change(ValidationConstants.QueuePersistDelayMs, Timeout.Infinite);
    }

    private bool IsOverCapacityLocked(int incomingBytes) =>
        _queue.Count >= ValidationConstants.MaxOfflineQueueSize
        || _totalBytes + incomingBytes > ValidationConstants.MaxOfflineQueueBytes;

    private void RemoveLocked(BatchItem item)
    {
        if (_queue.Remove(item))
        {
            _totalBytes -= item.SizeBytes;
        }
    }

    private int RemoveAllLocked(Predicate<BatchItem> match)
    {
        var removedBytes = 0L;
        var removed = _queue.RemoveAll(item =>
        {
            if (!match(item))
            {
                return false;
            }

            removedBytes += item.SizeBytes;
            return true;
        });

        _totalBytes -= removedBytes;
        return removed;
    }

    private void DropOldestSessionLocked()
    {
        string? oldestSessionId = null;
        foreach (var item in _queue)
        {
            if (item is BatchSessionItem sessionItem)
            {
                oldestSessionId = sessionItem.Payload.SessionId;
                break;
            }
        }

        if (oldestSessionId == null)
        {
            var dropped = _queue[0];
            RemoveLocked(dropped);
            Logger.Info(
                "Offline queue full. No sessions to drop, dropping oldest item.",
                new Dictionary<string, object>
                {
                    ["type"] = dropped.Type,
                    ["clientOrder"] = dropped.ClientOrder,
                }
            );
            return;
        }

        var droppedCount = RemoveAllLocked(item =>
            item is not BatchDeviceItem && GetSessionId(item) == oldestSessionId
        );
        Logger.Info(
            "Offline queue full. Dropped oldest session and related items.",
            new Dictionary<string, object>
            {
                ["sessionId"] = oldestSessionId,
                ["droppedCount"] = droppedCount,
            }
        );
    }

    private static string? GetSessionId(BatchItem item) =>
        item switch
        {
            BatchSessionItem session => session.Payload.SessionId,
            BatchEventItem evt => evt.Payload.SessionId,
            BatchPingItem ping => ping.Payload.SessionId,
            _ => null,
        };

    private static string? GetDeviceId(BatchItem item) =>
        item switch
        {
            BatchDeviceItem device => device.Payload.DeviceId,
            BatchSessionItem session => session.Payload.DeviceId,
            _ => null,
        };

    private static int MeasureSize(BatchItem item) =>
        Encoding.UTF8.GetByteCount(JsonHelper.Serialize(item));
}
