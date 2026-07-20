using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Phase.Analytics.Utils;

public static class MainThreadDispatcher
{
    private static readonly ConcurrentQueue<Action> Queue = new();
    private static readonly List<Func<bool>> PollCallbacks = new();
    private static readonly object PollLock = new();

    public static void Enqueue(Action action)
    {
        if (action == null)
        {
            return;
        }

        Queue.Enqueue(action);
    }

    public static void EnqueuePoll(Func<bool> poll)
    {
        if (poll == null)
        {
            return;
        }

        lock (PollLock)
        {
            PollCallbacks.Add(poll);
        }
    }

    internal static bool HasPendingWork
    {
        get
        {
            if (!Queue.IsEmpty)
            {
                return true;
            }

            lock (PollLock)
            {
                return PollCallbacks.Count > 0;
            }
        }
    }

    public static Task<T> RunAsync<T>(Func<Task<T>> work)
    {
        var tcs = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        Enqueue(() =>
        {
            try
            {
                var task = work();
                if (task.IsCompleted)
                {
                    CompleteTask(task, tcs);
                    return;
                }

                _ = task.ContinueWith(
                    completed => CompleteTask(completed, tcs),
                    TaskScheduler.Default
                );
            }
            catch (Exception error)
            {
                tcs.TrySetException(error);
            }
        });

        return tcs.Task;
    }

    internal static void ProcessPending()
    {
        while (Queue.TryDequeue(out var action))
        {
            try
            {
                action();
            }
            catch (Exception error)
            {
                Logger.Error("Main thread dispatcher action failed.", error);
            }
        }

        lock (PollLock)
        {
            for (var i = PollCallbacks.Count - 1; i >= 0; i--)
            {
                try
                {
                    if (PollCallbacks[i]())
                    {
                        PollCallbacks.RemoveAt(i);
                    }
                }
                catch (Exception error)
                {
                    Logger.Error("Main thread dispatcher poll failed.", error);
                    PollCallbacks.RemoveAt(i);
                }
            }
        }
    }

    private static void CompleteTask<T>(Task<T> task, TaskCompletionSource<T> tcs)
    {
        if (task.IsCanceled)
        {
            tcs.TrySetCanceled();
            return;
        }

        if (task.IsFaulted)
        {
            tcs.TrySetException(task.Exception!.InnerException ?? task.Exception);
            return;
        }

        tcs.TrySetResult(task.Result);
    }
}
