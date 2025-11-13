'use client';

import {
  type DependencyList,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type AutoHeightOptions = {
  includeParentBox?: boolean;
  includeSelfBox?: boolean;
};

export function useAutoHeight<T extends HTMLElement = HTMLDivElement>(
  deps: DependencyList = [],
  options: AutoHeightOptions = {
    includeParentBox: true,
    includeSelfBox: false,
  }
) {
  const ref = useRef<T | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return 0;
    }

    const base = el.getBoundingClientRect().height || 0;

    let extra = 0;

    if (options.includeParentBox && el.parentElement) {
      const cs = getComputedStyle(el.parentElement);
      const paddingY =
        (Number.parseFloat(cs.paddingTop || '0') || 0) +
        (Number.parseFloat(cs.paddingBottom || '0') || 0);
      const borderY =
        (Number.parseFloat(cs.borderTopWidth || '0') || 0) +
        (Number.parseFloat(cs.borderBottomWidth || '0') || 0);
      const isBorderBox = cs.boxSizing === 'border-box';
      if (isBorderBox) {
        extra += paddingY + borderY;
      }
    }

    if (options.includeSelfBox) {
      const cs = getComputedStyle(el);
      const paddingY =
        (Number.parseFloat(cs.paddingTop || '0') || 0) +
        (Number.parseFloat(cs.paddingBottom || '0') || 0);
      const borderY =
        (Number.parseFloat(cs.borderTopWidth || '0') || 0) +
        (Number.parseFloat(cs.borderBottomWidth || '0') || 0);
      const isBorderBox = cs.boxSizing === 'border-box';
      if (isBorderBox) {
        extra += paddingY + borderY;
      }
    }

    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const total = Math.ceil((base + extra) * dpr) / dpr;

    return total;
  }, [options.includeParentBox, options.includeSelfBox]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    setHeight(measure());

    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }

    const ro = new ResizeObserver(() => {
      const next = measure();
      requestAnimationFrame(() => setHeight(next));
    });

    ro.observe(el);
    if (options.includeParentBox && el.parentElement) {
      ro.observe(el.parentElement);
    }

    roRef.current = ro;

    return () => {
      ro.disconnect();
      roRef.current = null;
    };
  }, [measure, options.includeParentBox, ...deps]);

  useLayoutEffect(() => {
    if (height === 0) {
      const next = measure();
      if (next !== 0) {
        setHeight(next);
      }
    }
  }, [height, measure]);

  return { ref, height } as const;
}
