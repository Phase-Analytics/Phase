'use client';

import Script from 'next/script';

export function OpenPanelAnalytics() {
  return (
    <Script
      src="https://rybbit-api.mirac.dev/api/script.js"
      data-site-id="48566fab4f89"
      strategy="afterInteractive"
    />
  );
}
