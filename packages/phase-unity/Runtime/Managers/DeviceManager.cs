using System;
using System.Threading.Tasks;
using Phase.Analytics.Client;
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
    private readonly SdkHttpClient _httpClient;
    private readonly OfflineQueue _offlineQueue;
    private readonly IDeviceInfoProvider _deviceInfoProvider;
    private readonly bool _collectDeviceInfo;
    private readonly bool _collectLocale;
    private readonly string _apiKey;
    private string? _deviceId;
    private Task<string>? _initTask;

    public DeviceManager(
        SdkHttpClient httpClient,
        OfflineQueue offlineQueue,
        IDeviceInfoProvider deviceInfoProvider,
        PhaseConfig config
    )
    {
        _httpClient = httpClient;
        _offlineQueue = offlineQueue;
        _deviceInfoProvider = deviceInfoProvider;
        _collectDeviceInfo = config.DeviceInfo;
        _collectLocale = config.UserLocale;
        _apiKey = config.ApiKey;
    }

    public async Task<string> InitializeAsync()
    {
        if (_initTask != null)
        {
            return await _initTask.ConfigureAwait(false);
        }

        if (!string.IsNullOrEmpty(_deviceId))
        {
            return _deviceId;
        }

        _initTask = InitializeInternalAsync();
        try
        {
            return await _initTask.ConfigureAwait(false);
        }
        finally
        {
            _initTask = null;
        }
    }

    private async Task<string> InitializeInternalAsync()
    {
        var storedApiKeyResult = await StorageService
            .GetItemAsync<string>(StorageKeys.ApiKey)
            .ConfigureAwait(false);
        var storedApiKey = storedApiKeyResult.Success ? storedApiKeyResult.Data : null;
        var shouldResetDevice = false;

        if (!string.IsNullOrEmpty(storedApiKey) && storedApiKey != _apiKey)
        {
            Logger.Info("API key changed. Resetting device ID.");
            shouldResetDevice = true;

            await StorageService.RemoveItemAsync(StorageKeys.DeviceId).ConfigureAwait(false);
            await StorageService.RemoveItemAsync(StorageKeys.DeviceInfo).ConfigureAwait(false);
            await _offlineQueue.ClearAsync().ConfigureAwait(false);
        }

        var persistApiKey = await StorageService
            .SetItemAsync(StorageKeys.ApiKey, _apiKey)
            .ConfigureAwait(false);
        if (!persistApiKey.Success)
        {
            Logger.Error("Failed to persist API key.");
        }

        var storedDeviceResult = await StorageService
            .GetItemAsync<string>(StorageKeys.DeviceId)
            .ConfigureAwait(false);
        var storedDeviceId = storedDeviceResult.Success ? storedDeviceResult.Data : null;

        if (!shouldResetDevice && !string.IsNullOrEmpty(storedDeviceId))
        {
            var validation = Validator.ValidateDeviceId(storedDeviceId);
            if (validation.Success)
            {
                _deviceId = storedDeviceId;
            }
            else
            {
                Logger.Error("Stored device ID invalid. Generating new ID.");
                _deviceId = await PersistNewDeviceIdAsync().ConfigureAwait(false);
            }
        }
        else
        {
            _deviceId = await PersistNewDeviceIdAsync().ConfigureAwait(false);
        }

        return _deviceId;
    }

    public async Task IdentifyAsync(bool isOnline, DeviceProperties? properties = null)
    {
        if (string.IsNullOrEmpty(_deviceId))
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

        await RegisterDeviceAsync(isOnline, propertiesResult.Data).ConfigureAwait(false);
    }

    public string? GetDeviceId() => _deviceId;

    private async Task<string> PersistNewDeviceIdAsync()
    {
        var deviceId = IdGenerator.GenerateDeviceId();
        var persist = await StorageService.SetItemAsync(StorageKeys.DeviceId, deviceId)
            .ConfigureAwait(false);
        if (!persist.Success)
        {
            Logger.Error("Failed to persist device ID. Storage unavailable.");
        }

        return deviceId;
    }

    private CreateDeviceRequest? BuildDevicePayload(DeviceProperties? properties)
    {
        if (string.IsNullOrEmpty(_deviceId))
        {
            return null;
        }

        var deviceInfo = _deviceInfoProvider.GetDeviceInfo();
        return new CreateDeviceRequest
        {
            DeviceId = _deviceId,
            OsVersion = _collectDeviceInfo ? deviceInfo.OsVersion : null,
            Platform = null,
            Locale = _collectLocale ? deviceInfo.Locale : null,
            Model = _collectDeviceInfo ? deviceInfo.Model : null,
            Properties = BuildProperties(properties, deviceInfo),
            DisableGeolocation = !_collectLocale,
        };
    }

    private DeviceProperties? BuildProperties(
        DeviceProperties? properties,
        DeviceInfo deviceInfo
    )
    {
        if (!_collectDeviceInfo)
        {
            return properties;
        }

        var autoProperties = new DeviceProperties { ["engine"] = "unity" };

        if (!string.IsNullOrWhiteSpace(deviceInfo.AppVersion))
        {
            autoProperties["app_version"] = deviceInfo.AppVersion.Trim();
        }

        if (!string.IsNullOrWhiteSpace(deviceInfo.UnityVersion))
        {
            autoProperties["unity_version"] = deviceInfo.UnityVersion.Trim();
        }

        if (properties == null || properties.Count == 0)
        {
            return autoProperties.Count > 0 ? autoProperties : null;
        }

        foreach (var entry in properties)
        {
            autoProperties[entry.Key] = entry.Value;
        }

        return autoProperties;
    }

    private async Task RegisterDeviceAsync(bool isOnline, DeviceProperties? properties)
    {
        var payload = BuildDevicePayload(properties);
        if (payload == null)
        {
            Logger.Error("Device ID not set. Cannot register device.");
            return;
        }

        if (isOnline)
        {
            try
            {
                var result = await _httpClient.CreateDeviceAsync(payload).ConfigureAwait(false);
                if (result.Success)
                {
                    await CacheDeviceInfoAsync(payload).ConfigureAwait(false);
                    return;
                }

                Logger.Error("Device registration failed. Queuing for retry.", result.Error);
                await EnqueueDeviceAsync(payload).ConfigureAwait(false);
            }
            catch (Exception error)
            {
                Logger.Error("Device registration error. Queuing for retry.", error);
                await EnqueueDeviceAsync(payload).ConfigureAwait(false);
            }
        }
        else
        {
            await EnqueueDeviceAsync(payload).ConfigureAwait(false);
        }
    }

    private Task EnqueueDeviceAsync(CreateDeviceRequest payload) =>
        _offlineQueue.EnqueueAsync(new BatchDeviceItem { Payload = payload });

    private async Task CacheDeviceInfoAsync(CreateDeviceRequest payload)
    {
        var result = await StorageService.SetItemAsync(StorageKeys.DeviceInfo, payload)
            .ConfigureAwait(false);
        if (result.Success)
        {
            Logger.Info("Device info cached successfully");
        }
        else
        {
            Logger.Error("Failed to cache device info");
        }
    }
}
