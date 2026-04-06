'use client';

import {
  InformationCircleIcon,
  RotateTopRightIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { useScramble } from 'use-scramble';
import { ClientDate } from '@/components/client-date';
import { PublicApiIntroCard } from '@/components/public-api/public-api-intro-card';
import { PublicApiTokenTable } from '@/components/public-api/public-api-token-table';
import { RequireApp } from '@/components/require-app';
import { RotateKeyDialog } from '@/components/rotate-key-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useApp, useAppKeys, usePublicApiTokens } from '@/lib/queries';

function SdkApiKeyCard({
  appId,
  isOwner,
}: {
  appId: string;
  isOwner: boolean;
}) {
  const { data: keysData, isPending: keysLoading } = useAppKeys(appId);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const isFirstRender = useRef(true);

  const apiKey = keysData?.key || '';
  const keyLength = apiKey.length || 32;
  const maskedKey = '•'.repeat(keyLength);

  let displayText = maskedKey;
  if (!isFirstRender.current) {
    displayText = isKeyVisible ? apiKey : maskedKey;
  }

  const { ref } = useScramble({
    text: shouldAnimate ? displayText : '',
    speed: 0.5,
    tick: 1,
    step: 3,
    overflow: true,
    scramble: 3,
    seed: 2,
    chance: 1.0,
    range: [65.0, 125.0],
    overdrive: false,
  });

  const staticRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const handleToggleVisibility = () => {
    if (!isFirstRender.current) {
      setShouldAnimate(true);
    }
    setIsKeyVisible(!isKeyVisible);
  };

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        {keysLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-9 w-48" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1 overflow-hidden rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                <div
                  className="overflow-x-auto whitespace-nowrap"
                  ref={shouldAnimate ? ref : staticRef}
                >
                  {!shouldAnimate && displayText}
                </div>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleToggleVisibility}
                      size="icon-sm"
                      type="button"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        className="size-4"
                        icon={isKeyVisible ? ViewOffIcon : ViewIcon}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isKeyVisible ? 'Hide API key' : 'Show API key'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <CopyButton
                        content={apiKey}
                        size="sm"
                        variant="outline"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Copy API key</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              Last rotated:{' '}
              {keysData?.keyRotatedAt ? (
                <ClientDate
                  date={keysData.keyRotatedAt}
                  format="datetime-long"
                />
              ) : (
                'Never'
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={isOwner ? undefined : 0}>
                    <RotateKeyDialog appId={appId}>
                      <Button
                        disabled={!isOwner}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        <HugeiconsIcon
                          className="mr-1.5 size-3"
                          icon={RotateTopRightIcon}
                        />
                        Rotate Key
                      </Button>
                    </RotateKeyDialog>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Owner only</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApiKeysPage() {
  const [appId] = useQueryState('app');
  const resolvedAppId = appId || '';

  const { data: app, isPending: appLoading } = useApp(resolvedAppId);
  const { data: publicApiTokens, isPending: publicApiTokensLoading } =
    usePublicApiTokens(resolvedAppId);

  const isOwner = app?.role === 'owner';

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold font-sans text-2xl">API Keys</h1>
          <p className="font-sans text-muted-foreground text-sm">
            Manage your application credentials for ingestion and read-only
            access.
          </p>
        </div>

        <div className="space-y-4">
          <Card className="border-blue-500/50 bg-blue-500/5 py-0">
            <CardContent className="flex gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <HugeiconsIcon
                  className="size-5 text-blue-600 dark:text-blue-400"
                  icon={InformationCircleIcon}
                />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-sm">About credentials</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  SDK keys are designed for client-side ingestion and send
                  analytics data to Phase. API keys are separate, read-only
                  credentials for external scripts, dashboards, and curated
                  reporting access.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <h2 className="font-semibold text-base">SDK Key</h2>
              <p className="text-muted-foreground text-sm">
                Manage ingestion access with your SDK token.
              </p>
            </div>
            <SdkApiKeyCard appId={resolvedAppId} isOwner={isOwner} />
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="font-semibold text-base">API Key</h2>
              <p className="text-muted-foreground text-sm">
                Manage read-only external access without reusing your SDK key.
              </p>
            </div>
            <PublicApiIntroCard />
          </div>

          <PublicApiTokenTable
            appId={resolvedAppId}
            isLoading={appLoading || publicApiTokensLoading}
            isOwner={isOwner}
            tokens={publicApiTokens?.tokens}
          />
        </div>
      </div>
    </RequireApp>
  );
}
