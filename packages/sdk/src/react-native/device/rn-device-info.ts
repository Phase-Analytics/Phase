import { Dimensions, PixelRatio, Platform } from 'react-native';
import type {
  DeviceInfo,
  DeviceType,
  Platform as PlatformType,
} from '../../core/types';

export function getRNDeviceInfo(): DeviceInfo {
  return {
    deviceType: getDeviceType(),
    osVersion: getOsVersion(),
    platform: getPlatform(),
    locale: getLocale(),
  };
}

function getDeviceType(): DeviceType | null {
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
  try {
    const I18nManager = require('react-native').I18nManager;
    if (I18nManager?.localeIdentifier) {
      return I18nManager.localeIdentifier;
    }
  } catch {
    // I18nManager not available
  }

  return null;
}
