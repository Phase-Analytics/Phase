import type { LogLevel } from '../types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  error: 2,
  none: 3,
};

class Logger {
  private levelValue = LOG_LEVELS.error;

  setLogLevel(level: LogLevel): void {
    this.levelValue = LOG_LEVELS[level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.levelValue <= LOG_LEVELS.debug) {
      console.log(`[Phase SDK] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.levelValue <= LOG_LEVELS.info) {
      console.log(`[Phase SDK] ${message}`, ...args);
    }
  }

  error(message: string, error?: unknown): void {
    if (this.levelValue <= LOG_LEVELS.error) {
      console.error(`[Phase SDK Error] ${message}`, error);
    }
  }
}

export const logger = new Logger();
