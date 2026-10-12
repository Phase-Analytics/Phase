import { sql } from 'drizzle-orm';
import { db, sessions } from '@/db';

type SessionActivity = {
  timestamp: Date;
  appId: string;
};

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
  private readonly activeBuffer: Map<string, SessionActivity>;
  private readonly pendingBuffer: Map<string, SessionActivity>;
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

  push(sessionId: string, timestamp: Date, appId: string): void {
    if (this.isShuttingDown) {
      console.warn('[SessionActivityBuffer] Rejecting push during shutdown');
      return;
    }

    const targetBuffer = this.isFlushing
      ? this.pendingBuffer
      : this.activeBuffer;

    const existing = targetBuffer.get(sessionId);
    if (!existing || timestamp > existing.timestamp) {
      targetBuffer.set(sessionId, { timestamp, appId });
    }

    if (!this.isFlushing && this.activeBuffer.size >= this.flushThreshold) {
      this.triggerFlush();
    }

    const totalSize = this.activeBuffer.size + this.pendingBuffer.size;
    if (totalSize >= this.maxBufferSize && !this.isFlushing) {
      console.warn(
        `[SessionActivityBuffer] Combined buffers near capacity (${totalSize}/${this.maxBufferSize}), triggering flush`
      );
      this.triggerFlush();
    }
  }

  getLastActivityAt(sessionId: string): Date | null {
    const activeActivity = this.activeBuffer.get(sessionId);
    const pendingActivity = this.pendingBuffer.get(sessionId);

    if (!(activeActivity || pendingActivity)) {
      return null;
    }

    if (activeActivity && !pendingActivity) {
      return activeActivity.timestamp;
    }

    if (!activeActivity && pendingActivity) {
      return pendingActivity.timestamp;
    }

    if (activeActivity && pendingActivity) {
      return activeActivity.timestamp > pendingActivity.timestamp
        ? activeActivity.timestamp
        : pendingActivity.timestamp;
    }

    return null;
  }

  private triggerFlush(): void {
    this.flush().catch((error) => {
      console.error('[SessionActivityBuffer] Triggered flush error:', error);
    });
  }

  start(): void {
    if (this.flushTimer) {
      console.warn('[SessionActivityBuffer] Already started');
      return;
    }

    console.log(
      `[SessionActivityBuffer] Started with ${this.flushIntervalMs}ms interval`
    );

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
      console.log('[SessionActivityBuffer] Stopped');
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

      for (const [sessionId, activity] of this.pendingBuffer.entries()) {
        const existing = this.activeBuffer.get(sessionId);
        if (!existing || activity.timestamp > existing.timestamp) {
          this.activeBuffer.set(sessionId, activity);
        }
      }
      this.pendingBuffer.clear();
    } catch (error) {
      console.error('[SessionActivityBuffer] Flush failed:', error);

      for (const [sessionId, activity] of snapshot.entries()) {
        const existing = this.activeBuffer.get(sessionId);
        if (!existing || activity.timestamp > existing.timestamp) {
          this.activeBuffer.set(sessionId, activity);
        }
      }

      throw error;
    }
  }

  private async writeBatchToDatabase(
    snapshot: Map<string, SessionActivity>
  ): Promise<void> {
    if (snapshot.size === 0) {
      return;
    }

    const sessionIds: string[] = [];
    // last_activity_at is timestamp without time zone holding UTC wall time
    // (drizzle writes toISOString()); casting an ISO string drops the "Z".
    const timestamps: string[] = [];
    for (const [sessionId, activity] of snapshot) {
      sessionIds.push(sessionId);
      timestamps.push(activity.timestamp.toISOString());
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

    console.log(
      '[SessionActivityBuffer] Flushing remaining data before shutdown'
    );

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
    console.log('[SessionActivityBuffer] Shutdown flush completed');
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
    console.warn('[SessionActivityBuffer] Already initialized');
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
