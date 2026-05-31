'use client';

import type { LinkDomain } from '@phase/shared';
import { Checkbox } from '@/components/ui/checkbox';

type LinkDomainBindingsFieldProps = {
  domains: LinkDomain[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function LinkDomainBindingsField({
  domains,
  selectedIds,
  onChange,
}: LinkDomainBindingsFieldProps) {
  const verified = domains.filter((d) => d.status === 'verified');

  if (verified.length === 0) {
    return (
      <div className="space-y-2">
        <p className="font-medium text-sm">Custom domains</p>
        <p className="text-muted-foreground text-sm">
          No verified domains. Add one under Link → Domains.
        </p>
      </div>
    );
  }

  const toggle = (domainId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, domainId]);
      return;
    }
    onChange(selectedIds.filter((id) => id !== domainId));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-sm">Custom domains</p>
        <p className="text-muted-foreground text-xs">
          Leave all unchecked to allow every verified domain. Select specific
          domains to restrict this link.
        </p>
      </div>
      <ul className="space-y-2">
        {verified.map((domain) => {
          const checked = selectedIds.includes(domain.id);
          return (
            <li className="flex items-center gap-2" key={domain.id}>
              <Checkbox
                checked={checked}
                id={`domain-${domain.id}`}
                onCheckedChange={(value) => toggle(domain.id, value === true)}
              />
              <label
                className="cursor-pointer text-sm"
                htmlFor={`domain-${domain.id}`}
              >
                {domain.hostname}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
