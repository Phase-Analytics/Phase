// Minimal Unity API stubs for CI compile checks (UNITY_5_3_OR_NEWER).
#if UNITY_5_3_OR_NEWER
namespace UnityEngine
{
    public class Object
    {
        public static void DontDestroyOnLoad(Object target) { }
        public static void Destroy(Object obj) { }
    }

    public class GameObject : Object
    {
        public GameObject() { }

        public GameObject(string name) { }

        public T AddComponent<T>()
            where T : Component, new() => new T();
    }

    public class Component : Object { }

    public class MonoBehaviour : Component
    {
        public GameObject gameObject { get; } = new();
    }

    public static class Application
    {
        public static string persistentDataPath { get; } = "/tmp";
        public static string version { get; } = "1.0.0";
        public static string unityVersion { get; } = "2021.3.0";
        public static NetworkReachability internetReachability { get; set; } =
            NetworkReachability.ReachableViaLocalAreaNetwork;
        public static SystemLanguage systemLanguage { get; set; } = SystemLanguage.English;
    }

    public enum SystemLanguage
    {
        English,
    }

    public static class SystemInfo
    {
        public static string operatingSystem { get; } = "Stub OS";
        public static string deviceModel { get; } = "Stub Device";
    }

    public enum NetworkReachability
    {
        NotReachable,
        ReachableViaCarrierDataNetwork,
        ReachableViaLocalAreaNetwork,
    }

    public static class Time
    {
        public static float realtimeSinceStartup { get; set; }
    }

    public static class Debug
    {
        public static void Log(object message) { }
        public static void LogWarning(object message) { }
        public static void LogError(object message) { }
    }

    public class AsyncOperation
    {
        public bool isDone { get; set; } = true;
    }
}

namespace UnityEngine.Networking
{
    public class DownloadHandlerBuffer : DownloadHandler { }

    public class DownloadHandler
    {
        public string text { get; set; } = string.Empty;
    }

    public class UploadHandlerRaw : UploadHandler
    {
        public UploadHandlerRaw(byte[] data) { }
    }

    public class UploadHandler { }

    public class UnityWebRequest : System.IDisposable
    {
        public const string kHttpVerbPOST = "POST";

        public UnityWebRequest(string url, string method) { }

        public UploadHandler uploadHandler { get; set; } = null!;
        public DownloadHandler downloadHandler { get; set; } = null!;
        public int timeout { get; set; }
        public Result result { get; set; } = Result.Success;
        public long responseCode { get; set; } = 200;
        public string error { get; set; } = string.Empty;

        public void SetRequestHeader(string name, string value) { }

        public AsyncOperation SendWebRequest() => new UnityEngine.AsyncOperation();

        public void Abort() { }

        public void Dispose() { }

        public enum Result
        {
            Success,
            ConnectionError,
            ProtocolError,
            DataProcessingError,
        }
    }
}
#endif
