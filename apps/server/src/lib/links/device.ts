import { normalizeLinkBrowserFamily } from '@phase/shared';
import { UAParser } from 'ua-parser-js';

export type LinkDevicePlatform = 'ios' | 'android' | 'others';

export type ParsedLinkUserAgent = {
  platform: LinkDevicePlatform;
  osFamily: string;
  browserFamily: string;
};

function platformFromOs(osName: string): LinkDevicePlatform {
  const os = osName.toLowerCase();
  if (os.includes('ios') || os.includes('iphone') || os.includes('ipad')) {
    return 'ios';
  }
  if (os.includes('android')) {
    return 'android';
  }
  return 'others';
}

/** Parses the UA once for routing and click attribution. */
export function parseLinkUserAgent(
  userAgent: string | null
): ParsedLinkUserAgent {
  if (!userAgent) {
    return {
      platform: 'others',
      osFamily: 'unknown',
      browserFamily: 'unknown',
    };
  }

  const parser = new UAParser(userAgent);
  const osName = parser.getOS().name ?? '';

  return {
    platform: platformFromOs(osName),
    osFamily: osName || 'unknown',
    browserFamily: normalizeLinkBrowserFamily(
      parser.getBrowser().name ?? 'unknown',
      userAgent,
      parser.getEngine().name ?? undefined
    ),
  };
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
