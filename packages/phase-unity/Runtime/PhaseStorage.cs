using System.Threading.Tasks;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics;

/// <summary>Local persistence helpers.</summary>
public static class PhaseStorage
{
    /// <summary>Removes all Phase SDK data from device storage.</summary>
    public static Task<Result> ClearLocalDataAsync() =>
        StorageService.ClearPhaseDataAsync();
}
