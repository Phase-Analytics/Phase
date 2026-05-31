'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LinkDnsSetupCard } from '@/components/links/link-dns-setup-card';

type LinkDomainDnsDialogProps = {
  hostname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LinkDomainDnsDialog({
  hostname,
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

        <LinkDnsSetupCard hostname={hostname} />

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
