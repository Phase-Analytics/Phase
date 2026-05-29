using System;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Client;

public static class RetryPolicy
{
    public static async Task<Result<T>> WithRetryAsync<T>(Func<Task<T>> operation)
    {
        Exception? lastError = null;

        for (var attempt = 0; attempt < ValidationConstants.RetryDelaysMs.Length + 1; attempt++)
        {
            try
            {
                var result = await operation().ConfigureAwait(false);
                return Result<T>.Ok(result);
            }
            catch (Exception error)
            {
                lastError = error;

                if (error is HttpError httpError && !httpError.IsRetryable())
                {
                    break;
                }

                if (attempt >= ValidationConstants.RetryDelaysMs.Length)
                {
                    break;
                }

                await Task.Delay(ValidationConstants.RetryDelaysMs[attempt])
                    .ConfigureAwait(false);
            }
        }

        return Result<T>.Fail(lastError ?? new Exception("Unknown error occurred"));
    }
}
