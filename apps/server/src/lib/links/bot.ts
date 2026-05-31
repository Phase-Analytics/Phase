import { isbot } from 'isbot';

function isPrefetchRequest(headers: Headers): boolean {
  const secPurpose = headers.get('sec-purpose')?.toLowerCase() ?? '';
  const purpose = headers.get('purpose')?.toLowerCase() ?? '';
  const secFetchMode = headers.get('sec-fetch-mode')?.toLowerCase() ?? '';
  const moz = headers.get('x-moz')?.toLowerCase() ?? '';

  if (
    secPurpose.includes('prefetch') ||
    secPurpose.includes('prerender') ||
    purpose.includes('prefetch') ||
    purpose.includes('prerender')
  ) {
    return true;
  }

  if (secFetchMode === 'prefetch') {
    return true;
  }

  if (moz.includes('prefetch')) {
    return true;
  }

  return false;
}

export function shouldServeLinkOgPreview(request: Request): boolean {
  if (request.method.toUpperCase() !== 'GET') {
    return false;
  }

  if (isPrefetchRequest(request.headers)) {
    return false;
  }

  const userAgent = request.headers.get('user-agent');
  if (!userAgent?.trim()) {
    return false;
  }

  return isbot(userAgent);
}

export function shouldRecordLinkClick(request: Request): boolean {
  if (request.method.toUpperCase() !== 'GET') {
    return false;
  }

  if (isPrefetchRequest(request.headers)) {
    return false;
  }

  const userAgent = request.headers.get('user-agent');
  if (!userAgent?.trim()) {
    return false;
  }

  if (isbot(userAgent)) {
    return false;
  }

  return true;
}
