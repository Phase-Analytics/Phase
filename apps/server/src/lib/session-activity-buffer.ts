import { sql } from 'drizzle-orm';
import { db, sessions } from '@/db';

type SessionActivityBufferOptions = {
  flushIntervalMs?: number;
  flushThreshold?: number;
  maxBufferSize?: number;
};

const DEFAULT_OPTIONS: Required<SessionActivityBufferOptions> = {
  flushIntervalMs: 3000,
  flushThreshold: 500,
  maxBufferSize: 5000,
};

export class SessionActivityBuffer {
  private readonly activeBuffer: Map<string, Date>;
  private readonly pendingBuffer: Map<string, Date>;
  private readonly flushIntervalMs: number;
  private readonly flushThreshold: number;
  private readonly maxBufferSize: number;
  private flushTimer: NodeJS.Timeout | null;
  private isFlushing: boolean;
  private isShuttingDown: boolean;
  private flushPromise: Promise<void> | null;

  constructor(options: SessionActivityBufferOptions = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };

    this.activeBuffer = new Map();
    this.pendingBuffer = new Map();
    this.flushIntervalMs = config.flushIntervalMs;
    this.flushThreshold = config.flushThreshold;
    this.maxBufferSize = config.maxBufferSize;
    this.flushTimer = null;
    this.isFlushing = false;
    this.isShuttingDown = false;
    this.flushPromise = null;
  }

  /** Records activity; updates arriving after shutdown began are dropped. */
  push(sessionId: string, timestamp: Date): void {
    if (this.isShuttingDown) {
      return;
    }

    const targetBuffer = this.isFlushing
      ? this.pendingBuffer
      : this.activeBuffer;

    const existing = targetBuffer.get(sessionId);
    if (!existing || timestamp > existing) {
      targetBuffer.set(sessionId, timestamp);
    }

    if (!this.isFlushing && this.activeBuffer.size >= this.flushThreshold) {
      this.triggerFlush();
    }

    const totalSize = this.activeBuffer.size + this.pendingBuffer.size;
    if (totalSize >= this.maxBufferSize && !this.isFlushing) {
      this.triggerFlush();
    }
  }

  getLastActivityAt(sessionId: string): Date | null {
    const active = this.activeBuffer.get(sessionId);
    const pending = this.pendingBuffer.get(sessionId);
    if (active && pending) {
      return active > pending ? active : pending;
    }
    return active ?? pending ?? null;
  }

  private triggerFlush(): void {
    this.flush().catch((error) => {
      console.error('[SessionActivityBuffer] Triggered flush error:', error);
    });
  }

  start(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        console.error('[SessionActivityBuffer] Scheduled flush error:', error);
      });
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async flush(): Promise<void> {
    if (this.isFlushing) {
      if (this.flushPromise) {
        await this.flushPromise;
      }
      return;
    }

    if (this.activeBuffer.size === 0) {
      return;
    }

    this.isFlushing = true;
    this.flushPromise = this.doFlush();

    try {
      await this.flushPromise;
    } finally {
      this.isFlushing = false;
      this.flushPromise = null;
    }
  }

  private async doFlush(): Promise<void> {
    const snapshot = new Map(this.activeBuffer);
    this.activeBuffer.clear();

    if (snapshot.size === 0) {
      return;
    }

    try {
      await this.writeBatchToDatabase(snapshot);
    } catch (error) {
      this.mergeIntoActive(snapshot);
      throw error;
    } finally {
      this.mergeIntoActive(this.pendingBuffer);
      this.pendingBuffer.clear();
    }
  }

  private mergeIntoActive(source: Map<string, Date>): void {
    for (const [sessionId, timestamp] of source) {
      const existing = this.activeBuffer.get(sessionId);
      if (!existing || timestamp > existing) {
        this.activeBuffer.set(sessionId, timestamp);
      }
    }
  }

  private async writeBatchToDatabase(
    snapshot: Map<string, Date>
  ): Promise<void> {
    if (snapshot.size === 0) {
      return;
    }

    const sessionIds: string[] = [];
    // last_activity_at is timestamp without time zone holding UTC wall time
    // (drizzle writes toISOString()); casting an ISO string drops the "Z".
    const timestamps: string[] = [];
    for (const [sessionId, timestamp] of snapshot) {
      sessionIds.push(sessionId);
      timestamps.push(timestamp.toISOString());
    }

    await db.execute(sql`
      UPDATE ${sessions} AS s
      SET last_activity_at = v.ts
      FROM unnest(${sql.param(sessionIds)}::text[], ${sql.param(timestamps)}::timestamp[]) AS v(id, ts)
      WHERE s.session_id = v.id AND s.last_activity_at < v.ts
    `);
  }

  async flushAndClose(): Promise<void> {
    this.isShuttingDown = true;
    this.stop();

    // An in-progress flush parks new updates in pendingBuffer and merges them
    // back afterwards, so keep flushing until both buffers are empty.
    let failures = 0;
    while (
      this.activeBuffer.size > 0 ||
      this.pendingBuffer.size > 0 ||
      this.flushPromise
    ) {
      try {
        await this.flush();
      } catch (error) {
        failures++;
        if (failures >= 3) {
          console.error(
            `[SessionActivityBuffer] Dropping ${this.activeBuffer.size + this.pendingBuffer.size} session updates after failed shutdown flushes:`,
            error
          );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  getStats() {
    return {
      activeBufferSize: this.activeBuffer.size,
      pendingBufferSize: this.pendingBuffer.size,
      totalBufferSize: this.activeBuffer.size + this.pendingBuffer.size,
      isFlushing: this.isFlushing,
      isShuttingDown: this.isShuttingDown,
      maxBufferSize: this.maxBufferSize,
      flushThreshold: this.flushThreshold,
    };
  }
}

let instance: SessionActivityBuffer | null = null;

export function initSessionActivityBuffer(
  options?: SessionActivityBufferOptions
): SessionActivityBuffer {
  if (instance) {
    return instance;
  }

  instance = new SessionActivityBuffer(options);
  return instance;
}

export function getSessionActivityBuffer(): SessionActivityBuffer {
  if (!instance) {
    throw new Error(
      'SessionActivityBuffer not initialized. Call initSessionActivityBuffer() first.'
    );
  }
  return instance;
}
