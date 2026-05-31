'use client';

import { Input } from '@/components/ui/input';

export type LinkUtmValues = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

type LinkUtmFieldsProps = {
  values: LinkUtmValues;
  onChange: (values: LinkUtmValues) => void;
};

export function LinkUtmFields({ values, onChange }: LinkUtmFieldsProps) {
  const set =
    (key: keyof LinkUtmValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...values, [key]: e.target.value });
    };

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">UTM parameters</p>
      <p className="text-muted-foreground text-xs">
        Applied on redirect. Override duplicate keys on the destination URL.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="utm_source">
            utm_source
          </label>
          <Input
            id="utm_source"
            onChange={set('utmSource')}
            placeholder="newsletter"
            value={values.utmSource}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="utm_medium">
            utm_medium
          </label>
          <Input
            id="utm_medium"
            onChange={set('utmMedium')}
            placeholder="email"
            value={values.utmMedium}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="utm_campaign">
            utm_campaign
          </label>
          <Input
            id="utm_campaign"
            onChange={set('utmCampaign')}
            placeholder="spring_sale"
            value={values.utmCampaign}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="utm_term">
            utm_term
          </label>
          <Input
            id="utm_term"
            onChange={set('utmTerm')}
            value={values.utmTerm}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="font-medium text-sm" htmlFor="utm_content">
            utm_content
          </label>
          <Input
            id="utm_content"
            onChange={set('utmContent')}
            value={values.utmContent}
          />
        </div>
      </div>
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
