using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Phase.Analytics.Client;

public sealed class SystemNetHttpTransport : IHttpTransport, IDisposable
{
    private readonly HttpClient _httpClient = new HttpClient();

    public void Dispose()
    {
        _httpClient.Dispose();
    }

    public async Task<HttpTransportResponse> SendAsync(
        HttpTransportRequest request,
        CancellationToken cancellationToken
    )
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(request.TimeoutMs);

        try
        {
            using var message = new HttpRequestMessage(HttpMethod.Post, request.Url);
            foreach (var header in request.Headers)
            {
                if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                message.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            var contentType = request.Headers.TryGetValue("Content-Type", out var value)
                ? value
                : "application/json";
            message.Content = new ByteArrayContent(request.Body);
            message.Content.Headers.TryAddWithoutValidation("Content-Type", contentType);

            if (
                request.Headers.TryGetValue("Content-Encoding", out var encoding)
                && encoding.Equals("gzip", StringComparison.OrdinalIgnoreCase)
            )
            {
                message.Content.Headers.TryAddWithoutValidation("Content-Encoding", "gzip");
            }

            using var response = await _httpClient
                .SendAsync(message, cts.Token)
                .ConfigureAwait(false);
            var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            return new HttpTransportResponse((int)response.StatusCode, body);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new HttpTransportResponse(0, string.Empty, timedOut: true);
        }
    }
}
