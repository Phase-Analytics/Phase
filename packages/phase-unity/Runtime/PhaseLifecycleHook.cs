#if UNITY_5_3_OR_NEWER
using System;
using Phase.Analytics.Network;
using Phase.Analytics.Utils;
using UnityEngine;

namespace Phase.Analytics;

public sealed class PhaseLifecycleHook : MonoBehaviour
{
    private static PhaseLifecycleHook? _instance;
    private static UnityNetworkMonitor? _networkMonitor;

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
    }

    private void OnDestroy()
    {
        if (_instance == this)
        {
            _instance = null;
        }
    }

    private void Update()
    {
        MainThreadDispatcher.ProcessPending();
        _networkMonitor?.PollIfDue();
    }

    private void OnApplicationPause(bool paused)
    {
        if (paused)
        {
            PhaseAnalytics.Pause();
            return;
        }

        _ = PhaseAnalytics.ResumeAsync();
    }

    private void OnApplicationFocus(bool hasFocus)
    {
        if (hasFocus)
        {
            _ = PhaseAnalytics.ResumeAsync();
            return;
        }

        PhaseAnalytics.Pause();
    }

    private void OnApplicationQuit()
    {
        try
        {
            PhaseAnalytics.FlushAsync().Wait(TimeSpan.FromSeconds(2));
        }
        catch (Exception error)
        {
            Phase.Analytics.Utils.Logger.Error("Flush on quit failed.", error);
        }
    }
}
#endif
