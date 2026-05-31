import {
  AndroidIcon,
  AnonymousIcon,
  AppleFinderIcon,
  AppleIcon,
  CommandIcon,
  WindowsOldIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { normalizeOsKey } from '@phase/shared';

export function getLinkOsIcon(key: string): IconSvgElement {
  switch (normalizeOsKey(key)) {
    case 'windows':
      return WindowsOldIcon;
    case 'macos':
      return AppleFinderIcon;
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    case 'linux':
      return CommandIcon;
    default:
      return AnonymousIcon;
  }
}
