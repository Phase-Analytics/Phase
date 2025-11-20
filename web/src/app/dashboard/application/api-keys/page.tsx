'use client';

import {
  ArrowRight01Icon,
  BookOpen01Icon,
  InformationCircleIcon,
  RotateTopRightIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
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
import { useApp, useAppKeys } from '@/lib/queries';

export default function ApiKeysPage() {
  const [appId] = useQueryState('app');
  const { data: app, isPending: appLoading } = useApp(appId || '');
  const { data: keysData, isPending: keysLoading } = useAppKeys(appId || '');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  const isOwner = app?.role === 'owner';
  const showLoading = appLoading || keysLoading;
  const apiKey = keysData?.key || '';
  const displayKey = isKeyVisible ? apiKey : '•'.repeat(32);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">API Keys</h1>
          <p className="text-muted-foreground text-sm">
            Manage your application API keys
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
                <h3 className="font-semibold text-sm">About API Keys</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  API keys are used by your applications to communicate with
                  Telemetra. They are safe to use on the client side and do not
                  need to be hidden. If you suspect abuse or unauthorized usage,
                  you can rotate your key at any time.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold text-lg">SDK API Key</h2>
                <p className="text-muted-foreground text-sm">
                  Use this key to authenticate your application
                </p>
              </div>

              {showLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-32" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 font-mono text-sm">
                      {displayKey}
                    </div>
                    <Button
                      onClick={() => setIsKeyVisible(!isKeyVisible)}
                      size="icon-sm"
                      type="button"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        className="size-4"
                        icon={isKeyVisible ? ViewOffIcon : ViewIcon}
                      />
                    </Button>
                    <CopyButton content={apiKey} size="sm" variant="outline" />
                  </div>

                  <p className="text-muted-foreground text-sm">
                    Last rotated:{' '}
                    {keysData?.keyRotatedAt
                      ? `${new Date(keysData.keyRotatedAt).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          }
                        )} UTC`
                      : 'Never'}
                  </p>

                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={isOwner ? undefined : 0}>
                          <RotateKeyDialog appId={appId || ''}>
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
                      {!isOwner && (
                        <TooltipContent>
                          Only owners can perform this action
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 font-semibold text-lg">Documentation</h2>
            <Link className="block" href="/docs">
              <Card className="cursor-pointer py-0 transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <HugeiconsIcon
                        className="size-5 text-primary"
                        icon={BookOpen01Icon}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">API Key Usage</h3>
                      <p className="text-muted-foreground text-sm">
                        Learn how to integrate API keys in your app
                      </p>
                    </div>
                  </div>
                  <HugeiconsIcon
                    className="size-5 text-muted-foreground"
                    icon={ArrowRight01Icon}
                  />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </RequireApp>
  );
}
