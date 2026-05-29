using System.Threading.Tasks;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Storage;

public interface IStorage
{
    Task<Result<T?>> GetItemAsync<T>(string key);

    Task<Result> SetItemAsync<T>(string key, T value);

    Task<Result> RemoveItemAsync(string key);
}
