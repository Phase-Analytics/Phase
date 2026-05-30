using System.Globalization;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
#if UNITY_5_3_OR_NEWER
using UnityEngine;
#endif

namespace Phase.Analytics.Device;

public sealed class UnityDeviceInfoProvider : IDeviceInfoProvider
{
    public DeviceInfo GetDeviceInfo()
    {
#if UNITY_5_3_OR_NEWER
        return new DeviceInfo
        {
            Platform = GetPlatform(),
            OsVersion = Truncate(SystemInfo.operatingSystem, ValidationConstants.OsVersionMaxLength),
            Locale = Truncate(GetLocale(), ValidationConstants.LocaleMaxLength),
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

    private static string? GetLocale()
    {
        try
        {
            var cultureName = CultureInfo.CurrentCulture.Name;
            if (!string.IsNullOrWhiteSpace(cultureName))
            {
                return Truncate(cultureName, ValidationConstants.LocaleMaxLength);
            }
        }
        catch (CultureNotFoundException)
        {
        }

        return Truncate(Application.systemLanguage.ToString(), ValidationConstants.LocaleMaxLength);
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Length <= maxLength ? value : value.Substring(0, maxLength);
    }
#endif
}
