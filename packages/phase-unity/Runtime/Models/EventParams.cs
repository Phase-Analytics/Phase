using System.Collections.Generic;

namespace Phase.Analytics.Models;

/// <summary>
/// Event parameters. Flat primitive object only. Max 32 keys.
/// </summary>
/// <example>{ "user_id": "123", "amount": 99.99, "premium": true }</example>
public sealed class EventParams : Dictionary<string, object>
{
    public EventParams()
    {
    }

    public EventParams(IDictionary<string, object> parameters)
        : base(parameters)
    {
    }
}
