// Whole-segment identifiers collapse to :id so screen names group by route.
// Matching per segment keeps names such as /2fa or /v2 intact.
const ID_SEGMENT_PATTERNS = [
  /^\d+$/,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^[0-9a-f]{16,}$/i,
  /^[0-7][0-9a-hjkmnp-tv-z]{25}$/i,
];

const QUERY_OR_FRAGMENT = /[?#]/;

function isIdSegment(segment: string): boolean {
  return ID_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment));
}

export function normalizePath(path: string): string {
  const [withoutQuery = ''] = path.split(QUERY_OR_FRAGMENT, 1);
  const segments = withoutQuery
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => (isIdSegment(segment) ? ':id' : segment.toLowerCase()));

  if (segments.length === 0) {
    return '/';
  }
  // Screen names without a leading slash (e.g. "Home") keep that form.
  const prefix = withoutQuery.startsWith('/') ? '/' : '';
  return `${prefix}${segments.join('/')}`;
}
