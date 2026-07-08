'use client';

import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FUNNEL_BUILTIN_STEPS,
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  type FunnelCustomStep,
  type FunnelDefinition,
  type FunnelStepKind,
  funnelStepLabel,
} from '@phase/shared';
import { useEffect, useState } from 'react';
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
import { useCreateFunnelPreset, useUpdateFunnelPreset } from '@/lib/queries';

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{preset ? 'Edit funnel' : 'Create funnel'}</DialogTitle>
          <DialogDescription>
            Ordered steps with First Seen, Create Session, or custom events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <div className="text-muted-foreground text-sm">Name</div>
            <Input
              onChange={(event) => setName(event.target.value)}
              placeholder="Onboarding"
              value={name}
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-muted-foreground text-sm">Window (hours)</div>
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

          <div className="space-y-3">
            <div className="text-muted-foreground text-sm">Steps</div>
            {steps.map((step, index) => (
              <div className="space-y-2 rounded-lg border p-3" key={step.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-sm tabular-nums">
                    Step {index + 1}
                  </span>
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

                <div className="flex flex-wrap gap-1">
                  {FUNNEL_BUILTIN_STEPS.map((builtin) => (
                    <Button
                      key={builtin.kind}
                      onClick={() => setStepKind(step.id, builtin.kind)}
                      size="sm"
                      type="button"
                      variant={
                        step.kind === builtin.kind ? 'secondary' : 'outline'
                      }
                    >
                      {builtin.label}
                    </Button>
                  ))}
                  <Button
                    onClick={() => setStepKind(step.id, 'event')}
                    size="sm"
                    type="button"
                    variant={step.kind === 'event' ? 'secondary' : 'outline'}
                  >
                    Event
                  </Button>
                </div>

                {step.kind === 'event' ? (
                  <Input
                    onChange={(event) => {
                      const value = event.target.value;
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === step.id ? { ...item, name: value } : item
                        )
                      );
                    }}
                    placeholder="Event name"
                    value={step.name ?? ''}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {funnelStepLabel(step)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Button
            disabled={steps.length >= FUNNEL_MAX_STEPS}
            onClick={() =>
              setSteps((current) => [
                ...current,
                createDraftStep({ kind: 'event' }, current.length),
              ])
            }
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={Add01Icon} />
            Add step
          </Button>
        </div>

        <DialogFooter>
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
