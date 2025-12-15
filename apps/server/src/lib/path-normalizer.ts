const MULTIPLE_SLASHES_REGEX = /\/+/g;
const NUMERIC_SEGMENTS_REGEX = /\/\d+/g;
const TRAILING_SLASH_REGEX = /\/$/;

export function normalizePath(path: string): string {
  return (
    path
      .split('?')[0]
      .split('#')[0]
      .replace(MULTIPLE_SLASHES_REGEX, '/')
      .replace(NUMERIC_SEGMENTS_REGEX, '/:id')
      .replace(TRAILING_SLASH_REGEX, '')
      .toLowerCase() || '/'
  );
}
