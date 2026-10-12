using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Config;
using Phase.Analytics.Constants;
using Phase.Analytics.Device;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

public sealed class DeviceManager
{
    private readonly OfflineQueue _offlineQueue;
    private readonly IDeviceInfoProvider _deviceInfoProvider;
    private readonly bool _collectDeviceInfo;
    private readonly bool _collectLocale;
    private readonly string _apiKey;
    private string? _deviceId;

    public DeviceManager(
        OfflineQueue offlineQueue,
        IDeviceInfoProvider deviceInfoProvider,
        PhaseConfig config
    )
    {
        _offlineQueue = offlineQueue;
        _deviceInfoProvider = deviceInfoProvider;
        _collectDeviceInfo = config.DeviceInfo;
        _collectLocale = config.UserLocale;
        _apiKey = config.ApiKey;
    }

    /// <summary>Loads the stored device ID, or creates one. Must complete before identify.</summary>
    public async Task<string> InitializeAsync()
    {
        var storedApiKeyResult = await StorageService
            .GetItemAsync<string>(StorageKeys.ApiKey)
            .ConfigureAwait(false);
        var storedApiKey = storedApiKeyResult.Success ? storedApiKeyResult.Data : null;
        var apiKeyChanged = !string.IsNullOrEmpty(storedApiKey) && storedApiKey != _apiKey;

        if (apiKeyChanged)
        {
            // Queued items belong to the old app; the server would reject or misattribute them.
            Logger.Info("API key changed. Resetting device ID and offline queue.");
            await _offlineQueue.ClearAsync().ConfigureAwait(false);
            await StorageService.RemoveItemAsync(StorageKeys.DeviceId).ConfigureAwait(false);
            await StorageService.RemoveItemAsync(StorageKeys.DeviceInfo).ConfigureAwait(false);
        }

        var persistApiKey = await StorageService
            .SetItemAsync(StorageKeys.ApiKey, _apiKey)
            .ConfigureAwait(false);
        if (!persistApiKey.Success)
        {
            Logger.Error("Failed to persist API key.");
        }

        string? storedDeviceId = null;
        if (!apiKeyChanged)
        {
            var storedDeviceResult = await StorageService
                .GetItemAsync<string>(StorageKeys.DeviceId)
                .ConfigureAwait(false);
            storedDeviceId = storedDeviceResult.Success ? storedDeviceResult.Data : null;
        }

        // The server decodes the creation time from the device ID, so anything else is replaced.
        if (Validator.IsUlid(storedDeviceId))
        {
            Volatile.Write(ref _deviceId, storedDeviceId);
            return storedDeviceId!;
        }

        if (!string.IsNullOrEmpty(storedDeviceId))
        {
            Logger.Error("Stored device ID invalid. Generating new ID.");
        }

        return await AssignNewDeviceIdAsync().ConfigureAwait(false);
    }

    public string? GetDeviceId() => Volatile.Read(ref _deviceId);

    /// <summary>Queues a device upsert; the batch endpoint creates it before sessions and events.</summary>
    public void Identify(DeviceProperties? properties = null)
    {
        var deviceId = GetDeviceId();
        if (string.IsNullOrEmpty(deviceId))
        {
            Logger.Error("Device ID not set. Call InitializeAsync() first.");
            return;
        }

        var propertiesResult = Validator.ValidateDeviceProperties(properties);
        if (!propertiesResult.Success)
        {
            Logger.Error(
                "Invalid identify properties. Use up to 32 primitive keys only.",
                propertiesResult.Error
            );
            return;
        }

        _offlineQueue.Enqueue(
            new BatchDeviceItem { Payload = BuildDevicePayload(deviceId!, propertiesResult.Data) }
        );
    }

    /// <summary>Forgets this device. The next identify registers a brand-new device.</summary>
    public async Task ResetAsync()
    {
        await StorageService.RemoveItemAsync(StorageKeys.DeviceInfo).ConfigureAwait(false);
        await AssignNewDeviceIdAsync().ConfigureAwait(false);
    }

    private async Task<string> AssignNewDeviceIdAsync()
    {
        var deviceId = IdGenerator.GenerateDeviceId();
        Volatile.Write(ref _deviceId, deviceId);
        var persist = await StorageService
            .SetItemAsync(StorageKeys.DeviceId, deviceId)
            .ConfigureAwait(false);
        if (!persist.Success)
        {
            Logger.Error("Failed to persist device ID. Storage unavailable.");
        }

        return deviceId;
    }

    private CreateDeviceRequest BuildDevicePayload(string deviceId, DeviceProperties? properties)
    {
        var deviceInfo = _deviceInfoProvider.GetDeviceInfo();
        return new CreateDeviceRequest
        {
            DeviceId = deviceId,
            OsVersion = _collectDeviceInfo ? deviceInfo.OsVersion : null,
            Platform = _collectDeviceInfo ? deviceInfo.Platform : null,
            Locale = _collectLocale ? deviceInfo.Locale : null,
            Model = _collectDeviceInfo ? deviceInfo.Model : null,
            Properties = BuildProperties(properties, deviceInfo),
            DisableGeolocation = !_collectLocale,
        };
    }

    private DeviceProperties? BuildProperties(DeviceProperties? properties, DeviceInfo deviceInfo)
    {
        if (!_collectDeviceInfo)
        {
            return properties;
        }

        var autoProperties = new DeviceProperties { ["engine"] = "unity" };

        if (!string.IsNullOrWhiteSpace(deviceInfo.AppVersion))
        {
            autoProperties["app_version"] = deviceInfo.AppVersion!.Trim();
        }

        if (!string.IsNullOrWhiteSpace(deviceInfo.UnityVersion))
        {
            autoProperties["unity_version"] = deviceInfo.UnityVersion!.Trim();
        }

        if (properties == null || properties.Count == 0)
        {
            return autoProperties;
        }

        foreach (var entry in properties)
        {
            autoProperties[entry.Key] = entry.Value;
        }

        return autoProperties;
    }
}
