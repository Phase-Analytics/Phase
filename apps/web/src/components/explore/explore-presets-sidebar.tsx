'use client';

import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExplorePreset, ExploreQueryV1, ExploreTimeRange } from '@phase/shared';
import { useState } from 'react';
import {
  buildExploreRunQuery,
  isExplorePresetSavable,
  type ExploreQueryDefinition,
} from '@/components/explore/explore-query-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  currentQuery: ExploreQueryDefinition;
  timeRange: ExploreTimeRange;
  onLoadQuery: (query: ExploreQueryV1) => void;
};

export function ExplorePresetsSidebar({
  appId,
  currentQuery,
  timeRange,
  onLoadQuery,
}: ExplorePresetsSidebarProps) {
  const { data, isPending } = useExplorePresets(appId);
  const createPreset = useCreateExplorePreset(appId);
  const deletePreset = useDeleteExplorePreset(appId);
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const trimmedName = presetName.trim();
  const canSave =
    trimmedName.length > 0 &&
    isExplorePresetSavable(trimmedName, currentQuery) &&
    !createPreset.isPending;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);

    if (!trimmedName) {
      setSaveError('Enter a preset name.');
      return;
    }

    if (!isExplorePresetSavable(trimmedName, currentQuery)) {
      setSaveError(
        'Add at least one filter, breakdown, group by, or non-default metric before saving.'
      );
      return;
    }

    await createPreset.mutateAsync({
      appId,
      name: trimmedName,
      query: buildExploreRunQuery(currentQuery, timeRange),
    });
    setPresetName('');
    setSaveOpen(false);
  };

  return (
    <Card className="py-0 lg:h-fit">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-muted-foreground text-sm uppercase">
              Presets
            </h2>
            <p className="text-muted-foreground text-sm">Shared for this app</p>
          </div>
          <Button
            onClick={() => {
              setSaveError(null);
              setSaveOpen(true);
            }}
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
          <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">
            {(data?.presets ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No presets yet. Configure a query and save it.
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
                    className="flex-1 truncate text-left font-sans text-sm"
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
      </CardContent>

      <Dialog
        onOpenChange={(open) => {
          setSaveOpen(open);
          if (!open) {
            setPresetName('');
            setSaveError(null);
          }
        }}
        open={saveOpen}
      >
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Save preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                onChange={(e) => {
                  setPresetName(e.target.value);
                  setSaveError(null);
                }}
                placeholder="Preset name"
                value={presetName}
              />
              {saveError ? (
                <p className="text-destructive text-sm">{saveError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                onClick={() => setSaveOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!canSave} type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
