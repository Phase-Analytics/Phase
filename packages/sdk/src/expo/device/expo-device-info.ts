import { Dimensions, I18nManager, PixelRatio, Platform } from 'react-native';
import type {
  DeviceInfo,
  DeviceType,
  Platform as PlatformType,
} from '../../core/types';

let ExpoDevice: unknown = null;
let ExpoLocalization: unknown = null;

try {
  ExpoDevice = require('expo-device');
} catch {
  // expo-device not available
}

try {
  ExpoLocalization = require('expo-localization');
} catch {
  // expo-localization not available
}

export function getExpoDeviceInfo(): DeviceInfo {
  const model = getModel();
  const fallbackModel = model || getDeviceType();

  return {
    osVersion: getOsVersion(),
    platform: getPlatform(),
    locale: getLocale(),
    model: fallbackModel,
  };
}

function getDeviceType(): DeviceType | null {
  const device = ExpoDevice as Record<string, unknown> | null;
  if (device?.deviceType !== undefined && device?.deviceType !== null) {
    switch (device.deviceType) {
      case 1:
        return 'phone';
      case 2:
        return 'tablet';
      case 3:
        return 'desktop';
      default:
        return null;
    }
  }

  try {
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
    return null;
  } catch {
    return null;
  }
}

function getLocale(): string | null {
  const localization = ExpoLocalization as Record<string, unknown> | null;
  if (
    localization?.getLocales &&
    typeof localization.getLocales === 'function'
  ) {
    try {
      const locales = localization.getLocales() as Array<{
        languageTag?: string;
      }>;
      const languageTag = locales?.[0]?.languageTag;
      if (languageTag) {
        return languageTag;
      }
    } catch {
      // getLocales failed, fall through to fallback
    }
  }

  const i18n = I18nManager as unknown as Record<string, unknown>;
  if (i18n?.localeIdentifier && typeof i18n.localeIdentifier === 'string') {
    return i18n.localeIdentifier;
  }

  return null;
}

function getModel(): string | null {
  const device = ExpoDevice as Record<string, unknown> | null;
  if (device?.modelName && typeof device.modelName === 'string') {
    return device.modelName;
  }
  return null;
}
