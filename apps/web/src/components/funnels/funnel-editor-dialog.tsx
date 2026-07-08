'use client';

import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FUNNEL_BUILTIN_STEPS,
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  FUNNEL_WINDOW_PRESETS,
  type FunnelCustomStep,
  type FunnelDefinition,
  type FunnelStepKind,
  funnelStepLabel,
  isFunnelBuiltinKind,
} from '@phase/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type { TopEventsResponse } from '@/lib/api/types';
import {
  cacheConfig,
  queryKeys,
  useCreateFunnelPreset,
  useUpdateFunnelPreset,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

type DraftStep = FunnelCustomStep & { id: string };

function createDraftStep(
  step?: Partial<FunnelCustomStep>,
  index = 0
): DraftStep {
  const kind: FunnelStepKind = step?.kind ?? 'event';
  return {
    id: `step-${index}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    name: kind === 'event' ? (step?.name ?? '') : undefined,
  };
}

function defaultDraftSteps(): DraftStep[] {
  return [
    createDraftStep({ kind: 'first_seen' }, 0),
    createDraftStep({ kind: 'session' }, 1),
  ];
}

function toApiSteps(steps: DraftStep[]): FunnelCustomStep[] {
  return steps.map((step) => {
    if (step.kind === 'event') {
      return { kind: 'event', name: step.name?.trim() ?? '' };
    }
    return { kind: step.kind };
  });
}

function builtinMeta(kind: FunnelStepKind) {
  return FUNNEL_BUILTIN_STEPS.find((item) => item.kind === kind);
}

type FunnelEditorDialogProps = {
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: FunnelDefinition | null;
  onSaved?: (preset: FunnelDefinition) => void;
};

export function FunnelEditorDialog({
  appId,
  open,
  onOpenChange,
  preset,
  onSaved,
}: FunnelEditorDialogProps) {
  const createPreset = useCreateFunnelPreset(appId);
  const updatePreset = useUpdateFunnelPreset(appId);

  const [name, setName] = useState('');
  const [steps, setSteps] = useState<DraftStep[]>(defaultDraftSteps);
  const [windowHours, setWindowHours] = useState(168);

  const { data: topEvents } = useQuery({
    queryKey: queryKeys.events.top(appId),
    queryFn: () =>
      fetchApi<TopEventsResponse>(
        `/web/events/top${buildQueryString({ appId })}`
      ),
    ...cacheConfig.overview,
    enabled: open && Boolean(appId),
  });

  const suggestedEvents = useMemo(
    () => (topEvents?.events ?? []).slice(0, 8).map((event) => event.name),
    [topEvents?.events]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (preset) {
      setName(preset.name);
      setSteps(preset.steps.map((step, index) => createDraftStep(step, index)));
      setWindowHours(preset.windowHours);
      return;
    }
    setName('');
    setSteps(defaultDraftSteps());
    setWindowHours(168);
  }, [open, preset]);

  const apiSteps = toApiSteps(steps);
  const validSteps = apiSteps.filter((step) => {
    if (step.kind === 'event') {
      return Boolean(step.name?.trim());
    }
    return true;
  });

  const canSave =
    name.trim().length > 0 &&
    validSteps.length >= FUNNEL_MIN_STEPS &&
    validSteps.length === steps.length &&
    !createPreset.isPending &&
    !updatePreset.isPending;

  const isSaving = createPreset.isPending || updatePreset.isPending;
  const saveLabel = preset ? 'Save changes' : 'Create funnel';

  const setStepKind = (id: string, kind: FunnelStepKind) => {
    setSteps((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              kind,
              name: kind === 'event' ? (item.name ?? '') : undefined,
            }
          : item
      )
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        steps: validSteps,
        windowHours,
      };

      const saved = preset
        ? await updatePreset.mutateAsync({ id: preset.id, ...payload })
        : await createPreset.mutateAsync({ appId, ...payload });

      toast.success(preset ? 'Funnel updated' : 'Funnel created');
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save funnel'
      );
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{preset ? 'Edit funnel' : 'Create funnel'}</DialogTitle>
          <DialogDescription>
            Build an ordered path from built-in milestones or your own events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <div className="font-medium text-sm">Name</div>
              <Input
                onChange={(event) => setName(event.target.value)}
                placeholder="Onboarding"
                value={name}
              />
            </div>
            <div className="space-y-1.5">
              <div className="font-medium text-sm">Window</div>
              <div className="flex flex-wrap gap-1.5">
                {FUNNEL_WINDOW_PRESETS.map((presetWindow) => (
                  <Button
                    key={presetWindow.hours}
                    onClick={() => setWindowHours(presetWindow.hours)}
                    size="sm"
                    type="button"
                    variant={
                      windowHours === presetWindow.hours
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {presetWindow.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm">Steps</div>
                <p className="text-muted-foreground text-xs">
                  {steps.length}/{FUNNEL_MAX_STEPS} · users must complete these
                  in order
                </p>
              </div>
              <Button
                disabled={steps.length >= FUNNEL_MAX_STEPS}
                onClick={() =>
                  setSteps((current) => [
                    ...current,
                    createDraftStep({ kind: 'event' }, current.length),
                  ])
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <HugeiconsIcon icon={Add01Icon} />
                Add step
              </Button>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => {
                const meta = builtinMeta(step.kind);
                return (
                  <div
                    className="rounded-xl border bg-muted/20 p-3"
                    key={step.id}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-background font-medium text-xs tabular-nums shadow-xs">
                          {index + 1}
                        </span>
                        <span className="font-medium text-sm">
                          {funnelStepLabel(step)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          disabled={index === 0}
                          onClick={() => moveStep(index, -1)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <HugeiconsIcon icon={ArrowUp01Icon} />
                        </Button>
                        <Button
                          disabled={index === steps.length - 1}
                          onClick={() => moveStep(index, 1)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <HugeiconsIcon icon={ArrowDown01Icon} />
                        </Button>
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
                    </div>

                    <div className="space-y-2">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">
                        Built-in
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {FUNNEL_BUILTIN_STEPS.map((builtin) => (
                          <Button
                            className={cn(
                              'h-auto justify-start px-2.5 py-1.5 text-left',
                              step.kind === builtin.kind && 'border-primary'
                            )}
                            key={builtin.kind}
                            onClick={() => setStepKind(step.id, builtin.kind)}
                            size="sm"
                            type="button"
                            variant={
                              step.kind === builtin.kind
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {builtin.label}
                          </Button>
                        ))}
                        <Button
                          className={cn(
                            'h-auto px-2.5 py-1.5',
                            step.kind === 'event' && 'border-primary'
                          )}
                          onClick={() => setStepKind(step.id, 'event')}
                          size="sm"
                          type="button"
                          variant={
                            step.kind === 'event' ? 'secondary' : 'outline'
                          }
                        >
                          Custom event
                        </Button>
                      </div>

                      {isFunnelBuiltinKind(step.kind) && meta ? (
                        <p className="text-muted-foreground text-xs">
                          {meta.description}
                        </p>
                      ) : null}

                      {step.kind === 'event' ? (
                        <div className="space-y-2">
                          <Input
                            onChange={(event) => {
                              const value = event.target.value;
                              setSteps((current) =>
                                current.map((item) =>
                                  item.id === step.id
                                    ? { ...item, name: value }
                                    : item
                                )
                              );
                            }}
                            placeholder="Event name, e.g. purchase_completed"
                            value={step.name ?? ''}
                          />
                          {suggestedEvents.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {suggestedEvents.map((eventName) => (
                                <Button
                                  key={eventName}
                                  onClick={() =>
                                    setSteps((current) =>
                                      current.map((item) =>
                                        item.id === step.id
                                          ? {
                                              ...item,
                                              kind: 'event',
                                              name: eventName,
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  size="sm"
                                  type="button"
                                  variant={
                                    step.name === eventName
                                      ? 'secondary'
                                      : 'ghost'
                                  }
                                >
                                  {eventName}
                                </Button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={handleSave}>
            {isSaving ? <Spinner className="size-4" /> : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
