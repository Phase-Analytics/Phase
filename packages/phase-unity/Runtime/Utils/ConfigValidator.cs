using System;
using Phase.Analytics.Config;

namespace Phase.Analytics.Utils;

internal static class ConfigValidator
{
    public static bool TryValidate(PhaseConfig config, out string errorMessage)
    {
        if (config == null)
        {
            errorMessage = "Config is required.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(config.ApiKey))
        {
            errorMessage = "API key is required.";
            return false;
        }

        if (!config.ApiKey.StartsWith("phase_", StringComparison.Ordinal))
        {
            errorMessage =
                $"Invalid API key format. API key must start with \"phase_\". Provided: {LogSanitizer.FormatApiKey(config.ApiKey)}";
            return false;
        }

        if (!Uri.TryCreate(config.NormalizedBaseUrl, UriKind.Absolute, out var uri))
        {
            errorMessage = "BaseUrl must be a valid absolute URI.";
            return false;
        }

        if (
            !uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase)
            && !(
                config.AllowInsecureDev
                && uri.Scheme.Equals("http", StringComparison.OrdinalIgnoreCase)
            )
        )
        {
            errorMessage = "BaseUrl must use https unless AllowInsecureDev is enabled.";
            return false;
        }

        errorMessage = string.Empty;
        return true;
    }
}
