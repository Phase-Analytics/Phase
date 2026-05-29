using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;

namespace Phase.Analytics.Utils;

public static class Validator
{
    private static readonly Regex DeviceIdRegex = new(
        ValidationConstants.DeviceIdPattern,
        RegexOptions.Compiled
    );
    private static readonly Regex SessionIdRegex = new(
        ValidationConstants.SessionIdPattern,
        RegexOptions.Compiled
    );
    private static readonly Regex EventNameRegex = new(
        ValidationConstants.EventNamePattern,
        RegexOptions.Compiled
    );

    public static Result ValidateApiKey(string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return Result.Fail(new ValidationError("API key is required"));
        }

        if (!apiKey.StartsWith("phase_", StringComparison.Ordinal))
        {
            return Result.Fail(
                new ValidationError("API key must start with \"phase_\"")
            );
        }

        return Result.Ok();
    }

    public static Result ValidateBaseUrl(string? baseUrl, bool allowInsecureDev)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return Result.Fail(new ValidationError("Base URL is required"));
        }

        if (!Uri.TryCreate(baseUrl.TrimEnd('/'), UriKind.Absolute, out var uri))
        {
            return Result.Fail(new ValidationError("Base URL is invalid"));
        }

        if (uri.Scheme != "https")
        {
            if (!(allowInsecureDev && uri.Scheme == "http"))
            {
                return Result.Fail(new ValidationError("Base URL must use HTTPS"));
            }
        }

        return Result.Ok();
    }

    public static Result ValidateDeviceId(string deviceId) =>
        ValidateId(
            deviceId,
            ValidationConstants.DeviceIdMinLength,
            ValidationConstants.DeviceIdMaxLength,
            DeviceIdRegex,
            "Device ID"
        );

    public static Result ValidateSessionId(string sessionId) =>
        ValidateId(
            sessionId,
            ValidationConstants.SessionIdMinLength,
            ValidationConstants.SessionIdMaxLength,
            SessionIdRegex,
            "Session ID"
        );

    public static Result ValidateEventName(string name)
    {
        if (name.Length < ValidationConstants.EventNameMinLength)
        {
            return Result.Fail(
                new ValidationError(
                    $"Event name must be at least {ValidationConstants.EventNameMinLength} character(s)"
                )
            );
        }

        if (name.Length > ValidationConstants.EventNameMaxLength)
        {
            return Result.Fail(
                new ValidationError(
                    $"Event name must not exceed {ValidationConstants.EventNameMaxLength} characters"
                )
            );
        }

        if (!EventNameRegex.IsMatch(name))
        {
            return Result.Fail(
                new ValidationError(
                    "Event name must match pattern: ^[\\w./ -]+$"
                )
            );
        }

        return Result.Ok();
    }

    public static Result<EventParams?> ValidateEventParams(EventParams? parameters) =>
        ValidateEventParams((IReadOnlyDictionary<string, object>?)parameters);

    public static Result<EventParams?> ValidateEventParams(
        IReadOnlyDictionary<string, object>? parameters
    )
    {
        if (parameters == null || parameters.Count == 0)
        {
            return Result<EventParams?>.Ok(null);
        }

        var entries = parameters.ToList();
        if (entries.Count > ValidationConstants.EventParamsMaxKeys)
        {
            return Result<EventParams?>.Fail(
                new ValidationError(
                    $"Event params must not exceed {ValidationConstants.EventParamsMaxKeys} keys"
                )
            );
        }

        var normalized = new EventParams();
        foreach (var entry in entries.OrderBy(static e => e.Key, StringComparer.Ordinal))
        {
            var key = entry.Key;
            if (key.Length > ValidationConstants.EventParamsMaxKeyLength)
            {
                return Result<EventParams?>.Fail(
                    new ValidationError(
                        $"Param key '{key}' exceeds maximum length of {ValidationConstants.EventParamsMaxKeyLength}"
                    )
                );
            }

            if (!TryNormalizePrimitive(entry.Value, out var value, out var error))
            {
                return Result<EventParams?>.Fail(
                    new ValidationError(
                        error
                            ?? $"Param '{key}' must be a string, number, boolean, or null"
                    )
                );
            }

            normalized[key] = value!;
        }

        var serialized = JsonHelper.Serialize(normalized);
        if (serialized.Length > ValidationConstants.EventParamsMaxSizeBytes)
        {
            return Result<EventParams?>.Fail(
                new ValidationError(
                    $"Event params exceed maximum size of {ValidationConstants.EventParamsMaxSizeBytes} bytes"
                )
            );
        }

        return Result<EventParams?>.Ok(normalized.Count > 0 ? normalized : null);
    }

    public static Result<DeviceProperties?> ValidateDeviceProperties(
        DeviceProperties? properties
    ) =>
        ValidateDeviceProperties((IReadOnlyDictionary<string, object>?)properties);

    public static Result<DeviceProperties?> ValidateDeviceProperties(
        IReadOnlyDictionary<string, object>? properties
    )
    {
        if (properties == null || properties.Count == 0)
        {
            return Result<DeviceProperties?>.Ok(null);
        }

        var normalized = new DeviceProperties();
        foreach (var entry in properties)
        {
            if (!TryNormalizePrimitive(entry.Value, out var value, out var error))
            {
                return Result<DeviceProperties?>.Fail(
                    new ValidationError(
                        error
                            ?? $"Property '{entry.Key}' must be a string, number, boolean, or null"
                    )
                );
            }

            normalized[entry.Key] = value!;
        }

        return Result<DeviceProperties?>.Ok(normalized.Count > 0 ? normalized : null);
    }

    private static Result ValidateId(
        string id,
        int minLength,
        int maxLength,
        Regex pattern,
        string label
    )
    {
        if (id.Length < minLength)
        {
            return Result.Fail(
                new ValidationError($"{label} must be at least {minLength} characters")
            );
        }

        if (id.Length > maxLength)
        {
            return Result.Fail(
                new ValidationError($"{label} must not exceed {maxLength} characters")
            );
        }

        if (!pattern.IsMatch(id))
        {
            return Result.Fail(
                new ValidationError($"{label} must match pattern: {pattern}")
            );
        }

        return Result.Ok();
    }

    private static bool TryNormalizePrimitive(
        object? value,
        out object? normalized,
        out string? error
    )
    {
        normalized = null;
        error = null;

        if (value == null)
        {
            return true;
        }

        switch (value)
        {
            case string s:
                if (s.Length > ValidationConstants.EventParamsMaxStringValueLength)
                {
                    error =
                        $"String value exceeds maximum length of {ValidationConstants.EventParamsMaxStringValueLength}";
                    return false;
                }

                normalized = s;
                return true;
            case bool b:
                normalized = b;
                return true;
            case int i:
                normalized = i;
                return true;
            case long l:
                normalized = l;
                return true;
            case float f:
                normalized = (double)f;
                return true;
            case double d:
                normalized = d;
                return true;
            case decimal m:
                normalized = (double)m;
                return true;
            default:
                error = "Nested objects and arrays are not allowed";
                return false;
        }
    }
}
