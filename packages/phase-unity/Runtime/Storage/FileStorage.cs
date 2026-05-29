using System;
using System.IO;
using System.Threading.Tasks;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Storage;

public sealed class FileStorage : IStorage
{
    private readonly string _rootDirectory;

    public FileStorage(string rootDirectory)
    {
        _rootDirectory = rootDirectory;
        Directory.CreateDirectory(_rootDirectory);
    }

    public Task<Result<T?>> GetItemAsync<T>(string key)
    {
        return Task.Run(() => GetItem<T>(key));
    }

    public Task<Result> SetItemAsync<T>(string key, T value)
    {
        return Task.Run(() => SetItem(key, value));
    }

    public Task<Result> RemoveItemAsync(string key)
    {
        return Task.Run(() => RemoveItem(key));
    }

    private string GetFilePath(string key)
    {
        var safeKey = key.Replace('/', '_').Replace('\\', '_');
        return Path.Combine(_rootDirectory, safeKey + ".json");
    }

    private Result<T?> GetItem<T>(string key)
    {
        try
        {
            var path = GetFilePath(key);
            if (!File.Exists(path))
            {
                return Result<T?>.Ok(default);
            }

            var content = File.ReadAllText(path);
            if (string.IsNullOrWhiteSpace(content))
            {
                return Result<T?>.Ok(default);
            }

            try
            {
                var data = JsonHelper.Deserialize<T>(content);
                return Result<T?>.Ok(data);
            }
            catch (Exception parseError)
            {
                Logger.Error($"Corrupted storage data for \"{key}\". Clearing.", parseError);
                var corruptPath = path + ".corrupt";
                try
                {
                    if (File.Exists(corruptPath))
                    {
                        File.Delete(corruptPath);
                    }

                    File.Move(path, corruptPath);
                }
                catch
                {
                    try
                    {
                        File.Delete(path);
                    }
                    catch
                    {
                        // best effort
                    }
                }

                return Result<T?>.Ok(default);
            }
        }
        catch (Exception error)
        {
            return Result<T?>.Fail(error);
        }
    }

    private Result SetItem<T>(string key, T value)
    {
        try
        {
            var path = GetFilePath(key);
            var tempPath = path + ".tmp";
            var serialized = JsonHelper.Serialize(value);
            File.WriteAllText(tempPath, serialized);
            if (File.Exists(path))
            {
                File.Replace(tempPath, path, null);
            }
            else
            {
                File.Move(tempPath, path);
            }

            return Result.Ok();
        }
        catch (Exception error)
        {
            return Result.Fail(error);
        }
    }

    private Result RemoveItem(string key)
    {
        try
        {
            var path = GetFilePath(key);
            if (File.Exists(path))
            {
                File.Delete(path);
            }

            return Result.Ok();
        }
        catch (Exception error)
        {
            return Result.Fail(error);
        }
    }
}
