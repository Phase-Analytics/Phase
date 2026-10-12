namespace Phase.Analytics.Client;

public sealed class HttpTransportResponse
{
    public HttpTransportResponse(
        int statusCode,
        string body,
        bool timedOut = false,
        string? retryAfter = null
    )
    {
        StatusCode = statusCode;
        Body = body;
        TimedOut = timedOut;
        RetryAfter = retryAfter;
    }

    public int StatusCode { get; }

    public string Body { get; }

    public bool TimedOut { get; }

    /// <summary>Raw <c>Retry-After</c> header value, if the server sent one.</summary>
    public string? RetryAfter { get; }
}
