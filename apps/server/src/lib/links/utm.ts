type UtmFields = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
};

export function mergeUtmIntoUrl(
  destinationUrl: string,
  utm: UtmFields
): string {
  let url: URL;
  try {
    url = new URL(destinationUrl);
  } catch {
    return destinationUrl;
  }

  const params: [string, string | null][] = [
    ['utm_source', utm.utmSource],
    ['utm_medium', utm.utmMedium],
    ['utm_campaign', utm.utmCampaign],
    ['utm_term', utm.utmTerm],
    ['utm_content', utm.utmContent],
  ];

  for (const [key, value] of params) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}
