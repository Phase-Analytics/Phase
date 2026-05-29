using System.Threading;
using System.Threading.Tasks;

namespace Phase.Analytics.Client;

public interface IHttpTransport
{
    Task<HttpTransportResponse> SendAsync(
        HttpTransportRequest request,
        CancellationToken cancellationToken
    );
}
