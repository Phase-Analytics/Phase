using System.IO.Compression;
using System.Text;
using Newtonsoft.Json.Linq;
using Phase.Analytics.Client;

namespace Phase.Analytics.Tests;

/// <summary>Records requests and answers <c>/sdk/batch</c> with a configurable response.</summary>
internal sealed class BatchRecordingTransport : IHttpTransport
{
    private readonly Func<HttpTransportRequest, HttpTransportResponse> _respond;
    private readonly List<HttpTransportRequest> _requests = new();

    public BatchRecordingTransport(Func<HttpTransportRequest, HttpTransportResponse>? respond = null)
    {
        _respond = respond ?? (_ => Ok());
    }

    public IReadOnlyList<HttpTransportRequest> Requests
    {
        get
        {
            lock (_requests)
            {
                return _requests.ToList();
            }
        }
    }

    public static HttpTransportResponse Ok() =>
        new(200, """{"processed":0,"failed":0,"errors":[],"results":[]}""");

    public Task<HttpTransportResponse> SendAsync(
        HttpTransportRequest request,
        CancellationToken cancellationToken
    )
    {
        lock (_requests)
        {
            _requests.Add(request);
        }

        return Task.FromResult(_respond(request));
    }

    /// <summary>All items sent so far, in request order.</summary>
    public List<JObject> SentItems() =>
        Requests.SelectMany(request => ReadItems(request)).ToList();

    public static IEnumerable<JObject> ReadItems(HttpTransportRequest request)
    {
        var body = request.Headers.ContainsKey("Content-Encoding")
            ? Gunzip(request.Body)
            : Encoding.UTF8.GetString(request.Body);
        return JObject.Parse(body)["items"]!.Children<JObject>();
    }

    private static string Gunzip(byte[] body)
    {
        using var input = new GZipStream(new MemoryStream(body), CompressionMode.Decompress);
        using var reader = new StreamReader(input, Encoding.UTF8);
        return reader.ReadToEnd();
    }
}
