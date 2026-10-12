import type { BatchItem } from '../types';
import type { BatchSender, FlushOutcome } from './batch-sender';
import type { OfflineQueue } from './offline-queue';

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_SIZE_THRESHOLD = 20;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

/**
 * Decides when the queue is sent: on size, on an interval while non-empty,
 * on every heartbeat (keeps realtime presence accurate), on demand, and when
 * the app goes to the background. Backs off after failures.
 */
export class FlushScheduler {
  private readonly sender: BatchSender;
  private readonly queue: OfflineQueue;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveFailures = 0;
  private notBefore = 0;
  private isOnline = true;
  private isActive = true;
  private running = false;

  constructor(sender: BatchSender, queue: OfflineQueue) {
    this.sender = sender;
    this.queue = queue;
  }

  start(): void {
    this.running = true;
    this.queue.setEnqueueListener((item) => this.onEnqueue(item));
    if (this.queue.getSize() > 0) {
      this.requestFlush();
    }
  }

  stop(): void {
    this.running = false;
    this.queue.setEnqueueListener(null);
    this.clearTimer();
  }

  setOnline(isOnline: boolean): void {
    const cameOnline = isOnline && !this.isOnline;
    this.isOnline = isOnline;
    if (cameOnline) {
      this.notBefore = 0;
      this.requestFlush();
    }
  }

  onForeground(): void {
    this.isActive = true;
    if (this.queue.getSize() > 0) {
      this.requestFlush();
    }
  }

  /** Sends what we can before the OS suspends us, and makes the rest durable. */
  async onBackground(): Promise<void> {
    this.isActive = false;
    this.clearTimer();
    await this.flushNow();
    await this.queue.persistNow();
  }

  /** Flushes immediately unless offline or in a server-requested backoff. */
  async flushNow(): Promise<void> {
    if (!this.canFlush()) {
      await this.queue.persistNow();
      return;
    }
    await this.run();
  }

  /** Flushes as soon as allowed (respecting backoff). */
  requestFlush(): void {
    if (!this.running) {
      return;
    }
    if (this.canFlush()) {
      this.run().catch(() => undefined);
    } else {
      this.arm();
    }
  }

  private onEnqueue(item: BatchItem): void {
    if (item.type === 'ping' || this.queue.getSize() >= FLUSH_SIZE_THRESHOLD) {
      this.requestFlush();
    } else {
      this.arm();
    }
  }

  private canFlush(): boolean {
    return this.isOnline && Date.now() >= this.notBefore;
  }

  private async run(): Promise<void> {
    this.clearTimer();
    const outcome = await this.sender.flush();
    this.recordOutcome(outcome);
    if (this.queue.getSize() > 0) {
      this.arm();
    }
  }

  private recordOutcome(outcome: FlushOutcome): void {
    if (outcome.status !== 'retry') {
      this.consecutiveFailures = 0;
      this.notBefore = 0;
      return;
    }

    this.consecutiveFailures += 1;
    const exponential = Math.min(
      MAX_BACKOFF_MS,
      FLUSH_INTERVAL_MS * 2 ** (this.consecutiveFailures - 1)
    );
    // Equal jitter: never shorter than half the backoff, so we can't hammer.
    const backoff = exponential / 2 + Math.random() * (exponential / 2);
    this.notBefore = Date.now() + Math.max(backoff, outcome.retryAfterMs ?? 0);
  }

  private arm(): void {
    // While offline, setOnline(true) triggers the next flush.
    if (!(this.running && this.isActive && this.isOnline) || this.timer) {
      return;
    }
    const delay = Math.max(FLUSH_INTERVAL_MS, this.notBefore - Date.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      this.requestFlush();
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
