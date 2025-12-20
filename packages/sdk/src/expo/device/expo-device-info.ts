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
    model: getModel(),
  };
}

function getDeviceType(): DeviceType | null {
  try {
    const Device = require('expo-device');

    if (Device.deviceType !== undefined && Device.deviceType !== null) {
      switch (Device.deviceType) {
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
  } catch {
    // fall through to fallback
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
  try {
    const { getLocales } = require('expo-localization');
    console.log('[Phase] getLocales function:', getLocales);
    const locales = getLocales();
    console.log('[Phase] locales:', locales);
    const languageTag = locales?.[0]?.languageTag;
    console.log('[Phase] languageTag:', languageTag);
    if (languageTag) {
      return languageTag;
    }
  } catch (error) {
    console.log('[Phase] expo-localization error:', error);
    // expo-localization not available, fall through to fallback
  }

  try {
    const I18nManager = require('react-native').I18nManager;
    console.log('[Phase] I18nManager:', I18nManager);
    if (I18nManager?.localeIdentifier) {
      return I18nManager.localeIdentifier;
    }
  } catch (error) {
    console.log('[Phase] I18nManager error:', error);
    // I18nManager not available
  }

  return null;
}

function getModel(): string | null {
  try {
    const { modelName } = require('expo-device');
    console.log('[Phase] modelName:', modelName);
    return modelName || null;
  } catch (error) {
    console.log('[Phase] expo-device error:', error);
    return null;
  }
}
