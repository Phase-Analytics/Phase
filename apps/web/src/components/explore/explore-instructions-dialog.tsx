'use client';

import { Copy01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EXPLORE_INSTRUCTIONS } from '@/components/explore/explore-instructions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ExploreInstructionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExploreInstructionsDialog({
  open,
  onOpenChange,
}: ExploreInstructionsDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EXPLORE_INSTRUCTIONS);
      setCopied(true);
      toast.success('Instructions copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy instructions');
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Query instructions</DialogTitle>
          <DialogDescription>
            Read-only SQL against events, devices, and sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-auto rounded-lg border bg-muted/20 p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {EXPLORE_INSTRUCTIONS}
          </pre>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
          <Button onClick={handleCopy} type="button">
            <HugeiconsIcon className="size-4" icon={Copy01Icon} />
            {copied ? 'Copied' : 'Copy instructions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
