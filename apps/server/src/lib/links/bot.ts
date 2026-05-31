import { isbot } from 'isbot';

export function isLinkBotRequest(headers: Headers): boolean {
  const userAgent = headers.get('user-agent');

  if (!userAgent?.trim()) {
    return false;
  }

  if (isbot(userAgent)) {
    return true;
  }

  const secPurpose = headers.get('sec-purpose')?.toLowerCase();
  const purpose = headers.get('purpose')?.toLowerCase();

  if (secPurpose?.includes('prefetch') || purpose?.includes('prefetch')) {
    return true;
  }

  return false;
}
