type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

class Logger {
  private levelValue: number;

  constructor() {
    const envLevelStr = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    const envLevel =
      envLevelStr in LOG_LEVELS ? (envLevelStr as LogLevel) : 'info';
    this.levelValue = LOG_LEVELS[envLevel];
  }

  setLogLevel(level: LogLevel): void {
    this.levelValue = LOG_LEVELS[level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.levelValue <= LOG_LEVELS.debug) {
      console.log(`[Phase Server] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.levelValue <= LOG_LEVELS.info) {
      console.log(`[Phase Server] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.levelValue <= LOG_LEVELS.warn) {
      console.warn(`[Phase Server] ${message}`, ...args);
    }
  }

  error(message: string, error?: unknown): void {
    if (this.levelValue <= LOG_LEVELS.error) {
      console.error(`[Phase Server Error] ${message}`, error);
    }
  }
}

export const logger = new Logger();
