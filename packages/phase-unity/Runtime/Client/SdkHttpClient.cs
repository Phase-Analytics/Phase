using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Client;

/// <summary>HTTP client for the Phase SDK ingest API.</summary>
public sealed class SdkHttpClient
{
    private const int MaxErrorMessageLength = 500;

    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly bool _debugData;
    private readonly IHttpTransport _transport;

    public SdkHttpClient(
        string apiKey,
        IHttpTransport transport,
        string baseUrl = "https://api.phase.sh",
        bool debugData = false
    )
    {
        _apiKey = apiKey;
        _transport = transport;
        _baseUrl = baseUrl.TrimEnd('/');
        _debugData = debugData;
    }

    /// <summary>
    /// Sends one batch. Succeeds for 2xx (including 207 partial results); otherwise fails with an
    /// <see cref="HttpError"/> or a network/timeout exception.
    /// </summary>
    public Task<Result<BatchResponse>> SendBatchAsync(
        IReadOnlyList<BatchItem> items,
        CancellationToken cancellationToken = default
    )
    {
        var json = JsonHelper.SerializeBatchRequest(items);
        var compress = items.Count >= ValidationConstants.BatchCompressionThreshold;
        var headers = BuildHeaders(compress);
        var body = compress ? GzipCompress(json) : Encoding.UTF8.GetBytes(json);
        var request = new HttpTransportRequest(
            $"{_baseUrl}/sdk/batch",
            headers,
            body,
            ValidationConstants.RequestTimeoutMs
        );

        return RetryPolicy.WithRetryAsync(
            token => SendOnceAsync(request, token),
            cancellationToken
        );
    }

    private async Task<BatchResponse> SendOnceAsync(
        HttpTransportRequest request,
        CancellationToken cancellationToken
    )
    {
        var response = await _transport
            .SendAsync(request, cancellationToken)
            .ConfigureAwait(false);

        if (response.TimedOut)
        {
            throw new TimeoutException(
                $"Request timeout after {ValidationConstants.RequestTimeoutMs}ms"
            );
        }

        if (response.StatusCode < 200 || response.StatusCode >= 300)
        {
            throw new HttpError(
                response.StatusCode,
                SanitizeError(response.Body),
                response.Body,
                RetryPolicy.ParseRetryAfterMs(response.RetryAfter, DateTimeOffset.UtcNow)
            );
        }

        if (string.IsNullOrWhiteSpace(response.Body))
        {
            return new BatchResponse();
        }

        return JsonHelper.Deserialize<BatchResponse>(response.Body)
            ?? throw new HttpError(response.StatusCode, "Failed to deserialize response body");
    }

    private Dictionary<string, string> BuildHeaders(bool gzip)
    {
        var headers = new Dictionary<string, string>
        {
            ["Content-Type"] = "application/json",
            ["Authorization"] = $"Bearer {_apiKey}",
        };

        if (_debugData)
        {
            headers["x-phase-debug-data"] = "1";
        }

        if (gzip)
        {
            headers["Content-Encoding"] = "gzip";
        }

        return headers;
    }

    private static string SanitizeError(string errorText)
    {
        if (errorText.Length <= MaxErrorMessageLength)
        {
            return errorText;
        }

        return errorText.Substring(0, MaxErrorMessageLength) + "... (truncated)";
    }

    private static byte[] GzipCompress(string json)
    {
        var bytes = Encoding.UTF8.GetBytes(json);
        using var output = new MemoryStream();
        using (var gzip = new GZipStream(output, CompressionLevel.Optimal))
        {
            gzip.Write(bytes, 0, bytes.Length);
        }

        return output.ToArray();
    }
}
