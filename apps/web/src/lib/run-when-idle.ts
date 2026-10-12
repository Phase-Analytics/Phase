/** Schedules `callback` when the main thread is idle; returns a cancel function. */
export function runWhenIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(callback, Math.min(timeout, 1000));
  return () => window.clearTimeout(handle);
}
