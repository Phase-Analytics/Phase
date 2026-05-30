'use client';

import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExplorePreset, ExploreQueryV1, ExploreTimeRange } from '@phase/shared';
import { useState } from 'react';
import {
  buildExploreRunQuery,
  isExplorePresetSavable,
  type ExploreQueryDefinition,
} from '@/components/explore/explore-query-utils';
import { PresetNameDialog } from '@/components/explore/explore-preset-dialogs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCreateExplorePreset,
  useDeleteExplorePreset,
  useExplorePresets,
  useUpdateExplorePreset,
} from '@/lib/queries/use-explore';
import { cn } from '@/lib/utils';

type ExplorePresetsSidebarProps = {
  appId: string;
  currentQuery: ExploreQueryDefinition;
  timeRange: ExploreTimeRange;
  onLoadQuery: (query: ExploreQueryV1) => void;
};

type DialogMode = 'save' | 'rename' | 'duplicate';

function uniqueDuplicateName(base: string, existing: string[]): string {
  const trimmed = base.trim();
  let candidate = `${trimmed} (copy)`;
  let index = 2;
  const names = new Set(existing.map((name) => name.toLowerCase()));
  while (names.has(candidate.toLowerCase())) {
    candidate = `${trimmed} (copy ${index})`;
    index += 1;
  }
  return candidate;
}

export function ExplorePresetsSidebar({
  appId,
  currentQuery,
  timeRange,
  onLoadQuery,
}: ExplorePresetsSidebarProps) {
  const { data, isPending } = useExplorePresets(appId);
  const createPreset = useCreateExplorePreset(appId);
  const updatePreset = useUpdateExplorePreset(appId);
  const deletePreset = useDeleteExplorePreset(appId);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [dialogName, setDialogName] = useState('');
  const [targetPreset, setTargetPreset] = useState<ExplorePreset | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const presetNames = (data?.presets ?? []).map((preset) => preset.name);

  const openDialog = (mode: DialogMode, preset?: ExplorePreset) => {
    setSaveError(null);
    setDialogMode(mode);
    setTargetPreset(preset ?? null);

    if (mode === 'save') {
      setDialogName('');
    } else if (mode === 'rename' && preset) {
      setDialogName(preset.name);
    } else if (mode === 'duplicate' && preset) {
      setDialogName(uniqueDuplicateName(preset.name, presetNames));
    }
  };

  const handleDialogSubmit = async (name: string) => {
    setSaveError(null);

    try {
      if (dialogMode === 'save') {
        if (!isExplorePresetSavable(name, currentQuery)) {
          setSaveError(
            'Add at least one filter, breakdown, group by, or non-default metric before saving.'
          );
          return;
        }
        await createPreset.mutateAsync({
          appId,
          name,
          query: buildExploreRunQuery(currentQuery, timeRange),
        });
      } else if (dialogMode === 'rename' && targetPreset) {
        await updatePreset.mutateAsync({ id: targetPreset.id, name });
      } else if (dialogMode === 'duplicate' && targetPreset) {
        await createPreset.mutateAsync({
          appId,
          name,
          query: targetPreset.query,
        });
      }

      setDialogMode(null);
      setTargetPreset(null);
      setDialogName('');
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save preset'
      );
    }
  };

  const dialogConfig = (() => {
    if (dialogMode === 'rename') {
      return {
        title: 'Rename preset',
        description: undefined,
        submitLabel: 'Save',
      };
    }
    if (dialogMode === 'duplicate') {
      return {
        title: 'Duplicate preset',
        description: 'Create a copy of this preset with a new name.',
        submitLabel: 'Duplicate',
      };
    }
    return {
      title: 'Save preset',
      description: 'Save the current query configuration for your team.',
      submitLabel: 'Save',
    };
  })();

  const isDialogPending = createPreset.isPending || updatePreset.isPending;

  return (
    <Card className="py-0 lg:h-fit">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Presets
          </h2>
          <Button
            onClick={() => openDialog('save')}
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
                No presets yet. Generate a query and save it.
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="size-7 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          className="size-3.5"
                          icon={MoreHorizontalIcon}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openDialog('rename', preset)}
                      >
                        <HugeiconsIcon icon={PencilEdit02Icon} />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDialog('duplicate', preset)}
                      >
                        <HugeiconsIcon icon={Copy01Icon} />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deletePreset.mutate(preset.id)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>

      <PresetNameDialog
        defaultName={dialogName}
        description={dialogConfig.description}
        error={saveError}
        isPending={isDialogPending}
        key={dialogMode ?? 'closed'}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
            setSaveError(null);
            setTargetPreset(null);
          }
        }}
        onSubmit={handleDialogSubmit}
        open={dialogMode !== null}
        submitLabel={dialogConfig.submitLabel}
        title={dialogConfig.title}
      />
    </Card>
  );
}
