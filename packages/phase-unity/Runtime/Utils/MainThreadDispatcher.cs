using System;
using System.Collections.Concurrent;

namespace Phase.Analytics.Utils;

public static class MainThreadDispatcher
{
    private static readonly ConcurrentQueue<Action> Queue = new();

    public static void Enqueue(Action action)
    {
        if (action == null)
        {
            return;
        }

        Queue.Enqueue(action);
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
    }
}
