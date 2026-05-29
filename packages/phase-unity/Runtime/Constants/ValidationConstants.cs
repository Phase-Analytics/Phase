namespace Phase.Analytics.Constants;

public static class ValidationConstants
{
    public const int DeviceIdMinLength = 8;
    public const int DeviceIdMaxLength = 128;
    public const string DeviceIdPattern = @"^[\w-]+$";

    public const int SessionIdMinLength = 8;
    public const int SessionIdMaxLength = 128;
    public const string SessionIdPattern = @"^[\w-]+$";

    public const int EventNameMinLength = 1;
    public const int EventNameMaxLength = 256;
    public const string EventNamePattern = @"^[\w./ -]+$";

    public const int EventParamsMaxKeys = 32;
    public const int EventParamsMaxKeyLength = 32;
    public const int EventParamsMaxStringValueLength = 256;
    public const int EventParamsMaxSizeBytes = 8192;

    public const int BatchMaxSize = 1000;

    public const int OsVersionMaxLength = 64;
    public const int LocaleMaxLength = 10;

    public const int RequestTimeoutMs = 30_000;
    public const int FlushTimeoutMs = 5_000;
    public const int BatchCompressionThreshold = 100;
    public const int MaxOfflineQueueSize = 1000;

    public const int PingIntervalMs = 5_000;
    public const int InactivityTimeoutMs = 5 * 60 * 1000;
    public const int MaxSessionAgeMs = 60 * 60 * 1000;

    public const int RateLimitWindowMs = 1_000;
    public const int MaxEventsPerSecond = 15;
    public const int DedupWindowMs = 50;

    public static readonly int[] RetryDelaysMs = { 100, 500, 2000 };
}
