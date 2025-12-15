'use client';

import { useEffect } from 'react';

export function DocsBodyClass() {
  useEffect(() => {
    document.body.classList.add('docs-page');
    return () => document.body.classList.remove('docs-page');
  }, []);

  return null;
}
