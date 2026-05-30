using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Storage;

namespace Phase.Analytics.Tests;

public sealed class FileStorageTests : IDisposable
{
    private readonly string _root;
    private readonly FileStorage _storage;

    public FileStorageTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "phase-unity-tests", Guid.NewGuid().ToString("N"));
        _storage = new FileStorage(_root);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task SetAndGet_roundtrips_string()
    {
        var write = await _storage.SetItemAsync(StorageKeys.DeviceId, "device-123");
        Assert.True(write.Success);

        var read = await _storage.GetItemAsync<string>(StorageKeys.DeviceId);
        Assert.True(read.Success);
        Assert.Equal("device-123", read.Data);
    }

    [Fact]
    public async Task Get_missing_key_returns_null()
    {
        var read = await _storage.GetItemAsync<string>("missing-key");
        Assert.True(read.Success);
        Assert.Null(read.Data);
    }

    [Fact]
    public async Task Corrupt_file_returns_null_and_moves_aside()
    {
        Directory.CreateDirectory(_root);
        var path = Path.Combine(_root, StorageKeys.DeviceId.Replace('/', '_') + ".json");
        await File.WriteAllTextAsync(path, "{not-json");

        var read = await _storage.GetItemAsync<string>(StorageKeys.DeviceId);
        Assert.True(read.Success);
        Assert.Null(read.Data);
        Assert.False(File.Exists(path));
        Assert.True(File.Exists(path + ".corrupt"));
    }

    [Fact]
    public async Task SetBatchQueue_roundtrips_polymorphic_items()
    {
        var queue = new List<BatchItem>
        {
            new BatchDeviceItem
            {
                ClientOrder = 0,
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            },
            new BatchEventItem
            {
                ClientOrder = 1,
                Payload = new CreateEventRequest
                {
                    SessionId = "01HXTESTSESSION000000001",
                    Name = "level_complete",
                    IsScreen = false,
                    Timestamp = DateTime.UtcNow.ToString("o"),
                },
            },
        };

        var write = await _storage.SetItemAsync(StorageKeys.OfflineQueue, queue);
        Assert.True(write.Success, write.Error?.Message);

        var read = await _storage.GetItemAsync<List<BatchItem>>(StorageKeys.OfflineQueue);
        Assert.True(read.Success);
        Assert.NotNull(read.Data);
        Assert.Equal(2, read.Data!.Count);
        Assert.IsType<BatchDeviceItem>(read.Data[0]);
        Assert.IsType<BatchEventItem>(read.Data[1]);
    }
}
