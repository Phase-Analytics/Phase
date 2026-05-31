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
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-bold font-sans text-2xl" title={title}>
          {title}
        </h1>
        <p
          className="truncate font-sans text-muted-foreground text-sm"
          title={description}
        >
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
