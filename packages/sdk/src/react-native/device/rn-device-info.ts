import { Dimensions, I18nManager, PixelRatio, Platform } from 'react-native';
import type {
  DeviceInfo,
  DeviceType,
  Platform as PlatformType,
} from '../../core/types';

let RNDeviceInfo: unknown = null;
let RNLocalize: unknown = null;

try {
  RNDeviceInfo = require('react-native-device-info');
} catch {
  // react-native-device-info not available
}

try {
  RNLocalize = require('react-native-localize');
} catch {
  // react-native-localize not available
}

export function getRNDeviceInfo(): DeviceInfo {
  const model = getModel();
  const deviceType = getDeviceType();
  const fallbackModel = model || deviceType;

  return {
    osVersion: getOsVersion(),
    platform: getPlatform(),
    locale: getLocale(),
    model: fallbackModel,
    appVersion: getAppVersion(),
  };
}

function getDeviceType(): DeviceType | null {
  const deviceInfo = RNDeviceInfo as Record<string, unknown> | null;

  if (
    deviceInfo?.getDeviceTypeSync &&
    typeof deviceInfo.getDeviceTypeSync === 'function'
  ) {
    try {
      const deviceType = deviceInfo.getDeviceTypeSync() as string;
      switch (deviceType.toLowerCase()) {
        case 'phone':
        case 'handset':
          return 'phone';
        case 'tablet':
          return 'tablet';
        case 'desktop':
          return 'desktop';
        default:
          // Fall through to dimension-based detection
          break;
      }
    } catch {
      // getDeviceTypeSync failed, fall through to fallback
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
  const deviceInfo = RNDeviceInfo as Record<string, unknown> | null;

  if (
    deviceInfo?.getSystemVersion &&
    typeof deviceInfo.getSystemVersion === 'function'
  ) {
    try {
      const version = deviceInfo.getSystemVersion() as string;
      if (version) {
        return version;
      }
    } catch {
      // getSystemVersion failed, fall through to fallback
    }
  }

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
  const localize = RNLocalize as Record<string, unknown> | null;

  if (localize?.getLocales && typeof localize.getLocales === 'function') {
    try {
      const locales = localize.getLocales() as Array<{
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
  const deviceInfo = RNDeviceInfo as Record<string, unknown> | null;

  if (deviceInfo?.getModel && typeof deviceInfo.getModel === 'function') {
    try {
      const model = deviceInfo.getModel() as string;
      if (model) {
        return model;
      }
    } catch {
      // getModel failed, try getDeviceId
    }
  }

  if (deviceInfo?.getDeviceId && typeof deviceInfo.getDeviceId === 'function') {
    try {
      const deviceId = deviceInfo.getDeviceId() as string;
      if (deviceId) {
        return deviceId;
      }
    } catch {
      // getDeviceId failed
    }
  }

  return null;
}

function getAppVersion(): string | null {
  const deviceInfo = RNDeviceInfo as Record<string, unknown> | null;

  if (deviceInfo?.getVersion && typeof deviceInfo.getVersion === 'function') {
    try {
      const version = deviceInfo.getVersion() as string;
      if (version) {
        return version;
      }
    } catch {
      // getVersion failed
    }
  }

  return null;
}
