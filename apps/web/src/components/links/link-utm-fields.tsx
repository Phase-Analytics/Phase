'use client';

import {
  FilterIcon,
  Globe02Icon,
  Megaphone01Icon,
  Tag01Icon,
  Target01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Input } from '@/components/ui/input';

export type LinkUtmValues = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

type LinkUtmFieldKey = keyof LinkUtmValues;

export const LINK_UTM_FIELDS: Array<{
  key: LinkUtmFieldKey;
  label: string;
  icon: IconSvgElement;
  id: string;
  placeholder?: string;
  fullWidth?: boolean;
}> = [
  {
    key: 'utmSource',
    label: 'Source',
    icon: Globe02Icon,
    id: 'utm_source',
    placeholder: 'newsletter',
  },
  {
    key: 'utmMedium',
    label: 'Medium',
    icon: Megaphone01Icon,
    id: 'utm_medium',
    placeholder: 'email',
  },
  {
    key: 'utmCampaign',
    label: 'Campaign',
    icon: Target01Icon,
    id: 'utm_campaign',
    placeholder: 'spring_sale',
  },
  {
    key: 'utmTerm',
    label: 'Term',
    icon: FilterIcon,
    id: 'utm_term',
  },
  {
    key: 'utmContent',
    label: 'Content',
    icon: Tag01Icon,
    id: 'utm_content',
    fullWidth: true,
  },
];

type LinkUtmFieldsProps = {
  values: LinkUtmValues;
  onChange: (values: LinkUtmValues) => void;
};

export function LinkUtmFields({ values, onChange }: LinkUtmFieldsProps) {
  const set =
    (key: LinkUtmFieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...values, [key]: e.target.value });
    };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LINK_UTM_FIELDS.map((field) => (
        <div
          className={field.fullWidth ? 'space-y-2 sm:col-span-2' : 'space-y-2'}
          key={field.key}
        >
          <label
            className="flex items-center gap-1.5 font-medium text-sm"
            htmlFor={field.id}
          >
            <HugeiconsIcon
              className="size-4 shrink-0 text-muted-foreground"
              icon={field.icon}
            />
            {field.label}
          </label>
          <Input
            id={field.id}
            onChange={set(field.key)}
            placeholder={field.placeholder}
            value={values[field.key]}
          />
        </div>
      ))}
    </div>
  );
}

export function emptyLinkUtmValues(): LinkUtmValues {
  return {
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
  };
}

export function linkUtmToPayload(values: LinkUtmValues) {
  return {
    utmSource: values.utmSource || null,
    utmMedium: values.utmMedium || null,
    utmCampaign: values.utmCampaign || null,
    utmTerm: values.utmTerm || null,
    utmContent: values.utmContent || null,
  };
}

export function linkUtmFromDetail(link: {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}): LinkUtmValues {
  return {
    utmSource: link.utmSource ?? '',
    utmMedium: link.utmMedium ?? '',
    utmCampaign: link.utmCampaign ?? '',
    utmTerm: link.utmTerm ?? '',
    utmContent: link.utmContent ?? '',
  };
}

export function hasLinkUtmValues(values: LinkUtmValues): boolean {
  return Boolean(
    values.utmSource ||
      values.utmMedium ||
      values.utmCampaign ||
      values.utmTerm ||
      values.utmContent
  );
}

export function getLinkUtmDisplayEntries(values: LinkUtmValues) {
  return LINK_UTM_FIELDS.map((field) => ({
    ...field,
    value: values[field.key],
  })).filter((entry) => entry.value);
}
