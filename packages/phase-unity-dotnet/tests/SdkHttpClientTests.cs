using Phase.Analytics.Client;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;

namespace Phase.Analytics.Tests;

public sealed class SdkHttpClientTests
{
    [Fact]
    public async Task SendBatchAsync_sends_bearer_token()
    {
        var transport = new BatchRecordingTransport();
        var client = new SdkHttpClient("phase_test_key", transport);

        var result = await client.SendBatchAsync(DeviceBatch());

        Assert.True(result.Success);
        Assert.EndsWith("/sdk/batch", transport.Requests[0].Url);
        Assert.True(transport.Requests[0].Headers.TryGetValue("Authorization", out var auth));
        Assert.Equal("Bearer phase_test_key", auth);
    }

    [Fact]
    public async Task SendBatchAsync_does_not_retry_401()
    {
        var transport = new BatchRecordingTransport(_ =>
            new HttpTransportResponse(401, """{"detail":"unauthorized"}""")
        );
        var client = new SdkHttpClient("phase_test_key", transport);

        var result = await client.SendBatchAsync(DeviceBatch());

        Assert.False(result.Success);
        Assert.Single(transport.Requests);
    }

    [Fact]
    public async Task SendBatchAsync_retries_500()
    {
        var attempts = 0;
        var transport = new BatchRecordingTransport(_ =>
            ++attempts < 3
                ? new HttpTransportResponse(500, "server error")
                : BatchRecordingTransport.Ok()
        );
        var client = new SdkHttpClient("phase_test_key", transport);

        var result = await client.SendBatchAsync(DeviceBatch());

        Assert.True(result.Success);
        Assert.Equal(3, attempts);
    }

    [Fact]
    public async Task SendBatchAsync_no_gzip_below_threshold()
    {
        var transport = new BatchRecordingTransport();
        var client = new SdkHttpClient("phase_test_key", transport);
        var items = new List<BatchItem>();
        for (var i = 0; i < ValidationConstants.BatchCompressionThreshold - 1; i++)
        {
            items.Add(
                new BatchPingItem
                {
                    ClientOrder = i,
                    Payload = new PingSessionRequest
                    {
                        SessionId = "01HXTESTSESSION000000001",
                        Timestamp = DateTime.UtcNow.ToString("o"),
                    },
                }
            );
        }

        var result = await client.SendBatchAsync(items);

        Assert.True(result.Success);
        Assert.False(transport.Requests[0].Headers.ContainsKey("Content-Encoding"));
    }

    [Fact]
    public async Task SendBatchAsync_gzip_when_threshold_reached()
    {
        var transport = new BatchRecordingTransport();
        var client = new SdkHttpClient("phase_test_key", transport);
        var items = new List<BatchItem>();
        for (var i = 0; i < ValidationConstants.BatchCompressionThreshold; i++)
        {
            items.Add(
                new BatchPingItem
                {
                    ClientOrder = i,
                    Payload = new PingSessionRequest
                    {
                        SessionId = "01HXTESTSESSION000000001",
                        Timestamp = DateTime.UtcNow.ToString("o"),
                    },
                }
            );
        }

        var result = await client.SendBatchAsync(items);

        Assert.True(result.Success);
        Assert.True(transport.Requests[0].Headers.ContainsKey("Content-Encoding"));
        Assert.Equal("gzip", transport.Requests[0].Headers["Content-Encoding"]);
        Assert.True(IsGzipPayload(transport.Requests[0].Body));
    }

    private static bool IsGzipPayload(byte[] body)
    {
        return body.Length >= 2 && body[0] == 0x1f && body[1] == 0x8b;
    }

    private static List<BatchItem> DeviceBatch() =>
        new()
        {
            new BatchDeviceItem
            {
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            },
        };
}
