using Phase.Analytics.Models;

namespace Phase.Analytics.Device;

public interface IDeviceInfoProvider
{
    DeviceInfo GetDeviceInfo();
}
