using System;
using System.Security.Cryptography;

namespace Phase.Analytics.Utils;

public static class IdGenerator
{
    private const string Encoding = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private const long UlidEpochMilliseconds = 1_584_598_400_000L;

    private static readonly object Sync = new();
    private static long _lastTimestamp = -1;
    private static readonly byte[] LastRandom = new byte[10];
    private static bool _hasLastRandom;

    public static string GenerateDeviceId() => Generate();

    public static string GenerateSessionId() => Generate();

    public static string Generate()
    {
        lock (Sync)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            long timestamp;
            byte[] random;

            if (!_hasLastRandom || now > _lastTimestamp)
            {
                timestamp = now;
                random = CreateRandomBytes();
            }
            else
            {
                timestamp = _lastTimestamp;
                random = IncrementRandom(LastRandom);
            }

            _lastTimestamp = timestamp;
            CopyRandom(random);
            return Encode(timestamp, random);
        }
    }

    private static byte[] CreateRandomBytes()
    {
        var bytes = new byte[10];
        RandomNumberGenerator.Fill(bytes);
        return bytes;
    }

    private static byte[] IncrementRandom(byte[] source)
    {
        var incremented = (byte[])source.Clone();
        for (var i = incremented.Length - 1; i >= 0; i--)
        {
            if (++incremented[i] != 0)
            {
                break;
            }
        }

        return incremented;
    }

    private static void CopyRandom(byte[] random)
    {
        Buffer.BlockCopy(random, 0, LastRandom, 0, random.Length);
        _hasLastRandom = true;
    }

    private static string Encode(long timestampMs, byte[] random)
    {
        var ulidTimestamp = timestampMs - UlidEpochMilliseconds;
        var chars = new char[26];

        chars[0] = Encoding[(int)((ulidTimestamp >> 45) & 31)];
        chars[1] = Encoding[(int)((ulidTimestamp >> 40) & 31)];
        chars[2] = Encoding[(int)((ulidTimestamp >> 35) & 31)];
        chars[3] = Encoding[(int)((ulidTimestamp >> 30) & 31)];
        chars[4] = Encoding[(int)((ulidTimestamp >> 25) & 31)];
        chars[5] = Encoding[(int)((ulidTimestamp >> 20) & 31)];
        chars[6] = Encoding[(int)((ulidTimestamp >> 15) & 31)];
        chars[7] = Encoding[(int)((ulidTimestamp >> 10) & 31)];
        chars[8] = Encoding[(int)((ulidTimestamp >> 5) & 31)];
        chars[9] = Encoding[(int)(ulidTimestamp & 31)];

        var bitBuffer = 0UL;
        var bitCount = 0;
        var charIndex = 10;

        for (var i = 0; i < random.Length; i++)
        {
            bitBuffer = (bitBuffer << 8) | random[i];
            bitCount += 8;

            while (bitCount >= 5 && charIndex < 26)
            {
                bitCount -= 5;
                chars[charIndex++] = Encoding[(int)((bitBuffer >> bitCount) & 31)];
            }
        }

        while (charIndex < 26)
        {
            bitCount += 8;
            bitBuffer <<= 8;
            while (bitCount >= 5 && charIndex < 26)
            {
                bitCount -= 5;
                chars[charIndex++] = Encoding[(int)((bitBuffer >> bitCount) & 31)];
            }
        }

        return new string(chars);
    }
}
