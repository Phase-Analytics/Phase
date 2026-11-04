'use client';

import Script from 'next/script';

export function Invisit() {
  return (
    <Script
      data-collector="https://api.invisit.dev"
      data-require-consent="false"
      data-respect-dnt="false"
      data-respect-gpc="false"
      data-site="01a1a63e-4f97-7b52-a2c8-78847245ce52"
      id="invisit-script"
      src="https://api.invisit.dev/invisit.js"
      strategy="afterInteractive"
    />
  );
}
