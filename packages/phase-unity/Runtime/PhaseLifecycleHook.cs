#if UNITY_5_3_OR_NEWER
using System.Collections;
using Phase.Analytics.Network;
using Phase.Analytics.Utils;
using UnityEngine;

namespace Phase.Analytics;

public sealed class PhaseLifecycleHook : MonoBehaviour
{
    private static readonly WaitForSecondsRealtime IdleLoopDelay =
        new(0.1f);

    private static PhaseLifecycleHook? _instance;
    private static UnityNetworkMonitor? _networkMonitor;
    private Coroutine? _mainThreadLoop;

    public static void RegisterNetworkMonitor(UnityNetworkMonitor monitor)
    {
        _networkMonitor = monitor;
    }

    public static void UnregisterNetworkMonitor(UnityNetworkMonitor monitor)
    {
        if (_networkMonitor == monitor)
        {
            _networkMonitor = null;
        }
    }

    public static void EnsureExists()
    {
        if (_instance != null)
        {
            return;
        }

        var gameObject = new GameObject("PhaseLifecycleHook");
        DontDestroyOnLoad(gameObject);
        _instance = gameObject.AddComponent<PhaseLifecycleHook>();
    }

    private void Awake()
    {
        if (_instance != null && _instance != this)
        {
            Destroy(gameObject);
            return;
        }

        _instance = this;
        _mainThreadLoop = StartCoroutine(ProcessMainThreadWork());
    }

    private void OnDestroy()
    {
        if (_mainThreadLoop != null)
        {
            StopCoroutine(_mainThreadLoop);
            _mainThreadLoop = null;
        }

        if (_instance == this)
        {
            _instance = null;
        }
    }

    private IEnumerator ProcessMainThreadWork()
    {
        while (true)
        {
            MainThreadDispatcher.ProcessPending();
            _networkMonitor?.PollIfDue();

            yield return MainThreadDispatcher.HasPendingWork
                ? null
                : IdleLoopDelay;
        }
    }

    // Pause and focus loss usually fire together; the SDK treats repeats as no-ops.
    private void OnApplicationPause(bool paused)
    {
        if (paused)
        {
            PhaseAnalytics.Pause();
            return;
        }

        PhaseAnalytics.Resume();
    }

    private void OnApplicationFocus(bool hasFocus)
    {
        if (hasFocus)
        {
            PhaseAnalytics.Resume();
            return;
        }

        PhaseAnalytics.Pause();
    }

    // Only saves the queue: waiting on a request here would deadlock UnityWebRequestTransport,
    // which completes on this (main) thread. Unsent items go out on the next launch.
    private void OnApplicationQuit()
    {
        PhaseAnalytics.PersistOnQuit();
    }
}
#endif
