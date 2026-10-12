using System;

namespace Phase.Analytics.Client;

public sealed class HttpError : Exception
{
    public HttpError(int status, string message, string? responseBody = null, int? retryAfterMs = null)
        : base(message)
    {
        Status = status;
        ResponseBody = responseBody;
        RetryAfterMs = retryAfterMs;
    }

    /// <summary>HTTP status code, or 0 when the request never got a response.</summary>
    public int Status { get; }

    public string? ResponseBody { get; }

    public int? RetryAfterMs { get; }

    public bool IsNetworkError => Status == 0;

    public bool IsRateLimited => Status == 429;

    public bool IsRetryable() => Status == 0 || Status == 408 || Status == 429 || Status >= 500;
}
