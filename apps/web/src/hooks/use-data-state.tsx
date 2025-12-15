'use client';

import {
  type Ref,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
} from 'react';

type DataStateValue = string | boolean | null;

function parseDatasetValue(value: string | null): DataStateValue {
  if (value === null) {
    return null;
  }
  if (value === '' || value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

function useDataState<T extends HTMLElement = HTMLElement>(
  key: string,
  forwardedRef?: Ref<T | null>,
  onChange?: (value: DataStateValue) => void
): [DataStateValue, RefObject<T | null>] {
  const localRef = useRef<T | null>(null);
  useImperativeHandle(forwardedRef, () => localRef.current as T);

  const getSnapshot = (): DataStateValue => {
    const el = localRef.current;
    return el ? parseDatasetValue(el.getAttribute(`data-${key}`)) : null;
  };

  const subscribe = (callback: () => void) => {
    const el = localRef.current;
    if (!el) {
      return () => {
        return;
      };
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName === `data-${key}`) {
          callback();
          break;
        }
      }
    });
    observer.observe(el, {
      attributes: true,
      attributeFilter: [`data-${key}`],
    });
    return () => observer.disconnect();
  };

  const value = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (onChange) {
      onChange(value);
    }
  }, [value, onChange]);

  return [value, localRef];
}

export { useDataState, type DataStateValue };
