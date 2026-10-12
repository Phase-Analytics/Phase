import type { FunnelPeriod } from './results';

export { runActivationFunnel } from './activation';
export { runCustomFunnel } from './custom';
export { FUNNEL_MAX_ROWS, FunnelTooLargeError } from './loaders';
export type { FunnelPeriod } from './results';

const DEFAULT_LOOKBACK_DAYS = 30;

export function resolveFunnelPeriod(
  startDate?: string,
  endDate?: string,
  now = new Date()
): FunnelPeriod {
  const end = endDate ? new Date(endDate) : now;
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return { start, end };
}
