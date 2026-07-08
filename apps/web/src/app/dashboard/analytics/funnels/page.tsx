'use client';

import {
  Add01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  type FunnelCustomStep,
  type FunnelDefinition,
  type FunnelResult,
  funnelStepLabel,
} from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { FunnelEditorDialog } from '@/components/funnels/funnel-editor-dialog';
import {
  FunnelVisualization,
  FunnelVisualizationSkeleton,
  formatFunnelPct,
} from '@/components/funnels/funnel-visualization';
import { RequireApp } from '@/components/require-app';
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
  useActivationFunnel,
  useDeleteFunnelPreset,
  useFunnelPresets,
  useRunCustomFunnel,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

const ACTIVATION_ID = 'activation';

function ignoreAsyncError() {
  return;
}

function stepSummary(steps: FunnelCustomStep[]): string {
  return steps.map((step) => funnelStepLabel(step)).join(' → ');
}

function FunnelsPageContent({ appId }: { appId: string }) {
  const { data: activation, isLoading: activationLoading } =
    useActivationFunnel(appId);
  const { data: presetsData, isPending: presetsLoading } =
    useFunnelPresets(appId);
  const deletePreset = useDeleteFunnelPreset(appId);
  const runCustom = useRunCustomFunnel();

  const [selectedId, setSelectedId] = useState<string>(ACTIVATION_ID);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<FunnelDefinition | null>(
    null
  );
  const [customResults, setCustomResults] = useState<
    Record<string, FunnelResult>
  >({});
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

  const presets = presetsData?.funnels ?? [];
  const _selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedId) ?? null,
    [presets, selectedId]
  );

  const selectActivation = () => {
    setSelectedId(ACTIVATION_ID);
    setLoadingPresetId(null);
  };

  const selectPreset = async (preset: FunnelDefinition) => {
    setSelectedId(preset.id);
    if (customResults[preset.id]) {
      return;
    }
    setLoadingPresetId(preset.id);
    try {
      const result = await runCustom.mutateAsync({
        appId,
        steps: preset.steps,
        windowHours: preset.windowHours,
      });
      setCustomResults((current) => ({
        ...current,
        [preset.id]: result,
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to run funnel'
      );
    } finally {
      setLoadingPresetId(null);
    }
  };

  const openCreate = () => {
    setEditingPreset(null);
    setEditorOpen(true);
  };

  const openEdit = (preset: FunnelDefinition) => {
    setEditingPreset(preset);
    setEditorOpen(true);
  };

  const handleDelete = async (preset: FunnelDefinition) => {
    try {
      await deletePreset.mutateAsync(preset.id);
      setCustomResults((current) => {
        const next = { ...current };
        delete next[preset.id];
        return next;
      });
      if (selectedId === preset.id) {
        selectActivation();
      }
      toast.success('Funnel deleted');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete funnel'
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardPageHeader
        actions={
          <Button onClick={openCreate} type="button">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Create funnel
          </Button>
        }
        description="Measure conversion through activation and custom event paths"
        title="Funnels"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          className={cn(
            'rounded-xl border bg-card p-4 text-left shadow-[var(--shadow-elevated),var(--highlight)] transition-colors hover:bg-muted/30',
            selectedId === ACTIVATION_ID && 'border-primary bg-muted/40'
          )}
          onClick={selectActivation}
          type="button"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">Activation</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Built-in · 72h engagement window
              </p>
            </div>
            <p className="font-medium text-sm tabular-nums">
              {activationLoading
                ? '…'
                : formatFunnelPct(activation?.overallConversion ?? 0)}
            </p>
          </div>
        </button>

        {presetsLoading
          ? ['a', 'b', 'c'].map((key) => (
              <Skeleton className="h-[88px] rounded-xl" key={key} />
            ))
          : null}

        {presets.map((preset) => (
          <div className="group relative" key={preset.id}>
            <button
              className={cn(
                'h-full w-full rounded-xl border bg-card p-4 pr-10 text-left shadow-[var(--shadow-elevated),var(--highlight)] transition-colors hover:bg-muted/30',
                selectedId === preset.id && 'border-primary bg-muted/40'
              )}
              onClick={() => {
                selectPreset(preset).catch(ignoreAsyncError);
              }}
              type="button"
            >
              <p className="font-medium">{preset.name}</p>
              <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                {stepSummary(preset.steps)}
              </p>
              <p className="mt-2 text-muted-foreground text-xs">
                {preset.windowHours}h window
              </p>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="absolute top-2 right-2 size-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(preset)}>
                  <HugeiconsIcon icon={PencilEdit02Icon} />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    handleDelete(preset).catch(ignoreAsyncError);
                  }}
                >
                  <HugeiconsIcon icon={Delete02Icon} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        <button
          className="flex min-h-[88px] items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 p-4 text-muted-foreground text-sm transition-colors hover:bg-muted/30 hover:text-foreground"
          onClick={openCreate}
          type="button"
        >
          <HugeiconsIcon className="size-4" icon={Add01Icon} />
          Create funnel
        </button>
      </div>

      {selectedId === ACTIVATION_ID && activationLoading ? (
        <FunnelVisualizationSkeleton />
      ) : null}
      {selectedId === ACTIVATION_ID && !activationLoading ? (
        <FunnelVisualization result={activation} />
      ) : null}
      {selectedId !== ACTIVATION_ID && loadingPresetId === selectedId ? (
        <FunnelVisualizationSkeleton />
      ) : null}
      {selectedId !== ACTIVATION_ID && loadingPresetId !== selectedId ? (
        <FunnelVisualization result={customResults[selectedId]} />
      ) : null}

      <FunnelEditorDialog
        appId={appId}
        onOpenChange={setEditorOpen}
        onSaved={(saved) => {
          setCustomResults((current) => {
            const next = { ...current };
            delete next[saved.id];
            return next;
          });
          selectPreset(saved).catch(ignoreAsyncError);
        }}
        open={editorOpen}
        preset={editingPreset}
      />
    </div>
  );
}

export default function FunnelsPage() {
  const [appId] = useQueryState('app', parseAsString);

  return (
    <RequireApp>
      {appId ? <FunnelsPageContent appId={appId} /> : null}
    </RequireApp>
  );
}
