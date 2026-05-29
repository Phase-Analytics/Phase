'use client';

import Script from 'next/script';

export function OpenPanelAnalytics() {
  return (
    <Script
      data-site-id="48566fab4f89"
      src="https://rybbit-api.mirac.dev/api/script.js"
      strategy="afterInteractive"
    />
  );
}
