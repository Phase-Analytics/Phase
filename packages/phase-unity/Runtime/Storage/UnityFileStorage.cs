using System.IO;
using UnityEngine;

namespace Phase.Analytics.Storage
{
    public sealed class UnityFileStorage : IStorage
    {
        private readonly FileStorage _inner;

        public UnityFileStorage()
        {
            var root = Path.Combine(Application.persistentDataPath, "phase-analytics-data");
            _inner = new FileStorage(root);
        }

        public UnityFileStorage(FileStorage inner)
        {
            _inner = inner;
        }

        public System.Threading.Tasks.Task<Utils.Result<T?>> GetItemAsync<T>(string key) =>
            _inner.GetItemAsync<T>(key);

        public System.Threading.Tasks.Task<Utils.Result> SetItemAsync<T>(string key, T value) =>
            _inner.SetItemAsync(key, value);

        public System.Threading.Tasks.Task<Utils.Result> RemoveItemAsync(string key) =>
            _inner.RemoveItemAsync(key);
    }
}
