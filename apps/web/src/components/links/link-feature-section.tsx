'use client';

import { Switch } from '@/components/ui/switch';

type LinkFeatureSectionProps = {
  title: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: React.ReactNode;
};

export function LinkFeatureSection({
  title,
  enabled,
  onEnabledChange,
  children,
}: LinkFeatureSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-sm">{title}</p>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      {enabled ? children : null}
    </div>
  );
}
