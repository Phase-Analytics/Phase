export function normalizeReferrerKey(
  referrer: string | null | undefined
): string {
  const trimmed = referrer?.trim();
  if (!trimmed) {
    return 'direct';
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'direct' || lower === '(direct)' || lower === 'null') {
    return 'direct';
  }

  return trimmed;
}

export function getLinkReferrerLabel(key: string): string {
  if (normalizeReferrerKey(key) === 'direct') {
    return 'Direct';
  }

  return key.trim();
}

export function trimLinkReferrerDisplay(
  referrer: string | null | undefined,
  maxLength = 48
): string {
  const label = getLinkReferrerLabel(normalizeReferrerKey(referrer));
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}…`;
}
