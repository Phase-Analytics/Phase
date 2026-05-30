using Phase.Analytics.Client;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;

namespace Phase.Analytics.Tests;

public sealed class SdkHttpClientTests
{
    [Fact]
    public async Task CreateDeviceAsync_sends_bearer_token()
    {
        var transport = new MockHttpTransport(
            (_, _) => new HttpTransportResponse(200, """{"deviceId":"d1","firstSeen":"2026-01-01T00:00:00Z"}""")
        );
        var client = new SdkHttpClient("phase_test_key", transport);

        var result = await client.CreateDeviceAsync(
            new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" }
        );

        Assert.True(result.Success);
        Assert.True(transport.Requests[0].Headers.TryGetValue("Authorization", out var auth));
        Assert.Equal("Bearer phase_test_key", auth);
    }

    [Fact]
    public async Task CreateDeviceAsync_does_not_retry_401()
    {
        var attempts = 0;
        var transport = new MockHttpTransport((_, _) =>
        {
            attempts++;
            return new HttpTransportResponse(401, """{"detail":"unauthorized"}""");
        });
        var client = new SdkHttpClient("phase_test_key", transport);

        var result = await client.CreateDeviceAsync(
            new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" }
        );

        Assert.False(result.Success);
        Assert.Equal(1, attempts);
    }

    [Fact]
    public async Task CreateDeviceAsync_retries_500()
    {
        var attempts = 0;
        var transport = new MockHttpTransport((_, _) =>
        {
            attempts++;
            if (attempts < 3)
            {
                return new HttpTransportResponse(500, "server error");
            }

            return new HttpTransportResponse(
                200,
                """{"deviceId":"d1","firstSeen":"2026-01-01T00:00:00Z"}"""
            );
        });
        var client = new SdkHttpClient("phase_test_key", transport);

        var result = await client.CreateDeviceAsync(
            new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" }
        );

        Assert.True(result.Success);
        Assert.Equal(3, attempts);
    }

    [Fact]
    public async Task SendBatchAsync_no_gzip_below_threshold()
    {
        var transport = new MockHttpTransport(
            (_, _) =>
                new HttpTransportResponse(
                    200,
                    """{"processed":1,"failed":0,"errors":[],"results":[]}"""
                )
        );
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

        var result = await client.SendBatchAsync(new BatchRequest { Items = items });

        Assert.True(result.Success);
        Assert.False(transport.Requests[0].Headers.ContainsKey("Content-Encoding"));
    }

    [Fact]
    public async Task SendBatchAsync_gzip_when_threshold_reached()
    {
        var transport = new MockHttpTransport(
            (_, _) =>
                new HttpTransportResponse(
                    200,
                    """{"processed":1,"failed":0,"errors":[],"results":[]}"""
                )
        );
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

        var result = await client.SendBatchAsync(new BatchRequest { Items = items });

        Assert.True(result.Success);
        Assert.True(transport.Requests[0].Headers.ContainsKey("Content-Encoding"));
        Assert.Equal("gzip", transport.Requests[0].Headers["Content-Encoding"]);
        Assert.True(IsGzipPayload(transport.Requests[0].Body));
    }

    private static bool IsGzipPayload(byte[] body)
    {
        return body.Length >= 2 && body[0] == 0x1f && body[1] == 0x8b;
    }

    private sealed class MockHttpTransport : IHttpTransport
    {
        private readonly Func<HttpTransportRequest, int, HttpTransportResponse> _handler;

        public MockHttpTransport(Func<HttpTransportRequest, int, HttpTransportResponse> handler)
        {
            _handler = handler;
        }

        public List<HttpTransportRequest> Requests { get; } = new();

        public Task<HttpTransportResponse> SendAsync(
            HttpTransportRequest request,
            CancellationToken cancellationToken
        )
        {
            Requests.Add(request);
            return Task.FromResult(_handler(request, Requests.Count - 1));
        }
    }
}
