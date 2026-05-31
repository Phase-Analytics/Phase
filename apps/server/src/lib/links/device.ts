import { UAParser } from 'ua-parser-js';

export type LinkDevicePlatform = 'ios' | 'android' | 'others';

export function resolveLinkDevicePlatform(
  userAgent: string | null
): LinkDevicePlatform {
  if (!userAgent) {
    return 'others';
  }

  const os = new UAParser(userAgent).getOS().name?.toLowerCase() ?? '';

  if (os.includes('ios') || os.includes('iphone') || os.includes('ipad')) {
    return 'ios';
  }

  if (os.includes('android')) {
    return 'android';
  }

  return 'others';
}

type DeviceUrls = {
  destinationUrl: string;
  deviceIosUrl: string | null;
  deviceAndroidUrl: string | null;
  deviceOthersUrl: string | null;
};

export function resolveDestinationForPlatform(
  platform: LinkDevicePlatform,
  urls: DeviceUrls
): string {
  if (platform === 'ios' && urls.deviceIosUrl) {
    return urls.deviceIosUrl;
  }
  if (platform === 'android' && urls.deviceAndroidUrl) {
    return urls.deviceAndroidUrl;
  }
  if (platform === 'others' && urls.deviceOthersUrl) {
    return urls.deviceOthersUrl;
  }

  return urls.destinationUrl;
}
