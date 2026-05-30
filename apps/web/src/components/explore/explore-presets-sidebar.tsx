'use client';

import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExplorePreset, ExploreQueryV1 } from '@phase/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCreateExplorePreset,
  useDeleteExplorePreset,
  useExplorePresets,
} from '@/lib/queries/use-explore';
import { cn } from '@/lib/utils';

type ExplorePresetsSidebarProps = {
  appId: string;
  currentQuery: ExploreQueryV1;
  onLoadQuery: (query: ExploreQueryV1) => void;
};

export function ExplorePresetsSidebar({
  appId,
  currentQuery,
  onLoadQuery,
}: ExplorePresetsSidebarProps) {
  const { data, isPending } = useExplorePresets(appId);
  const createPreset = useCreateExplorePreset(appId);
  const deletePreset = useDeleteExplorePreset(appId);
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleSave = async () => {
    const name = presetName.trim();
    if (!name) {
      return;
    }
    await createPreset.mutateAsync({
      appId,
      name,
      query: currentQuery,
    });
    setPresetName('');
    setSaveOpen(false);
  };

  return (
    <div className="flex h-full flex-col gap-3 border-r pr-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm">Presets</p>
        <Button
          onClick={() => setSaveOpen(true)}
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeiconsIcon className="size-4" icon={Add01Icon} />
          Save
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {(data?.presets ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No presets yet. Save the current query.
            </p>
          ) : (
            (data?.presets ?? []).map((preset: ExplorePreset) => (
              <div
                className={cn(
                  'group flex items-center gap-1 rounded-md border px-2 py-1.5',
                  activeId === preset.id && 'border-primary bg-muted/50'
                )}
                key={preset.id}
              >
                <button
                  className="flex-1 truncate text-left text-sm"
                  onClick={() => {
                    setActiveId(preset.id);
                    onLoadQuery(preset.query);
                  }}
                  type="button"
                >
                  {preset.name}
                </button>
                <Button
                  className="size-7 opacity-0 group-hover:opacity-100"
                  onClick={() => deletePreset.mutate(preset.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={Delete02Icon} />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog onOpenChange={setSaveOpen} open={saveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save preset</DialogTitle>
          </DialogHeader>
          <Input
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name"
            value={presetName}
          />
          <DialogFooter>
            <Button onClick={() => setSaveOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!presetName.trim() || createPreset.isPending}
              onClick={handleSave}
              type="button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
