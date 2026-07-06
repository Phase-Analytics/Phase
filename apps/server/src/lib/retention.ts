export const RETENTION_PERIODS = ['d1', 'd3', 'd7', 'd14', 'd30'] as const;

export type RetentionPeriod = (typeof RETENTION_PERIODS)[number];

type RetentionCohort = {
  cohortSize: number;
} & Record<RetentionPeriod, number | null>;

export function calculateRetentionSummary(
  cohorts: RetentionCohort[]
): Record<RetentionPeriod, number> {
  return Object.fromEntries(
    RETENTION_PERIODS.map((period) => {
      let weightedRates = 0;
      let eligibleUsers = 0;

      for (const cohort of cohorts) {
        const rate = cohort[period];
        if (rate !== null) {
          weightedRates += rate * cohort.cohortSize;
          eligibleUsers += cohort.cohortSize;
        }
      }

      return [
        period,
        eligibleUsers > 0
          ? Number((weightedRates / eligibleUsers).toFixed(2))
          : 0,
      ];
    })
  ) as Record<RetentionPeriod, number>;
}
