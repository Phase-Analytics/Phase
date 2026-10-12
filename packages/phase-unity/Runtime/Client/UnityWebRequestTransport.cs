using System;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Utils;
#if UNITY_5_3_OR_NEWER
using UnityEngine;
using UnityEngine.Networking;
#endif

namespace Phase.Analytics.Client;

public sealed class UnityWebRequestTransport : IHttpTransport
{
    public Task<HttpTransportResponse> SendAsync(
        HttpTransportRequest request,
        CancellationToken cancellationToken
    )
    {
#if UNITY_5_3_OR_NEWER
        var tcs = new TaskCompletionSource<HttpTransportResponse>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        MainThreadDispatcher.Enqueue(() => StartRequest(request, cancellationToken, tcs));
        return tcs.Task;
#else
        throw new InvalidOperationException(
            "UnityWebRequestTransport is only available in Unity player builds."
        );
#endif
    }

#if UNITY_5_3_OR_NEWER
    private static void StartRequest(
        HttpTransportRequest request,
        CancellationToken cancellationToken,
        TaskCompletionSource<HttpTransportResponse> tcs
    )
    {
        if (cancellationToken.IsCancellationRequested)
        {
            tcs.TrySetCanceled(cancellationToken);
            return;
        }

        var webRequest = new UnityWebRequest(request.Url, UnityWebRequest.kHttpVerbPOST);
        webRequest.uploadHandler = new UploadHandlerRaw(request.Body);
        webRequest.downloadHandler = new DownloadHandlerBuffer();
        webRequest.timeout = Math.Max(1, request.TimeoutMs / 1000);

        foreach (var header in request.Headers)
        {
            webRequest.SetRequestHeader(header.Key, header.Value);
        }

        var operation = webRequest.SendWebRequest();

        // Cancellation is observed by the poll below: UnityWebRequest may only be touched on the
        // main thread, so a CancellationToken callback must not abort it directly.
        MainThreadDispatcher.EnqueuePoll(() =>
        {
            if (cancellationToken.IsCancellationRequested)
            {
                if (!operation.isDone)
                {
                    webRequest.Abort();
                }

                webRequest.Dispose();
                tcs.TrySetCanceled(cancellationToken);
                return true;
            }

            if (!operation.isDone)
            {
                return false;
            }

            try
            {
                tcs.TrySetResult(BuildResponse(webRequest));
            }
            catch (Exception error)
            {
                tcs.TrySetException(error);
            }
            finally
            {
                webRequest.Dispose();
            }

            return true;
        });
    }

    private static HttpTransportResponse BuildResponse(UnityWebRequest webRequest)
    {
        if (
            webRequest.result == UnityWebRequest.Result.ConnectionError
            || webRequest.result == UnityWebRequest.Result.DataProcessingError
        )
        {
            return new HttpTransportResponse(0, webRequest.error ?? string.Empty);
        }

        return new HttpTransportResponse(
            (int)webRequest.responseCode,
            webRequest.downloadHandler?.text ?? string.Empty,
            retryAfter: webRequest.GetResponseHeader("Retry-After")
        );
    }
#endif
}
