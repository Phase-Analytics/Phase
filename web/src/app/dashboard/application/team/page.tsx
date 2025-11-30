'use client';

import {
  AddSquareIcon,
  ArrowRight01Icon,
  BookOpen01Icon,
  UserRemove01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Avatar from 'boring-avatars';
import Link from 'next/link';
import { useQueryState } from 'nuqs';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { RequireApp } from '@/components/require-app';
import { AvatarFallback, Avatar as UIAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useApp, useAppTeam } from '@/lib/queries';

export default function TeamPage() {
  const [appId] = useQueryState('app');
  const { data: app, isPending: appLoading } = useApp(appId || '');
  const { data: teamData, isPending: teamLoading } = useAppTeam(appId || '');

  const isOwner = app?.role === 'owner';
  const showLoading = appLoading || teamLoading;

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">Team</h1>
          <p className="text-muted-foreground text-sm">
            Manage your application team members
          </p>
        </div>

        <div className="space-y-4">
          <Card className="py-0">
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold text-lg">Owner</h2>
                <p className="text-muted-foreground text-sm">
                  Owner has full control and can manage all settings, API keys,
                  and team members
                </p>
              </div>

              {showLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <UIAvatar className="size-8">
                    <div className="flex h-full w-full items-center justify-center">
                      <Avatar
                        colors={[
                          '#92A1C6',
                          '#146A7C',
                          '#F0AB3D',
                          '#C271B4',
                          '#C20D90',
                        ]}
                        name={teamData?.owner.email || 'Owner'}
                        size={32}
                        variant="marble"
                      />
                    </div>
                    <AvatarFallback className="bg-transparent" />
                  </UIAvatar>
                  <div className="min-w-0 flex-1">
                    {teamData?.owner.name && (
                      <p className="truncate font-medium text-sm">
                        {teamData.owner.name}
                      </p>
                    )}
                    <p
                      className={`truncate text-xs ${teamData?.owner.name ? 'text-muted-foreground' : 'font-medium text-sm'}`}
                    >
                      {teamData?.owner.email}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">Team Members</h2>
                  <p className="text-muted-foreground text-sm">
                    Members can view analytics and reports but cannot modify
                    settings
                  </p>
                </div>
                {!showLoading && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="w-full sm:w-auto"
                        tabIndex={isOwner ? undefined : 0}
                      >
                        <AddMemberDialog appId={appId || ''}>
                          <Button
                            className="w-full sm:w-auto"
                            disabled={!isOwner}
                            size="sm"
                            type="button"
                          >
                            <HugeiconsIcon
                              className="mr-1.5 size-3"
                              icon={AddSquareIcon}
                            />
                            Add Member
                          </Button>
                        </AddMemberDialog>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Owner only</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {showLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              )}

              {!showLoading &&
                teamData?.members &&
                teamData.members.length > 0 && (
                  <div className="space-y-2">
                    {teamData.members.map((member) => (
                      <div
                        className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                        key={member.userId}
                      >
                        <div className="flex items-center gap-3">
                          <UIAvatar className="size-8">
                            <div className="flex h-full w-full items-center justify-center">
                              <Avatar
                                name={member.email}
                                size={32}
                                variant="marble"
                              />
                            </div>
                            <AvatarFallback className="bg-transparent" />
                          </UIAvatar>
                          <div className="min-w-0 flex-1">
                            {member.name && (
                              <p className="truncate font-medium text-sm">
                                {member.name}
                              </p>
                            )}
                            <p
                              className={`truncate text-xs ${member.name ? 'text-muted-foreground' : 'font-medium text-sm'}`}
                            >
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          {isOwner ? (
                            <RemoveMemberDialog
                              appId={appId || ''}
                              email={member.email}
                              userId={member.userId}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block w-full sm:inline-block sm:w-auto">
                                  <Button
                                    className="w-full sm:w-auto"
                                    disabled
                                    size="sm"
                                    type="button"
                                    variant="destructive"
                                  >
                                    <HugeiconsIcon
                                      className="mr-1.5 size-3"
                                      icon={UserRemove01Icon}
                                    />
                                    Remove
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Owner only</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {!showLoading &&
                (!teamData?.members || teamData.members.length === 0) && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">
                      No team members yet. Add members to collaborate on this
                      application.
                    </p>
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
                      <h3 className="font-semibold">Team Management</h3>
                      <p className="text-muted-foreground text-sm">
                        Learn about roles and permissions
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
