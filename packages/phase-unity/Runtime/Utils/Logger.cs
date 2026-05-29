using System.Collections.Generic;
using Phase.Analytics.Config;
#if UNITY_5_3_OR_NEWER
using UnityEngine;
#endif

namespace Phase.Analytics.Utils;

public static class Logger
{
    private static LogLevel _level = LogLevel.None;

    public static void SetLogLevel(LogLevel level)
    {
        _level = level;
    }

    public static void Info(string message, Dictionary<string, object>? metadata = null)
    {
        if (_level > LogLevel.Info)
        {
            return;
        }

#if UNITY_5_3_OR_NEWER
        if (metadata != null && metadata.Count > 0)
        {
            Debug.Log($"[Phase] {message} {JsonHelper.Serialize(metadata)}");
        }
        else
        {
            Debug.Log($"[Phase] {message}");
        }
#endif
    }

    public static void Warn(string message, Dictionary<string, object>? metadata = null)
    {
        if (_level > LogLevel.Warn)
        {
            return;
        }

#if UNITY_5_3_OR_NEWER
        if (metadata != null && metadata.Count > 0)
        {
            Debug.LogWarning($"[Phase] {message} {JsonHelper.Serialize(metadata)}");
        }
        else
        {
            Debug.LogWarning($"[Phase] {message}");
        }
#endif
    }

    public static void Error(string message, System.Exception? error = null)
    {
        if (_level > LogLevel.Error)
        {
            return;
        }

#if UNITY_5_3_OR_NEWER
        if (error != null)
        {
            Debug.LogError($"[Phase] {message}: {error.Message}");
        }
        else
        {
            Debug.LogError($"[Phase] {message}");
        }
#endif
    }
}
