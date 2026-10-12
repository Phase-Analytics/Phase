type Entry<T> = { value: T; expiresAt: number };

/**
 * Small in-process TTL cache with LRU eviction (Map preserves insertion
 * order; reads re-insert). Keeps the redirect hot path off the network for
 * repeat hits on the same replica.
 */
export class LocalTtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: { ttlMs: number; maxEntries: number }) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries;
  }

  get(key: string): { value: T } | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    this.entries.delete(key);
    if (entry.expiresAt <= Date.now()) {
      return;
    }
    this.entries.set(key, entry);
    return { value: entry.value };
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
      }
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}
