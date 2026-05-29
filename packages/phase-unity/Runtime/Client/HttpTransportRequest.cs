using System.Collections.Generic;

namespace Phase.Analytics.Client;

public sealed class HttpTransportRequest
{
    public HttpTransportRequest(
        string url,
        IReadOnlyDictionary<string, string> headers,
        byte[] body,
        int timeoutMs
    )
    {
        Url = url;
        Headers = headers;
        Body = body;
        TimeoutMs = timeoutMs;
    }

    public string Url { get; }

    public IReadOnlyDictionary<string, string> Headers { get; }

    public byte[] Body { get; }

    public int TimeoutMs { get; }
}
