using System;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Client;

public static class RetryPolicy
{
    private static readonly object RandomSync = new();
    private static readonly Random Random = new();

    public static async Task<Result<T>> WithRetryAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default
    )
    {
        Exception? lastError = null;

        for (var attempt = 0; attempt <= ValidationConstants.MaxRequestRetries; attempt++)
        {
            try
            {
                var result = await operation(cancellationToken).ConfigureAwait(false);
                return Result<T>.Ok(result);
            }
            catch (OperationCanceledException error) when (cancellationToken.IsCancellationRequested)
            {
                return Result<T>.Fail(error);
            }
            catch (Exception error)
            {
                lastError = error;
                if (attempt >= ValidationConstants.MaxRequestRetries)
                {
                    break;
                }

                if (!TryGetRetryDelay(error, attempt, out var delayMs))
                {
                    break;
                }

                try
                {
                    await Task.Delay(delayMs, cancellationToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        return Result<T>.Fail(lastError ?? new Exception("Unknown error occurred"));
    }

    /// <summary>Parses a <c>Retry-After</c> value given as delta-seconds or an HTTP date.</summary>
    public static int? ParseRetryAfterMs(string? value, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value!.Trim();
        if (int.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var seconds))
        {
            return seconds < 0 ? 0 : (int)Math.Min((long)seconds * 1000, int.MaxValue);
        }

        if (
            DateTimeOffset.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var date
            )
        )
        {
            var delta = (date - now).TotalMilliseconds;
            return delta <= 0 ? 0 : (int)Math.Min(delta, int.MaxValue);
        }

        return null;
    }

    private static bool TryGetRetryDelay(Exception error, int attempt, out int delayMs)
    {
        delayMs = FullJitterDelay(attempt);
        if (error is not HttpError httpError)
        {
            return true;
        }

        if (!httpError.IsRetryable())
        {
            return false;
        }

        if (httpError.IsRateLimited && httpError.RetryAfterMs.HasValue)
        {
            // Long server-mandated waits are left to the caller instead of blocking this request.
            if (httpError.RetryAfterMs.Value > ValidationConstants.MaxInlineRetryAfterMs)
            {
                return false;
            }

            delayMs = Math.Max(delayMs, httpError.RetryAfterMs.Value);
        }

        return true;
    }

    private static int FullJitterDelay(int attempt)
    {
        var ceiling = Math.Min(
            ValidationConstants.RetryMaxDelayMs,
            ValidationConstants.RetryBaseDelayMs * (1 << Math.Min(attempt, 16))
        );

        lock (RandomSync)
        {
            return Random.Next(0, ceiling + 1);
        }
    }
}
