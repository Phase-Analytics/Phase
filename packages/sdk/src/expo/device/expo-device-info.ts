import { Dimensions, PixelRatio, Platform } from 'react-native';
import type {
  DeviceInfo,
  DeviceType,
  Platform as PlatformType,
} from '../../core/types';

export function getExpoDeviceInfo(): DeviceInfo {
  return {
    deviceType: getDeviceType(),
    osVersion: getOsVersion(),
    platform: getPlatform(),
    locale: getLocale(),
  };
}

function getDeviceType(): DeviceType | null {
  try {
    const Constants = require('expo-constants').default;

    if (Constants.deviceType !== undefined) {
      switch (Constants.deviceType) {
        case 0:
          return 'unknown';
        case 1:
          return 'phone';
        case 2:
          return 'tablet';
        case 3:
          return 'desktop';
        default:
          return 'unknown';
      }
    }

    const { width, height } = Dimensions.get('window');
    const pixelRatio = PixelRatio.get();
    const dipWidth = width / pixelRatio;
    const dipHeight = height / pixelRatio;
    const diagonal = Math.sqrt(dipWidth * dipWidth + dipHeight * dipHeight);
    return diagonal > 600 ? 'tablet' : 'phone';
  } catch {
    return null;
  }
}

function getOsVersion(): string | null {
  try {
    const version = Platform.Version;
    return typeof version === 'number' ? version.toString() : version;
  } catch {
    return null;
  }
}

function getPlatform(): PlatformType | null {
  try {
    const os = Platform.OS;
    if (os === 'ios' || os === 'android') {
      return os;
    }
    return 'unknown';
  } catch {
    return null;
  }
}

function getLocale(): string | null {
  try {
    const Localization = require('expo-localization');
    return Localization.locale || Localization.locales?.[0] || null;
  } catch {
    return null;
  }
}
