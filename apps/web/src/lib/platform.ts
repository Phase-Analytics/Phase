export type Platform = 'mac' | 'windows' | 'linux' | 'other';

export function getPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'other';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'mac';
  }

  if (platform.includes('win') || userAgent.includes('win')) {
    return 'windows';
  }

  if (
    platform.includes('linux') ||
    userAgent.includes('linux') ||
    userAgent.includes('x11')
  ) {
    return 'linux';
  }

  return 'other';
}

export function isMac(): boolean {
  return getPlatform() === 'mac';
}

export function isDesktop(): boolean {
  const platform = getPlatform();
  return platform === 'mac' || platform === 'windows' || platform === 'linux';
}

export function getModifierKey(): '⌘' | 'Ctrl' | null {
  if (!isDesktop()) {
    return null;
  }
  return isMac() ? '⌘' : 'Ctrl';
}

export function getAltKey(): '⌥' | 'Alt' | null {
  if (!isDesktop()) {
    return null;
  }
  return isMac() ? '⌥' : 'Alt';
}
