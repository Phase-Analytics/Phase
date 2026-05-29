using System;

namespace Phase.Analytics.Utils;

internal static class LogSanitizer
{
    public static string FormatApiKey(string? apiKey)
    {
        if (string.IsNullOrEmpty(apiKey))
        {
            return "(empty)";
        }

        var prefixLength = Math.Min(8, apiKey.Length);
        return $"{apiKey.Substring(0, prefixLength)}...";
    }
}
