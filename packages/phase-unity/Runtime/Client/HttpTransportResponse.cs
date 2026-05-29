namespace Phase.Analytics.Client;

public sealed class HttpTransportResponse
{
    public HttpTransportResponse(int statusCode, string body, bool timedOut = false)
    {
        StatusCode = statusCode;
        Body = body;
        TimedOut = timedOut;
    }

    public int StatusCode { get; }

    public string Body { get; }

    public bool TimedOut { get; }
}
