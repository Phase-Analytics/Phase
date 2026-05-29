using Phase.Analytics.Models;

namespace Phase.Analytics.Device;

public sealed class StaticDeviceInfoProvider : IDeviceInfoProvider
{
    private readonly DeviceInfo _deviceInfo;

    public StaticDeviceInfoProvider(DeviceInfo deviceInfo)
    {
        _deviceInfo = deviceInfo;
    }

    public DeviceInfo GetDeviceInfo() => _deviceInfo;
}
