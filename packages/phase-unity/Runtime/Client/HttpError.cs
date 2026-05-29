using System;

namespace Phase.Analytics.Client;

public sealed class HttpError : Exception
{
    public HttpError(int status, string message)
        : base(message)
    {
        Status = status;
    }

    public int Status { get; }

    public bool IsRetryable()
    {
        return Status >= 500 && Status < 600;
    }
}
