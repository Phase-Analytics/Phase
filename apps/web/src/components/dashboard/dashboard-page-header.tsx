import type { ReactNode } from 'react';

type DashboardPageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function DashboardPageHeader({
  title,
  description,
  actions,
}: DashboardPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-bold font-sans text-2xl">{title}</h1>
        <p className="font-sans text-muted-foreground text-sm">{description}</p>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
