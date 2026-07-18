'use client';

import {
  ArrowUpRight01Icon,
  CloudIcon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { LinkDomainDnsRecord } from '@phase/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';

export const LINK_CNAME_TARGET = 'cname.phase.sh';
const CLOUDFLARE_DNS_URL =
  'https://dash.cloudflare.com/?to=/:account/:zone/dns/records';

type LinkDnsSetupCardProps = {
  hostname: string;
  records?: LinkDomainDnsRecord[];
};

export function LinkDnsSetupCard({
  hostname,
  records = [],
}: LinkDnsSetupCardProps) {
  const requiredRecords = records.filter((record) => record.required);
  const dnsRecords =
    requiredRecords.length > 0
      ? requiredRecords
      : [
          {
            type: 'CNAME' as const,
            name: hostname,
            value: LINK_CNAME_TARGET,
            purpose: 'routing' as const,
            required: true,
            status: 'pending' as const,
          },
        ];

  return (
    <Card className="border-blue-500/50 bg-blue-500/5 py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <HugeiconsIcon
              className="size-5 text-blue-600 dark:text-blue-400"
              icon={InformationCircleIcon}
            />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">DNS setup</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Add every required record. Ownership and certificate records are
              unique to this hostname.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-orange-500/25 bg-orange-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <HugeiconsIcon className="size-4" icon={CloudIcon} />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm">Using Cloudflare DNS?</p>
              <p className="text-muted-foreground text-xs">
                Open your DNS records and add the values below.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0" size="sm" variant="outline">
            <a
              href={CLOUDFLARE_DNS_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open Cloudflare DNS
              <HugeiconsIcon className="size-4" icon={ArrowUpRight01Icon} />
            </a>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-background/80">
          <div className="min-w-[42rem]">
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b px-3 py-2 text-xs">
              <span className="font-medium text-muted-foreground uppercase tracking-wide">
                Type
              </span>
              <span className="font-medium text-muted-foreground uppercase tracking-wide">
                Name
              </span>
              <span className="font-medium text-muted-foreground uppercase tracking-wide">
                Value
              </span>
            </div>
            {dnsRecords.map((record) => (
              <div
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b px-3 py-3 font-mono text-sm last:border-b-0"
                key={`${record.type}:${record.name}:${record.value}`}
              >
                <div>
                  <span>{record.type}</span>
                  <p className="font-sans text-[10px] text-muted-foreground capitalize">
                    {record.purpose}
                  </p>
                </div>
                <div className="flex min-w-0 items-start gap-1">
                  <span className="break-all">{record.name}</span>
                  <CopyButton content={record.name} size="xs" variant="ghost" />
                </div>
                <div className="flex min-w-0 items-start gap-1">
                  <span className="break-all">{record.value}</span>
                  <CopyButton
                    content={record.value}
                    size="xs"
                    variant="ghost"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Hostname:{' '}
          <span className="font-mono text-foreground">{hostname}</span>
        </p>
      </CardContent>
    </Card>
  );
}
