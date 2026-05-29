namespace Phase.Analytics.Utils;

public readonly struct Result<T>
{
    public bool Success { get; }
    public T? Data { get; }
    public System.Exception? Error { get; }

    private Result(bool success, T? data, System.Exception? error)
    {
        Success = success;
        Data = data;
        Error = error;
    }

    public static Result<T> Ok(T data) => new(true, data, null);

    public static Result<T> Fail(System.Exception error) => new(false, default, error);
}

public readonly struct Result
{
    public bool Success { get; }
    public System.Exception? Error { get; }

    private Result(bool success, System.Exception? error)
    {
        Success = success;
        Error = error;
    }

    public static Result Ok() => new(true, null);

    public static Result Fail(System.Exception error) => new(false, error);
}
