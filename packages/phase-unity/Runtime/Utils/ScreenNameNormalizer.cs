using System;
using System.Text;

namespace Phase.Analytics.Utils;

public static class ScreenNameNormalizer
{
    public static string Normalize(string screenName)
    {
        if (string.IsNullOrWhiteSpace(screenName))
        {
            return "/unknown";
        }

        var trimmed = screenName.Trim();
        if (trimmed.StartsWith("/", StringComparison.Ordinal))
        {
            return trimmed;
        }

        return "/" + ToKebabCase(trimmed);
    }

    private static string ToKebabCase(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length + 8);
        for (var i = 0; i < value.Length; i++)
        {
            var current = value[i];
            if (current == '_' || current == ' ' || current == '.')
            {
                if (builder.Length > 0 && builder[^1] != '-')
                {
                    builder.Append('-');
                }

                continue;
            }

            if (char.IsUpper(current) && builder.Length > 0 && builder[^1] != '-')
            {
                var previous = value[i - 1];
                if (!char.IsUpper(previous) && previous != '-')
                {
                    builder.Append('-');
                }
            }

            builder.Append(char.ToLowerInvariant(current));
        }

        return builder.ToString().Trim('-');
    }
}
