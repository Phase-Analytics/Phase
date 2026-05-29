using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Queue;

public sealed class OfflineQueue
{
    private readonly List<BatchItem> _queue = new();
    private int _clientOrder;
    private Task _operationQueue = Task.CompletedTask;
    private Task _initializeTask = Task.CompletedTask;
    private bool _initialized;

    public Task InitializeAsync()
    {
        _initializeTask = LoadFromStorageAsync();
        return _initializeTask;
    }

    private async Task LoadFromStorageAsync()
    {
        var result = await StorageService
            .GetItemAsync<List<BatchItem>>(StorageKeys.OfflineQueue)
            .ConfigureAwait(false);

        if (result.Success && result.Data != null && result.Data.Count > 0)
        {
            await EnqueueOperation(() =>
                {
                    _queue.Clear();
                    _queue.AddRange(result.Data);

                    var orders = _queue
                        .Select(static item => item.ClientOrder)
                        .Where(static order => order >= 0)
                        .ToList();

                    _clientOrder = orders.Count > 0 ? orders.Max() + 1 : 0;
                    return Task.CompletedTask;
                })
                .ConfigureAwait(false);
        }

        _initialized = true;
    }

    public Task EnqueueAsync(BatchItem item, bool preserveClientOrder = false)
    {
        return EnqueueOperation(async () =>
        {
            await _initializeTask.ConfigureAwait(false);

            if (!_initialized)
            {
                Logger.Error(
                    "OfflineQueue not initialized. Call InitializeAsync() first."
                );
                return;
            }

            if (_queue.Count >= ValidationConstants.MaxOfflineQueueSize)
            {
                DropOldestSession();
            }

            var queueItem = preserveClientOrder ? item : AssignClientOrder(item);
            _queue.Add(queueItem);

            var persistResult = await PersistAsync().ConfigureAwait(false);
            if (!persistResult.Success)
            {
                Logger.Error("Failed to persist queue. Data may be lost on app crash.");
            }
        });
    }

    public Task<List<BatchItem>> DequeueAllAsync()
    {
        return EnqueueOperation(async () =>
        {
            await _initializeTask.ConfigureAwait(false);

            if (!_initialized)
            {
                return new List<BatchItem>();
            }

            var items = new List<BatchItem>(_queue);
            _queue.Clear();
            _clientOrder = 0;

            var persistResult = await PersistAsync().ConfigureAwait(false);
            if (!persistResult.Success)
            {
                Logger.Error("Failed to persist empty queue. Storage unavailable.");
            }

            return items;
        });
    }

    public Task ClearAsync()
    {
        return EnqueueOperation(async () =>
        {
            await _initializeTask.ConfigureAwait(false);

            if (!_initialized)
            {
                return;
            }

            var result = await StorageService
                .RemoveItemAsync(StorageKeys.OfflineQueue)
                .ConfigureAwait(false);

            if (!result.Success)
            {
                Logger.Error("Failed to clear queue from storage. Check permissions.");
                return;
            }

            _queue.Clear();
            _clientOrder = 0;
        });
    }

    public int GetSize() => _queue.Count;

    private BatchItem AssignClientOrder(BatchItem item)
    {
        item.ClientOrder = _clientOrder++;
        return item;
    }

    private void DropOldestSession()
    {
        var sessionItems = _queue.OfType<BatchSessionItem>().ToList();

        if (sessionItems.Count == 0)
        {
            if (_queue.Count > 0)
            {
                var dropped = _queue[0];
                _queue.RemoveAt(0);
                Logger.Info(
                    $"Queue full ({ValidationConstants.MaxOfflineQueueSize}). No sessions to drop, dropping oldest item.",
                    new Dictionary<string, object>
                    {
                        ["type"] = dropped.Type,
                        ["clientOrder"] = dropped.ClientOrder,
                    }
                );
            }

            return;
        }

        var oldestSession = sessionItems.Aggregate(
            static (oldest, current) =>
                current.ClientOrder < oldest.ClientOrder ? current : oldest
        );

        var oldestSessionId = oldestSession.Payload.SessionId;
        var initialLength = _queue.Count;

        _queue.RemoveAll(item =>
        {
            if (item is BatchDeviceItem)
            {
                return false;
            }

            if (item is BatchSessionItem sessionItem)
            {
                return sessionItem.Payload.SessionId == oldestSessionId;
            }

            if (item is BatchEventItem eventItem)
            {
                return eventItem.Payload.SessionId == oldestSessionId;
            }

            if (item is BatchPingItem pingItem)
            {
                return pingItem.Payload.SessionId == oldestSessionId;
            }

            return false;
        });

        var droppedCount = initialLength - _queue.Count;
        Logger.Info(
            $"Queue full ({ValidationConstants.MaxOfflineQueueSize}). Dropped oldest session and {droppedCount} related items.",
            new Dictionary<string, object>
            {
                ["sessionId"] = oldestSessionId,
                ["droppedCount"] = droppedCount,
            }
        );
    }

    private Task<Result> PersistAsync() =>
        StorageService.SetItemAsync(StorageKeys.OfflineQueue, _queue);

    private Task EnqueueOperation(Func<Task> operation)
    {
        var previous = _operationQueue;
        var next = previous
            .ContinueWith(
                _ => operation(),
                CancellationToken.None,
                TaskContinuationOptions.RunContinuationsAsynchronously,
                TaskScheduler.Default
            )
            .Unwrap();

        _operationQueue = next;
        return next;
    }

    private Task<T> EnqueueOperation<T>(Func<Task<T>> operation)
    {
        var previous = _operationQueue;
        var next = previous
            .ContinueWith(
                _ => operation(),
                CancellationToken.None,
                TaskContinuationOptions.RunContinuationsAsynchronously,
                TaskScheduler.Default
            )
            .Unwrap();

        _operationQueue = next;
        return next;
    }
}
