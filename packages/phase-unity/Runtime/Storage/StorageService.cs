using System;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Storage;

public static class StorageService
{
    private static IStorage? _adapter;

    public static bool HasAdapter => _adapter != null;

    public static void SetAdapter(IStorage adapter)
    {
        _adapter = adapter;
    }

#if UNITY_5_3_OR_NEWER
    public static void UseUnityDefaults()
    {
        _adapter = new UnityFileStorage();
    }
#endif

    public static Task<Result<T?>> GetItemAsync<T>(string key) =>
        RequireAdapter().GetItemAsync<T>(key);

    public static Task<Result> SetItemAsync<T>(string key, T value) =>
        RequireAdapter().SetItemAsync(key, value);

    public static Task<Result> RemoveItemAsync(string key) =>
        RequireAdapter().RemoveItemAsync(key);

    public static async Task<Result> ClearPhaseDataAsync()
    {
        try
        {
            foreach (var key in StorageKeys.All)
            {
                var result = await RemoveItemAsync(key).ConfigureAwait(false);
                if (!result.Success)
                {
                    return result;
                }
            }

            Logger.Info("Storage cleared successfully");
            return Result.Ok();
        }
        catch (Exception error)
        {
            Logger.Error("Failed to clear Phase SDK storage", error);
            return Result.Fail(error);
        }
    }

    private static IStorage RequireAdapter()
    {
        if (_adapter == null)
        {
            throw new InvalidOperationException(
                "Storage adapter not initialized. Call StorageService.SetAdapter or UseUnityDefaults first."
            );
        }

        return _adapter;
    }
}
