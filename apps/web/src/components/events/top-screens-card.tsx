'use client';

import { ScreenAddToHome02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { useTopScreens } from '@/lib/queries';

export function TopScreensCard() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: topScreens } = useTopScreens(appId || '');

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
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {(() => {
              const totalCount = topScreens.screens
                .filter((s) => s?.count !== undefined)
                .reduce((sum, s) => sum + (s.count || 0), 0);

              return topScreens.screens
                .filter((screen) => screen?.name && screen?.count !== undefined)
                .map((screen) => {
                  const percentage = totalCount
                    ? (screen.count / totalCount) * 100
                    : 0;

                  return (
                    <div className="space-y-1.5" key={screen.name}>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="truncate font-medium text-sm"
                          title={screen.name}
                        >
                          {screen.name}
                        </span>
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
        )}

        {(!topScreens?.screens || topScreens.screens.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <HugeiconsIcon
              className="size-10 text-muted-foreground opacity-40"
              icon={ScreenAddToHome02Icon}
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
