export function normalizeReferrer(
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
