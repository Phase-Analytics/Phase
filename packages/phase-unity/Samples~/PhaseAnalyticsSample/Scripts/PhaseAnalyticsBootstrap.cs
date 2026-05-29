using System.Threading.Tasks;
using Phase.Analytics;
using Phase.Analytics.Config;
using Phase.Analytics.Models;
using UnityEngine;

namespace Phase.Analytics.Sample
{
    public sealed class PhaseAnalyticsBootstrap : MonoBehaviour
    {
        [SerializeField]
        private string apiKey = "phase_your_key_here";

        private async void Start()
        {
            var initialized = await PhaseAnalytics.InitializeAsync(
                new PhaseConfig
                {
                    ApiKey = apiKey,
                    LogLevel = LogLevel.Info,
                }
            );

            if (!initialized)
            {
                Debug.LogWarning("[Phase] Sample bootstrap: Initialize failed. Check API key.");
                return;
            }

            await PhaseAnalytics.IdentifyAsync();
            PhaseAnalytics.Track("sample_boot");
        }

        public void TrackSampleEvent()
        {
            PhaseAnalytics.Track(
                "sample_button",
                new EventParams { ["source"] = "PhaseAnalyticsSample" }
            );
        }
    }
}
