import { Badge } from '@/components/ui/badge';
import type { PublicApiScope } from '@/lib/api/types';

const scopeLabels: Record<PublicApiScope, string> = {
  'reports:read': 'Reports',
  'events:read': 'Events',
  'sessions:read': 'Sessions',
  'devices:read': 'Devices',
  'realtime:read': 'Realtime',
};

type PublicApiScopeBadgesProps = {
  scopes: PublicApiScope[];
  className?: string;
};

export function PublicApiScopeBadges({
  scopes,
  className,
}: PublicApiScopeBadgesProps) {
  if (scopes.length === 0) {
    return <span className="text-muted-foreground text-sm">No scopes</span>;
  }

  return (
    <div
      className={
        className ? `flex flex-wrap gap-2 ${className}` : 'flex flex-wrap gap-2'
      }
    >
      {scopes.map((scope) => (
        <Badge className="rounded-full" key={scope} variant="outline">
          {scopeLabels[scope]}
        </Badge>
      ))}
    </div>
  );
}
