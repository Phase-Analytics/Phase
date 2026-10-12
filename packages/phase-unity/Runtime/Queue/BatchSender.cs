using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Client;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Queue;

/// <summary>
/// Drains <see cref="OfflineQueue"/> through <c>POST /sdk/batch</c>. Items are removed only after
/// the server accepted them or rejected them as non-retryable.
/// </summary>
public sealed class BatchSender
{
    private readonly SdkHttpClient _httpClient;
    private readonly OfflineQueue _offlineQueue;
    private readonly object _sync = new();
    private Task? _inFlight;
    private long _retryAfterUntilMs;
    private long _backoffUntilMs;
    private int _consecutiveFailures;

    public BatchSender(SdkHttpClient httpClient, OfflineQueue offlineQueue)
    {
        _httpClient = httpClient;
        _offlineQueue = offlineQueue;
    }

    /// <summary>
    /// Sends queued items until the queue is empty, a request fails, or the flush deadline passes.
    /// Concurrent callers share the in-flight flush. <paramref name="ignoreBackoff"/> skips the
    /// local failure backoff but never a server <c>Retry-After</c>.
    /// </summary>
    public Task FlushAsync(bool ignoreBackoff = false)
    {
        lock (_sync)
        {
            if (_inFlight != null && !_inFlight.IsCompleted)
            {
                return _inFlight;
            }

            var now = NowMs();
            if (now < _retryAfterUntilMs || (!ignoreBackoff && now < _backoffUntilMs))
            {
                return Task.CompletedTask;
            }

            _inFlight = Task.Run(RunFlushAsync);
            return _inFlight;
        }
    }

    /// <summary>Clears the local failure backoff, e.g. after connectivity returns.</summary>
    public void ResetBackoff()
    {
        lock (_sync)
        {
            _backoffUntilMs = 0;
            _consecutiveFailures = 0;
        }
    }

    private async Task RunFlushAsync()
    {
        using var deadline = new CancellationTokenSource(ValidationConstants.FlushTimeoutMs);
        try
        {
            while (!deadline.IsCancellationRequested)
            {
                var batch = _offlineQueue.PeekBatch(ValidationConstants.BatchSendSize);
                if (batch.Count == 0)
                {
                    return;
                }

                var result = await _httpClient
                    .SendBatchAsync(batch, deadline.Token)
                    .ConfigureAwait(false);

                if (!ApplyResult(batch, result))
                {
                    return;
                }
            }
        }
        catch (Exception error)
        {
            Logger.Error("Flush failed. Items remain queued.", error);
        }
    }

    /// <returns>True when the whole batch was settled and the next batch may be sent.</returns>
    private bool ApplyResult(List<BatchItem> batch, Result<BatchResponse> result)
    {
        if (result.Success)
        {
            return ApplyItemErrors(batch, result.Data?.Errors);
        }

        var error = result.Error;
        if (error is HttpError httpError && !httpError.IsNetworkError)
        {
            if (httpError.IsRateLimited)
            {
                var waitMs = httpError.RetryAfterMs ?? ValidationConstants.DefaultRetryAfterMs;
                lock (_sync)
                {
                    _retryAfterUntilMs = NowMs() + waitMs;
                }

                Logger.Warn($"Rate limited by server. Next flush in {waitMs}ms.");
                return false;
            }

            if (httpError.Status >= 500)
            {
                // Count the attempt so a batch the server can never process cannot block the queue.
                _offlineQueue.CompleteBatch(Array.Empty<BatchItem>(), batch);
                RecordFailure(error);
                return false;
            }

            if (httpError.Status == 400 && TryParseItemErrors(httpError.ResponseBody, out var errors))
            {
                return ApplyItemErrors(batch, errors);
            }

            if (!httpError.IsRetryable())
            {
                Logger.Error(
                    $"Batch rejected with status {httpError.Status}. Dropping {batch.Count} item(s).",
                    error
                );
                _offlineQueue.CompleteBatch(batch, Array.Empty<BatchItem>());
                return false;
            }
        }

        RecordFailure(error);
        return false;
    }

    private bool ApplyItemErrors(List<BatchItem> batch, List<BatchError>? errors)
    {
        lock (_sync)
        {
            _consecutiveFailures = 0;
            _backoffUntilMs = 0;
        }

        if (errors == null || errors.Count == 0)
        {
            return _offlineQueue.CompleteBatch(batch, Array.Empty<BatchItem>()) == 0;
        }

        var retryableByOrder = new Dictionary<int, bool>();
        bool? wholeBatchRetryable = null;
        foreach (var error in errors)
        {
            var retryable = error.Retryable == true;
            if (error.ClientOrder < 0)
            {
                wholeBatchRetryable = (wholeBatchRetryable ?? false) || retryable;
                continue;
            }

            retryableByOrder[error.ClientOrder] =
                (retryableByOrder.TryGetValue(error.ClientOrder, out var existing) && existing)
                || retryable;
        }

        var completed = new List<BatchItem>(batch.Count);
        var retry = new List<BatchItem>();
        var rejected = 0;
        foreach (var item in batch)
        {
            bool? itemRetryable = retryableByOrder.TryGetValue(item.ClientOrder, out var value)
                ? value
                : wholeBatchRetryable;

            if (itemRetryable == true)
            {
                retry.Add(item);
                continue;
            }

            if (itemRetryable == false)
            {
                rejected++;
            }

            completed.Add(item);
        }

        if (rejected > 0)
        {
            Logger.Warn($"Server rejected {rejected} item(s) as non-retryable. Dropping them.");
        }

        return _offlineQueue.CompleteBatch(completed, retry) == 0;
    }

    private void RecordFailure(Exception? error)
    {
        int delayMs;
        lock (_sync)
        {
            _consecutiveFailures++;
            var exponent = Math.Min(_consecutiveFailures - 1, 10);
            delayMs = (int)Math.Min(
                (long)ValidationConstants.FlushFailureBackoffBaseMs << exponent,
                ValidationConstants.FlushFailureBackoffMaxMs
            );
            _backoffUntilMs = NowMs() + delayMs;
        }

        Logger.Warn(
            $"Batch request failed. Items remain queued; retrying in {delayMs}ms.",
            new Dictionary<string, object> { ["error"] = error?.Message ?? "unknown" }
        );
    }

    private static bool TryParseItemErrors(string? body, out List<BatchError> errors)
    {
        errors = new List<BatchError>();
        try
        {
            var response = JsonHelper.Deserialize<BatchResponse>(body);
            if (response?.Errors == null)
            {
                return false;
            }

            foreach (var error in response.Errors)
            {
                if (error.ClientOrder >= 0)
                {
                    errors.Add(error);
                }
            }

            return errors.Count > 0;
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
