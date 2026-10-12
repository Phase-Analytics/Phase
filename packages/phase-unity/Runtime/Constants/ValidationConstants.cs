namespace Phase.Analytics.Constants;

public static class ValidationConstants
{
    public const int DeviceIdMinLength = 8;
    public const int DeviceIdMaxLength = 128;
    public const string DeviceIdPattern = @"^[\w-]+$";

    // ULID: 48-bit timestamp + 80-bit randomness in Crockford base32; the first char is 0-7.
    public const string UlidPattern = "^[0-7][0-9A-HJKMNP-TV-Z]{25}$";

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

    // Stays under the server's 100-event limit for devices younger than five minutes.
    public const int BatchSendSize = 50;
    public const int FlushThreshold = 20;
    public const int FlushIntervalMs = 10_000;
    public const int MaxItemRetryAttempts = 5;
    public const int MaxPendingEvents = 200;
    // Older buffered events would fall outside any session the server accepts.
    public const int MaxPendingEventAgeMs = 60 * 60 * 1000;

    public const int OsVersionMaxLength = 64;
    public const int LocaleMaxLength = 10;

    public const int RequestTimeoutMs = 10_000;
    public const int FlushTimeoutMs = 30_000;
    public const int BatchCompressionThreshold = 25;
    public const int MaxOfflineQueueSize = 1000;
    public const int MaxOfflineQueueBytes = 1024 * 1024;
    public const int QueuePersistDelayMs = 1_000;
    public const int QueuePersistOnQuitTimeoutMs = 1_000;

    public const int PingIntervalMs = 5_000;
    public const int InactivityTimeoutMs = 5 * 60 * 1000;
    public const int MaxSessionAgeMs = 2 * 60 * 60 * 1000;

    public const int RateLimitWindowMs = 1_000;
    public const int MaxEventsPerSecond = 15;
    public const int DedupWindowMs = 50;

    public const int MaxRequestRetries = 3;
    public const int RetryBaseDelayMs = 500;
    public const int RetryMaxDelayMs = 8_000;
    public const int MaxInlineRetryAfterMs = 5_000;
    public const int DefaultRetryAfterMs = 30_000;
    public const int FlushFailureBackoffBaseMs = 10_000;
    public const int FlushFailureBackoffMaxMs = 5 * 60 * 1000;
}
