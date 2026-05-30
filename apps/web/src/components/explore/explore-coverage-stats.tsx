'use client';

import type { ExploreCoverage } from '@phase/shared';
import { coveragePercent } from './explore-query-language';

const UNIT_LABELS: Record<ExploreCoverage['unit'], string> = {
  devices: 'devices',
  events: 'events',
  sessions: 'sessions',
};

export function ExploreCoverageStats({
  coverage,
}: {
  coverage: ExploreCoverage;
}) {
  const percent = coveragePercent(coverage.matched, coverage.evaluated);
  const unit = UNIT_LABELS[coverage.unit];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        hint={`Total ${unit} in scope`}
        label="Evaluated"
        value={coverage.evaluated.toLocaleString()}
      />
      <StatCard
        hint="Matched your conditions"
        label="Matched"
        value={coverage.matched.toLocaleString()}
      />
      <StatCard
        hint={
          percent === null
            ? undefined
            : `${coverage.matched.toLocaleString()} of ${coverage.evaluated.toLocaleString()} ${unit}`
        }
        label="Match rate"
        value={percent === null ? '—' : `${percent}%`}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold text-2xl tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
