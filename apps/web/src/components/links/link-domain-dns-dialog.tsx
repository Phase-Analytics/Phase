'use client';

import type { LinkDomainDnsRecord } from '@phase/shared';
import { LinkDnsSetupCard } from '@/components/links/link-dns-setup-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type LinkDomainDnsDialogProps = {
  hostname: string;
  records: LinkDomainDnsRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LinkDomainDnsDialog({
  hostname,
  records,
  open,
  onOpenChange,
}: LinkDomainDnsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>DNS setup</DialogTitle>
          <DialogDescription>
            Configure DNS for <span className="font-medium">{hostname}</span>
          </DialogDescription>
        </DialogHeader>

        <LinkDnsSetupCard hostname={hostname} records={records} />

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
