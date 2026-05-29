#if UNITY_EDITOR
using UnityEditor;

namespace Phase.Analytics;

[InitializeOnLoad]
internal static class PhaseAnalyticsEditorReset
{
    static PhaseAnalyticsEditorReset()
    {
        EditorApplication.playModeStateChanged += OnPlayModeStateChanged;
    }

    private static void OnPlayModeStateChanged(PlayModeStateChange state)
    {
        if (state == PlayModeStateChange.ExitingPlayMode)
        {
            PhaseAnalytics.ResetForEditor();
        }
    }
}
#endif
