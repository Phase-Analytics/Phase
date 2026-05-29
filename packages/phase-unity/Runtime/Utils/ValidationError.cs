using System;

namespace Phase.Analytics.Utils;

public sealed class ValidationError : Exception
{
    public ValidationError(string message)
        : base(message)
    {
    }
}
