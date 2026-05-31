export function normalizeOsKey(key: string): string {
  const lower = key.trim().toLowerCase();
  if (!key.trim() || lower === 'unknown') {
    return 'unknown';
  }
  if (lower.includes('windows')) {
    return 'windows';
  }
  if (lower === 'ios' || lower.includes('iphone') || lower.includes('ipad')) {
    return 'ios';
  }
  if (lower.includes('android')) {
    return 'android';
  }
  if (lower.includes('mac') || lower.includes('os x')) {
    return 'macos';
  }
  if (lower.includes('linux')) {
    return 'linux';
  }
  return lower;
}

export function getLinkOsLabel(key: string): string {
  switch (normalizeOsKey(key)) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    case 'linux':
      return 'Linux';
    case 'unknown':
      return 'Unknown';
    default:
      return key.trim() || 'Unknown';
  }
}
