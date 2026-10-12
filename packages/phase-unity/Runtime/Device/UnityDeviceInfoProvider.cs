using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
#if UNITY_5_3_OR_NEWER
using UnityEngine;
#endif

namespace Phase.Analytics.Device;

public sealed class UnityDeviceInfoProvider : IDeviceInfoProvider
{
    private static readonly Regex VersionRegex = new(@"\d+(?:\.\d+)*", RegexOptions.Compiled);

    // Keyed by SystemLanguage name so enum members missing in older Unity versions still compile.
    private static readonly Dictionary<string, string> LanguageCodes = new()
    {
        ["Afrikaans"] = "af",
        ["Arabic"] = "ar",
        ["Basque"] = "eu",
        ["Belarusian"] = "be",
        ["Bulgarian"] = "bg",
        ["Catalan"] = "ca",
        ["Chinese"] = "zh",
        ["ChineseSimplified"] = "zh-Hans",
        ["ChineseTraditional"] = "zh-Hant",
        ["Czech"] = "cs",
        ["Danish"] = "da",
        ["Dutch"] = "nl",
        ["English"] = "en",
        ["Estonian"] = "et",
        ["Faroese"] = "fo",
        ["Finnish"] = "fi",
        ["French"] = "fr",
        ["German"] = "de",
        ["Greek"] = "el",
        ["Hebrew"] = "he",
        ["Hindi"] = "hi",
        ["Hugarian"] = "hu",
        ["Hungarian"] = "hu",
        ["Icelandic"] = "is",
        ["Indonesian"] = "id",
        ["Italian"] = "it",
        ["Japanese"] = "ja",
        ["Korean"] = "ko",
        ["Latvian"] = "lv",
        ["Lithuanian"] = "lt",
        ["Norwegian"] = "no",
        ["Polish"] = "pl",
        ["Portuguese"] = "pt",
        ["Romanian"] = "ro",
        ["Russian"] = "ru",
        ["SerboCroatian"] = "sr",
        ["Slovak"] = "sk",
        ["Slovenian"] = "sl",
        ["Spanish"] = "es",
        ["Swedish"] = "sv",
        ["Thai"] = "th",
        ["Turkish"] = "tr",
        ["Ukrainian"] = "uk",
        ["Vietnamese"] = "vi",
    };

    public DeviceInfo GetDeviceInfo()
    {
#if UNITY_5_3_OR_NEWER
        return new DeviceInfo
        {
            Platform = GetPlatform(),
            OsVersion = ParseOsVersion(SystemInfo.operatingSystem),
            Locale = GetLocale(),
            Model = string.IsNullOrWhiteSpace(SystemInfo.deviceModel)
                ? null
                : SystemInfo.deviceModel,
            AppVersion = string.IsNullOrWhiteSpace(Application.version)
                ? null
                : Application.version,
            UnityVersion = Application.unityVersion,
        };
#else
        return new DeviceInfo();
#endif
    }

    /// <summary>
    /// Extracts the numeric version from Unity's OS description, e.g. "iOS 17.2" gives "17.2" and
    /// "Android OS 14 / API-34 (...)" gives "14".
    /// </summary>
    internal static string? ParseOsVersion(string? operatingSystem)
    {
        if (string.IsNullOrWhiteSpace(operatingSystem))
        {
            return null;
        }

        var match = VersionRegex.Match(operatingSystem);
        return match.Success && match.Value.Length <= ValidationConstants.OsVersionMaxLength
            ? match.Value
            : null;
    }

    /// <summary>
    /// BCP 47 tag from the current culture, or the bare language subtag when the full tag exceeds
    /// the server limit. Returns null for the invariant culture.
    /// </summary>
    internal static string? ToLocaleTag(CultureInfo culture)
    {
        var name = culture.Name;
        if (string.IsNullOrEmpty(name))
        {
            return null;
        }

        if (name.Length <= ValidationConstants.LocaleMaxLength)
        {
            return name;
        }

        var language = culture.TwoLetterISOLanguageName;
        return language.Length is > 0 and <= ValidationConstants.LocaleMaxLength
            ? language
            : null;
    }

    internal static string? LanguageCodeFor(string systemLanguage) =>
        LanguageCodes.TryGetValue(systemLanguage, out var code) ? code : null;

#if UNITY_5_3_OR_NEWER
    private static string? GetPlatform()
    {
#if UNITY_IOS
        return "ios";
#elif UNITY_ANDROID
        return "android";
#else
        return null;
#endif
    }

    // Unity players often run with the invariant culture, so fall back to the system language.
    private static string? GetLocale()
    {
        try
        {
            var tag = ToLocaleTag(CultureInfo.CurrentCulture);
            if (tag != null)
            {
                return tag;
            }
        }
        catch (CultureNotFoundException)
        {
        }

        return LanguageCodeFor(Application.systemLanguage.ToString());
    }
#endif
}
