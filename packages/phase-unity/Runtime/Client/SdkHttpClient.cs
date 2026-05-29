using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Client;

/// <summary>HTTP client for Phase SDK API endpoints.</summary>
public sealed class SdkHttpClient
{
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

    public Task<Result<DeviceResponse>> CreateDeviceAsync(CreateDeviceRequest payload) =>
        RequestAsync<DeviceResponse>("/sdk/devices", payload, "CreateDevice");

    public Task<Result<SessionResponse>> CreateSessionAsync(CreateSessionRequest payload) =>
        RequestAsync<SessionResponse>("/sdk/sessions", payload, "CreateSession");

    public Task<Result<EventResponse>> CreateEventAsync(CreateEventRequest payload) =>
        RequestAsync<EventResponse>("/sdk/events", payload, "CreateEvent");

    public Task<Result<PingSessionResponse>> PingSessionAsync(PingSessionRequest payload) =>
        RequestAsync<PingSessionResponse>("/sdk/ping", payload, "PingSession");

    public Task<Result<BatchResponse>> SendBatchAsync(BatchRequest payload)
    {
        if (payload.Items.Count >= ValidationConstants.BatchCompressionThreshold)
        {
            return RequestCompressedAsync<BatchResponse>("/sdk/batch", payload, "SendBatch");
        }

        return RequestAsync<BatchResponse>("/sdk/batch", payload, "SendBatch");
    }

    private Task<Result<T>> RequestAsync<T>(
        string endpoint,
        object body,
        string operationName,
        bool retryEnabled = true
    )
    {
        var json = JsonHelper.Serialize(body);
        var headers = BuildHeaders();
        var request = new HttpTransportRequest(
            $"{_baseUrl}{endpoint}",
            headers,
            Encoding.UTF8.GetBytes(json),
            ValidationConstants.RequestTimeoutMs
        );

        return ExecuteAsync<T>(request, operationName, retryEnabled);
    }

    private Task<Result<T>> RequestCompressedAsync<T>(
        string endpoint,
        object body,
        string operationName,
        bool retryEnabled = true
    )
    {
        var json = JsonHelper.Serialize(body);
        var compressed = GzipCompress(json);
        var headers = BuildHeaders(
            new Dictionary<string, string> { ["Content-Encoding"] = "gzip" }
        );

        var request = new HttpTransportRequest(
            $"{_baseUrl}{endpoint}",
            headers,
            compressed,
            ValidationConstants.RequestTimeoutMs
        );

        return ExecuteAsync<T>(request, operationName, retryEnabled);
    }

    private Task<Result<T>> ExecuteAsync<T>(
        HttpTransportRequest request,
        string operationName,
        bool retryEnabled
    )
    {
        async Task<T> SendOnceAsync()
        {
            var response = await _transport
                .SendAsync(request, default)
                .ConfigureAwait(false);

            if (response.TimedOut)
            {
                throw new Exception(
                    $"Request timeout after {ValidationConstants.RequestTimeoutMs}ms"
                );
            }

            if (response.StatusCode < 200 || response.StatusCode >= 300)
            {
                throw new HttpError(response.StatusCode, SanitizeError(response.Body));
            }

            if (string.IsNullOrWhiteSpace(response.Body))
            {
                throw new HttpError(response.StatusCode, "Server returned empty response body");
            }

            var data = JsonHelper.Deserialize<T>(response.Body);
            if (data == null)
            {
                throw new HttpError(response.StatusCode, "Failed to deserialize response body");
            }

            return data;
        }

        if (retryEnabled)
        {
            return RetryPolicy.WithRetryAsync(SendOnceAsync);
        }

        return SendWithoutRetryAsync(SendOnceAsync, operationName);
    }

    private static async Task<Result<T>> SendWithoutRetryAsync<T>(
        Func<Task<T>> sendOnce,
        string operationName
    )
    {
        try
        {
            var data = await sendOnce().ConfigureAwait(false);
            return Result<T>.Ok(data);
        }
        catch (Exception error)
        {
            Logger.Error($"{operationName} failed. Check network connection.", error);
            return Result<T>.Fail(error);
        }
    }

    private Dictionary<string, string> BuildHeaders(
        Dictionary<string, string>? extraHeaders = null
    )
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

        if (extraHeaders != null)
        {
            foreach (var entry in extraHeaders)
            {
                headers[entry.Key] = entry.Value;
            }
        }

        return headers;
    }

    private static string SanitizeError(string errorText)
    {
        const int maxLength = 500;
        if (errorText.Length <= maxLength)
        {
            return errorText;
        }

        return errorText.Substring(0, maxLength) + "... (truncated)";
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
