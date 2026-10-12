namespace Phase.Analytics.Constants;

public static class StorageKeys
{
    public const string Prefix = "phase-analytics/";

    public const string DeviceId = Prefix + "device-id";
    public const string DeviceInfo = Prefix + "device-info";
    public const string OfflineQueue = Prefix + "offline-queue";
    public const string ApiKey = Prefix + "api-key";
    // Written by 0.1.13 and earlier; kept so ClearLocalData still removes it.
    public const string SessionStartedAt = Prefix + "session-started-at";

    public static readonly string[] All =
    {
        DeviceId,
        DeviceInfo,
        OfflineQueue,
        ApiKey,
        SessionStartedAt,
    };
}
