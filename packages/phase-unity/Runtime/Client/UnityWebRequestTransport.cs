using System;
using System.Threading;
using System.Threading.Tasks;
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
        return SendUnityAsync(request, cancellationToken);
#else
        throw new InvalidOperationException(
            "UnityWebRequestTransport is only available in Unity player builds."
        );
#endif
    }

#if UNITY_5_3_OR_NEWER
    private static async Task<HttpTransportResponse> SendUnityAsync(
        HttpTransportRequest request,
        CancellationToken cancellationToken
    )
    {
        using var webRequest = new UnityWebRequest(request.Url, UnityWebRequest.kHttpVerbPOST);
        webRequest.uploadHandler = new UploadHandlerRaw(request.Body);
        webRequest.downloadHandler = new DownloadHandlerBuffer();
        webRequest.timeout = Math.Max(1, request.TimeoutMs / 1000);

        foreach (var header in request.Headers)
        {
            webRequest.SetRequestHeader(header.Key, header.Value);
        }

        var operation = webRequest.SendWebRequest();
        using var registration = cancellationToken.Register(() => webRequest.Abort());

        while (!operation.isDone)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                webRequest.Abort();
                return new HttpTransportResponse(0, string.Empty, timedOut: true);
            }

            await Task.Yield();
        }

        if (
            webRequest.result == UnityWebRequest.Result.ConnectionError
            || webRequest.result == UnityWebRequest.Result.DataProcessingError
        )
        {
            return new HttpTransportResponse(0, webRequest.error ?? string.Empty);
        }

        if (webRequest.result == UnityWebRequest.Result.ProtocolError)
        {
            return new HttpTransportResponse(
                (int)webRequest.responseCode,
                webRequest.downloadHandler?.text ?? string.Empty
            );
        }

        return new HttpTransportResponse(
            (int)webRequest.responseCode,
            webRequest.downloadHandler?.text ?? string.Empty
        );
    }
#endif
}
