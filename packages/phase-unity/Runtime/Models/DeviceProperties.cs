using System.Collections.Generic;

namespace Phase.Analytics.Models;

/// <summary>
/// Custom device attributes (optional). Flat primitives only.
/// </summary>
/// <example>{ "app_version": "1.2.3", "user_tier": "premium", "beta": true }</example>
public sealed class DeviceProperties : Dictionary<string, object>
{
    public DeviceProperties()
    {
    }

    public DeviceProperties(IDictionary<string, object> properties)
        : base(properties)
    {
    }
}
