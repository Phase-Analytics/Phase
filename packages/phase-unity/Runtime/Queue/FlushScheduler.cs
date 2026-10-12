using System;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Queue;

/// <summary>
/// Decides when to flush: once the queue reaches <see cref="ValidationConstants.FlushThreshold"/>
/// items, every <see cref="ValidationConstants.FlushIntervalMs"/> while it is non-empty, and on demand.
/// </summary>
public sealed class FlushScheduler : IDisposable
{
    private readonly BatchSender _sender;
    private readonly OfflineQueue _queue;
    private readonly Func<bool> _canFlush;
    private readonly Timer _timer;

    public FlushScheduler(BatchSender sender, OfflineQueue queue, Func<bool> canFlush)
    {
        _sender = sender;
        _queue = queue;
        _canFlush = canFlush;
        _timer = new Timer(
            _ => Trigger(),
            null,
            ValidationConstants.FlushIntervalMs,
            ValidationConstants.FlushIntervalMs
        );
    }

    public void NotifyEnqueued()
    {
        if (_queue.GetSize() >= ValidationConstants.FlushThreshold)
        {
            Trigger();
        }
    }

    /// <summary>Starts a background flush if allowed and there is anything to send.</summary>
    public void Trigger(bool ignoreBackoff = false)
    {
        if (_queue.GetSize() == 0 || !_canFlush())
        {
            return;
        }

        _ = RunAsync(ignoreBackoff);
    }

    public void Dispose()
    {
        _timer.Dispose();
    }

    private async Task RunAsync(bool ignoreBackoff)
    {
        try
        {
            await _sender.FlushAsync(ignoreBackoff).ConfigureAwait(false);
        }
        catch (Exception error)
        {
            Logger.Error("Background flush failed. Items remain queued.", error);
        }
    }
}
