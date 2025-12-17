import { HttpError, type Result } from '../types';

const RETRY_DELAYS = [100, 500, 2000] as const;

export async function withRetry<T>(fn: () => Promise<T>): Promise<Result<T>> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < RETRY_DELAYS.length + 1; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError instanceof HttpError && !lastError.isRetryable()) {
        break;
      }

      const delay = RETRY_DELAYS[attempt];
      if (delay === undefined) {
        break;
      }

      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError ?? new Error('Unknown error occurred'),
  };
}
