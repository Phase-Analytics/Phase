'use client';

import {
  AddSquareIcon,
  ArrowRight01Icon,
  BookOpen01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { minidenticon } from 'minidenticons';
import Link from 'next/link';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { RequireApp } from '@/components/require-app';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

  const ownerAvatarSrc = useMemo(
    () =>
      teamData?.owner.email
        ? `data:image/svg+xml;utf8,${encodeURIComponent(
            minidenticon(teamData.owner.email, 55, 45)
          )}`
        : '',
    [teamData?.owner.email]
  );

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
          {/* Owner Section */}
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
                  <Avatar className="size-8">
                    <AvatarImage
                      alt={teamData?.owner.email}
                      src={ownerAvatarSrc}
                    />
                    <AvatarFallback className="bg-transparent" />
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {teamData?.owner.email}
                    </p>
                    <p className="text-muted-foreground text-xs">Owner</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members Section */}
          <Card className="py-0">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">Team Members</h2>
                  <p className="text-muted-foreground text-sm">
                    Members can view analytics and reports but cannot modify
                    settings
                  </p>
                </div>
                {!showLoading && isOwner && (
                  <AddMemberDialog appId={appId || ''}>
                    <Button size="sm" type="button">
                      <HugeiconsIcon
                        className="mr-1.5 size-3"
                        icon={AddSquareIcon}
                      />
                      Add Member
                    </Button>
                  </AddMemberDialog>
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
                    {teamData.members.map((member) => {
                      const memberAvatarSrc = `data:image/svg+xml;utf8,${encodeURIComponent(
                        minidenticon(member.email, 55, 45)
                      )}`;

                      return (
                        <div
                          className="flex items-center justify-between rounded-lg border p-3"
                          key={member.userId}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarImage
                                alt={member.email}
                                src={memberAvatarSrc}
                              />
                              <AvatarFallback className="bg-transparent" />
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {member.email}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Member
                              </p>
                            </div>
                          </div>
                          {isOwner ? (
                            <RemoveMemberDialog
                              appId={appId || ''}
                              email={member.email}
                              userId={member.userId}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    disabled
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    Remove
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Only owners can perform this action
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
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
