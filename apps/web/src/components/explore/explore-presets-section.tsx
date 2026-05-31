'use client';

import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type {
  ExplorePreset,
  ExploreQueryV1,
  ExploreTimeRange,
} from '@phase/shared';
import { useState } from 'react';
import { PresetNameDialog } from '@/components/explore/explore-preset-dialogs';
import {
  buildExploreRunQuery,
  type ExploreQueryDefinition,
  isExplorePresetSavable,
} from '@/components/explore/explore-query-utils';
import { Button } from '@/components/ui/button';
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

type ExplorePresetsSectionProps = {
  appId: string;
  currentQuery: ExploreQueryDefinition;
  currentSummary: string | null;
  timeRange: ExploreTimeRange;
  onLoadQuery: (query: ExploreQueryV1, summary: string | null) => void;
};

type DialogMode = 'save' | 'rename' | 'duplicate';

const PRESET_SKELETON_KEYS = [
  'preset-skeleton-1',
  'preset-skeleton-2',
  'preset-skeleton-3',
  'preset-skeleton-4',
  'preset-skeleton-5',
  'preset-skeleton-6',
] as const;

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

export function ExplorePresetsSection({
  appId,
  currentQuery,
  currentSummary,
  timeRange,
  onLoadQuery,
}: ExplorePresetsSectionProps) {
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
          summary: currentSummary,
        });
      } else if (dialogMode === 'rename' && targetPreset) {
        await updatePreset.mutateAsync({ id: targetPreset.id, name });
      } else if (dialogMode === 'duplicate' && targetPreset) {
        await createPreset.mutateAsync({
          appId,
          name,
          query: targetPreset.query,
          summary: targetPreset.summary,
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
  const presets = data?.presets ?? [];

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/25 px-4 py-2.5">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Presets
        </p>
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

      <div className="p-4">
        {isPending ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {PRESET_SKELETON_KEYS.map((key) => (
              <Skeleton className="h-[72px] rounded-lg" key={key} />
            ))}
          </div>
        ) : null}
        {!isPending && presets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No presets yet. Generate a query and save it.
          </p>
        ) : null}
        {!isPending && presets.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {presets.map((preset) => (
              <div className="group relative" key={preset.id}>
                <button
                  className={cn(
                    'flex min-h-[72px] w-full flex-col items-start justify-between rounded-lg border bg-background p-3 pr-9 text-left text-sm shadow-xs transition-colors hover:bg-muted/40',
                    activeId === preset.id && 'border-primary bg-muted/50'
                  )}
                  onClick={() => {
                    setActiveId(preset.id);
                    onLoadQuery(preset.query, preset.summary);
                  }}
                  type="button"
                >
                  <span className="line-clamp-3 font-medium leading-snug">
                    {preset.name}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="absolute top-1.5 right-1.5 size-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                      onClick={(event) => event.stopPropagation()}
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
            ))}
          </div>
        ) : null}
      </div>

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
    </div>
  );
}
