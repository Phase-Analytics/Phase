import type { EventParams, Result } from '../types';
import { VALIDATION } from '../types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

function getObjectDepth(
  obj: unknown,
  currentDepth = 1,
  visited = new WeakSet<object>()
): number {
  if (typeof obj !== 'object' || obj === null) {
    return currentDepth;
  }

  if (visited.has(obj)) {
    return currentDepth;
  }
  visited.add(obj);

  const depths: number[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      depths.push(getObjectDepth(item, currentDepth + 1, visited));
    }
  } else {
    for (const value of Object.values(obj)) {
      depths.push(getObjectDepth(value, currentDepth + 1, visited));
    }
  }

  return depths.length > 0 ? Math.max(...depths) : currentDepth;
}

export function validateEventParams(
  params: EventParams | undefined
): Result<void> {
  if (!params) {
    return { success: true, data: undefined };
  }

  const depth = getObjectDepth(params);
  if (depth > VALIDATION.EVENT_PARAMS.MAX_DEPTH) {
    return {
      success: false,
      error: new ValidationError(
        `Event params exceed maximum depth of ${VALIDATION.EVENT_PARAMS.MAX_DEPTH} (got ${depth})`
      ),
    };
  }

  try {
    const serialized = JSON.stringify(params);
    if (serialized.length > VALIDATION.EVENT_PARAMS.MAX_SIZE) {
      return {
        success: false,
        error: new ValidationError(
          `Event params exceed maximum size of ${VALIDATION.EVENT_PARAMS.MAX_SIZE} bytes`
        ),
      };
    }
  } catch {
    return {
      success: false,
      error: new ValidationError('Event params must be JSON serializable'),
    };
  }

  return { success: true, data: undefined };
}

export function validateEventName(name: string): Result<void> {
  if (name.length < VALIDATION.EVENT_NAME.MIN_LENGTH) {
    return {
      success: false,
      error: new ValidationError(
        `Event name must be at least ${VALIDATION.EVENT_NAME.MIN_LENGTH} character(s)`
      ),
    };
  }

  if (name.length > VALIDATION.EVENT_NAME.MAX_LENGTH) {
    return {
      success: false,
      error: new ValidationError(
        `Event name must not exceed ${VALIDATION.EVENT_NAME.MAX_LENGTH} characters`
      ),
    };
  }

  if (!VALIDATION.EVENT_NAME.PATTERN.test(name)) {
    return {
      success: false,
      error: new ValidationError(
        `Event name must match pattern: ${VALIDATION.EVENT_NAME.PATTERN.toString()}`
      ),
    };
  }

  return { success: true, data: undefined };
}

export function validateDeviceId(deviceId: string): Result<void> {
  if (deviceId.length < VALIDATION.DEVICE_ID.MIN_LENGTH) {
    return {
      success: false,
      error: new ValidationError(
        `Device ID must be at least ${VALIDATION.DEVICE_ID.MIN_LENGTH} characters`
      ),
    };
  }

  if (deviceId.length > VALIDATION.DEVICE_ID.MAX_LENGTH) {
    return {
      success: false,
      error: new ValidationError(
        `Device ID must not exceed ${VALIDATION.DEVICE_ID.MAX_LENGTH} characters`
      ),
    };
  }

  if (!VALIDATION.DEVICE_ID.PATTERN.test(deviceId)) {
    return {
      success: false,
      error: new ValidationError(
        `Device ID must match pattern: ${VALIDATION.DEVICE_ID.PATTERN.toString()}`
      ),
    };
  }

  return { success: true, data: undefined };
}

export function validateSessionId(sessionId: string): Result<void> {
  if (sessionId.length < VALIDATION.SESSION_ID.MIN_LENGTH) {
    return {
      success: false,
      error: new ValidationError(
        `Session ID must be at least ${VALIDATION.SESSION_ID.MIN_LENGTH} characters`
      ),
    };
  }

  if (sessionId.length > VALIDATION.SESSION_ID.MAX_LENGTH) {
    return {
      success: false,
      error: new ValidationError(
        `Session ID must not exceed ${VALIDATION.SESSION_ID.MAX_LENGTH} characters`
      ),
    };
  }

  if (!VALIDATION.SESSION_ID.PATTERN.test(sessionId)) {
    return {
      success: false,
      error: new ValidationError(
        `Session ID must match pattern: ${VALIDATION.SESSION_ID.PATTERN.toString()}`
      ),
    };
  }

  return { success: true, data: undefined };
}
