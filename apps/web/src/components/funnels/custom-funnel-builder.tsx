'use client';

import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  type FunnelCustomStep,
  type FunnelDefinition,
  type FunnelResult,
} from '@phase/shared';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FunnelVisualization } from '@/components/funnels/funnel-visualization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useCreateFunnelPreset,
  useDeleteFunnelPreset,
  useFunnelPresets,
  useRunCustomFunnel,
  useUpdateFunnelPreset,
} from '@/lib/queries';

type DraftStep = FunnelCustomStep & { id: string };

function createDraftStep(
  step?: Partial<FunnelCustomStep>,
  index = 0
): DraftStep {
  return {
    id: `step-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: step?.name ?? '',
    kind: step?.kind ?? 'event',
  };
}

function defaultDraftSteps(): DraftStep[] {
  return [createDraftStep({}, 0), createDraftStep({}, 1)];
}

type CustomFunnelBuilderProps = {
  appId: string;
};

export function CustomFunnelBuilder({ appId }: CustomFunnelBuilderProps) {
  const { data: presetsData, isLoading: presetsLoading } =
    useFunnelPresets(appId);
  const runFunnel = useRunCustomFunnel();
  const createPreset = useCreateFunnelPreset(appId);
  const updatePreset = useUpdateFunnelPreset(appId);
  const deletePreset = useDeleteFunnelPreset(appId);

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [steps, setSteps] = useState<DraftStep[]>(defaultDraftSteps);
  const [windowHours, setWindowHours] = useState(168);
  const [result, setResult] = useState<FunnelResult | undefined>();
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const presets = presetsData?.funnels ?? [];
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
    [presets, selectedPresetId]
  );

  useEffect(() => {
    if (!selectedPreset) {
      return;
    }
    setSteps(
      selectedPreset.steps.map((step, index) => createDraftStep(step, index))
    );
    setWindowHours(selectedPreset.windowHours);
    setResult(undefined);
  }, [selectedPreset]);

  const validSteps = steps
    .map((step) => ({
      name: step.name.trim(),
      kind: step.kind,
    }))
    .filter((step) => step.name.length > 0);

  const canRun =
    validSteps.length >= FUNNEL_MIN_STEPS &&
    validSteps.length <= FUNNEL_MAX_STEPS &&
    !runFunnel.isPending;

  const loadPreset = (preset: FunnelDefinition) => {
    setSelectedPresetId(preset.id);
  };

  const clearPreset = () => {
    setSelectedPresetId(null);
    setSteps(defaultDraftSteps());
    setWindowHours(168);
    setResult(undefined);
  };

  const handleRun = async () => {
    if (!canRun) {
      return;
    }
    try {
      const data = await runFunnel.mutateAsync({
        appId,
        steps: validSteps,
        windowHours,
      });
      setResult(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to run funnel'
      );
    }
  };

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name || validSteps.length < FUNNEL_MIN_STEPS) {
      return;
    }

    try {
      if (selectedPreset) {
        await updatePreset.mutateAsync({
          id: selectedPreset.id,
          name,
          steps: validSteps,
          windowHours,
        });
        toast.success('Funnel updated');
      } else {
        const created = await createPreset.mutateAsync({
          appId,
          name,
          steps: validSteps,
          windowHours,
        });
        setSelectedPresetId(created.id);
        toast.success('Funnel saved');
      }
      setSaveOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save funnel'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePreset.mutateAsync(id);
      if (selectedPresetId === id) {
        clearPreset();
      }
      toast.success('Funnel deleted');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete funnel'
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Custom funnel</CardTitle>
            <p className="mt-1 text-muted-foreground text-sm">
              Ordered event or screen steps within a conversion window
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={presetsLoading} variant="outline">
                  {selectedPreset ? selectedPreset.name : 'Saved funnels'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {presets.length === 0 ? (
                  <DropdownMenuItem disabled>No saved funnels</DropdownMenuItem>
                ) : (
                  presets.map((preset) => (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => loadPreset(preset)}
                    >
                      {preset.name}
                    </DropdownMenuItem>
                  ))
                )}
                {selectedPreset ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={clearPreset}>
                      New funnel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(selectedPreset.id)}
                    >
                      Delete current
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              disabled={validSteps.length < FUNNEL_MIN_STEPS}
              onClick={() => {
                setSaveName(selectedPreset?.name ?? '');
                setSaveOpen(true);
              }}
              variant="outline"
            >
              {selectedPreset ? 'Update' : 'Save'}
            </Button>
            <Button disabled={!canRun} onClick={handleRun}>
              {runFunnel.isPending ? (
                <Spinner className="size-4" />
              ) : (
                'Run funnel'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 text-sm">
              <div className="text-muted-foreground">Window (hours)</div>
              <Input
                className="w-28"
                max={24 * 30}
                min={1}
                onChange={(event) =>
                  setWindowHours(
                    Math.max(
                      1,
                      Math.min(24 * 30, Number(event.target.value) || 1)
                    )
                  )
                }
                type="number"
                value={windowHours}
              />
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div className="flex flex-wrap items-center gap-2" key={step.id}>
                <span className="w-6 text-muted-foreground text-sm tabular-nums">
                  {index + 1}.
                </span>
                <Input
                  className="min-w-[180px] flex-1"
                  onChange={(event) => {
                    const value = event.target.value;
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === step.id ? { ...item, name: value } : item
                      )
                    );
                  }}
                  placeholder={
                    step.kind === 'screen' ? 'Screen name' : 'Event name'
                  }
                  value={step.name}
                />
                <div className="flex rounded-md border p-0.5">
                  <Button
                    className="h-8 px-2.5"
                    onClick={() =>
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === step.id
                            ? { ...item, kind: 'event' }
                            : item
                        )
                      )
                    }
                    size="sm"
                    type="button"
                    variant={step.kind === 'event' ? 'secondary' : 'ghost'}
                  >
                    Event
                  </Button>
                  <Button
                    className="h-8 px-2.5"
                    onClick={() =>
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === step.id
                            ? { ...item, kind: 'screen' }
                            : item
                        )
                      )
                    }
                    size="sm"
                    type="button"
                    variant={step.kind === 'screen' ? 'secondary' : 'ghost'}
                  >
                    Screen
                  </Button>
                </div>
                <Button
                  disabled={steps.length <= FUNNEL_MIN_STEPS}
                  onClick={() =>
                    setSteps((current) =>
                      current.filter((item) => item.id !== step.id)
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={Delete02Icon} />
                </Button>
              </div>
            ))}
          </div>

          <Button
            disabled={steps.length >= FUNNEL_MAX_STEPS}
            onClick={() =>
              setSteps((current) => [
                ...current,
                createDraftStep({}, current.length),
              ])
            }
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={Add01Icon} />
            Add step
          </Button>
        </CardContent>
      </Card>

      {(result || runFunnel.isPending) && (
        <FunnelVisualization
          description="Users who completed each step in order within the window"
          isLoading={runFunnel.isPending}
          result={result}
          title="Custom funnel results"
        />
      )}

      <Dialog onOpenChange={setSaveOpen} open={saveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPreset ? 'Update funnel' : 'Save funnel'}
            </DialogTitle>
            <DialogDescription>
              Save this step sequence so you can rerun it later.
            </DialogDescription>
          </DialogHeader>
          <Input
            onChange={(event) => setSaveName(event.target.value)}
            placeholder="Funnel name"
            value={saveName}
          />
          <DialogFooter>
            <Button onClick={() => setSaveOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={
                !saveName.trim() ||
                createPreset.isPending ||
                updatePreset.isPending
              }
              onClick={handleSave}
            >
              {createPreset.isPending || updatePreset.isPending ? (
                <Spinner className="size-4" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
