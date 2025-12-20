'use client';

import { ViewIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { useTopEvents } from '@/lib/queries';

export function TopScreensCard() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: topEvents } = useTopEvents(appId || '');
  const topScreens = topEvents
    ? { screens: topEvents.screens }
    : { screens: [] };

  if (!appId) {
    return null;
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Top Screens
          </h2>
          <p className="text-muted-foreground text-sm">
            Most frequently viewed screens
          </p>
        </div>

        {topScreens?.screens && topScreens.screens.length > 0 && (
          <div className="h-[220px] overflow-y-auto">
            <div className="space-y-2 pr-4">
              {(() => {
                const totalCount = topScreens.screens
                  .filter((s) => s?.count !== undefined)
                  .reduce((sum, s) => sum + (s.count || 0), 0);

                return topScreens.screens
                  .filter(
                    (screen) => screen?.name && screen?.count !== undefined
                  )
                  .map((screen) => {
                    const percentage = totalCount
                      ? (screen.count / totalCount) * 100
                      : 0;

                    return (
                      <div className="space-y-1.5" key={screen.name}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <HugeiconsIcon
                              className="size-3.5 shrink-0 text-muted-foreground"
                              icon={ViewIcon}
                            />
                            <span
                              className="truncate font-medium text-sm"
                              title={screen.name}
                            >
                              {screen.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-baseline gap-2">
                            <span className="font-semibold text-sm">
                              {screen.count.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        )}

        {(!topScreens?.screens || topScreens.screens.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <HugeiconsIcon
              className="size-10 text-muted-foreground opacity-40"
              icon={ViewIcon}
            />
            <p className="text-center font-medium text-muted-foreground text-sm">
              No screen data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
