import {
  DEVICE_ID,
  ErrorCode,
  EVENT_NAME,
  HttpStatus,
  type PropertySearchCondition,
  PropertySearchFilterSchema,
  SESSION_ID,
} from '@phase/shared';
import {
  type AnyColumn,
  and,
  count,
  eq,
  gte,
  lte,
  type SQL,
} from 'drizzle-orm';
import { db, devices, sessions } from '@/db';

const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 25;

export type TimestampMode = 'realtime' | 'offline';

const TIMESTAMP_CONFIG = {
  realtime: {
    maxPastMs: 1 * 60 * 60 * 1000,
    maxFutureMs: 5 * 60 * 1000,
  },
  offline: {
    maxPastMs: 7 * 24 * 60 * 60 * 1000,
    maxFutureMs: 60 * 60 * 1000,
  },
} as const;

export const SESSION_MAX_AGE = {
  realtime: 1 * 60 * 60 * 1000,
  offline: 7 * 24 * 60 * 60 * 1000,
} as const;

const ID_VALIDATION = {
  deviceId: {
    minLength: DEVICE_ID.MIN_LENGTH,
    maxLength: DEVICE_ID.MAX_LENGTH,
    pattern: DEVICE_ID.PATTERN,
    fieldName: 'deviceId',
  },
  sessionId: {
    minLength: SESSION_ID.MIN_LENGTH,
    maxLength: SESSION_ID.MAX_LENGTH,
    pattern: SESSION_ID.PATTERN,
    fieldName: 'sessionId',
  },
  eventName: {
    minLength: EVENT_NAME.MIN_LENGTH,
    maxLength: EVENT_NAME.MAX_LENGTH,
    pattern: EVENT_NAME.PATTERN,
    fieldName: 'event name',
  },
} as const;

export type ValidationError = {
  code: ErrorCode;
  detail: string;
  status: HttpStatus;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

export type PaginationParams = {
  page: number;
  pageSize: number;
  offset: number;
};

export function validatePagination(
  pageStr: string,
  pageSizeStr: string,
  maxPageSize?: number
): ValidationResult<PaginationParams> {
  const page = Number.parseInt(pageStr, 10);
  const pageSize = Number.parseInt(pageSizeStr, 10);
  const effectiveMaxPageSize = maxPageSize ?? MAX_PAGE_SIZE;

  if (Number.isNaN(page) || page < 1) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: 'Invalid page parameter: must be a positive integer',
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (Number.isNaN(pageSize) || pageSize < MIN_PAGE_SIZE) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Invalid pageSize parameter: must be at least ${MIN_PAGE_SIZE}`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (pageSize > effectiveMaxPageSize) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Invalid pageSize parameter: must be between ${MIN_PAGE_SIZE} and ${effectiveMaxPageSize}`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  const offset = (page - 1) * pageSize;

  return {
    success: true,
    data: { page, pageSize, offset },
  };
}

export function validateTimestamp(
  timestampStr: string,
  fieldName = 'timestamp',
  mode: TimestampMode = 'realtime'
): ValidationResult<Date> {
  const clientTimestamp = new Date(timestampStr);

  if (Number.isNaN(clientTimestamp.getTime())) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Invalid ${fieldName} format`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  const config = TIMESTAMP_CONFIG[mode];
  const serverTimestamp = new Date();
  const timeDiffMs = serverTimestamp.getTime() - clientTimestamp.getTime();

  if (timeDiffMs < -config.maxFutureMs) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${fieldName} cannot be in the future`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (timeDiffMs > config.maxPastMs) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${fieldName} is too old.`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return {
    success: true,
    data: clientTimestamp,
  };
}

export async function validateDevice(
  deviceId: string,
  appId?: string
): Promise<ValidationResult<typeof devices.$inferSelect>> {
  const device = await db.query.devices.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.deviceId, deviceId),
  });

  if (!device) {
    return {
      success: false,
      error: {
        code: ErrorCode.NOT_FOUND,
        detail: 'Device not found',
        status: HttpStatus.NOT_FOUND,
      },
    };
  }

  if (appId && device.appId !== appId) {
    return {
      success: false,
      error: {
        code: ErrorCode.FORBIDDEN,
        detail: 'You do not have permission to access this device',
        status: HttpStatus.FORBIDDEN,
      },
    };
  }

  return {
    success: true,
    data: device,
  };
}

export async function validateSession(
  sessionId: string,
  appId?: string
): Promise<
  ValidationResult<{
    session: typeof sessions.$inferSelect;
    device: typeof devices.$inferSelect;
  }>
> {
  const result = await db
    .select({
      session: sessions,
      device: devices,
    })
    .from(sessions)
    .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
    .where(eq(sessions.sessionId, sessionId))
    .limit(1)
    .$withCache({
      tag: `session:${sessionId}`,
    });

  const sessionData = result[0];

  if (!sessionData) {
    return {
      success: false,
      error: {
        code: ErrorCode.NOT_FOUND,
        detail: 'Session not found',
        status: HttpStatus.NOT_FOUND,
      },
    };
  }

  if (appId && sessionData.device.appId !== appId) {
    return {
      success: false,
      error: {
        code: ErrorCode.FORBIDDEN,
        detail: 'You do not have permission to access this session',
        status: HttpStatus.FORBIDDEN,
      },
    };
  }

  return {
    success: true,
    data: {
      session: sessionData.session,
      device: sessionData.device,
    },
  };
}

export function validateDateRange(
  startDate?: string,
  endDate?: string
): ValidationResult<void> {
  if (startDate) {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Invalid startDate format',
          status: HttpStatus.BAD_REQUEST,
        },
      };
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Invalid endDate format',
          status: HttpStatus.BAD_REQUEST,
        },
      };
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'startDate must be before or equal to endDate',
          status: HttpStatus.BAD_REQUEST,
        },
      };
    }
  }

  return {
    success: true,
    data: undefined,
  };
}

export function buildFilters<T extends AnyColumn>(options: {
  filters: SQL[];
  startDateColumn?: T;
  startDateValue?: string | Date;
  endDateColumn?: T;
  endDateValue?: string | Date;
}): SQL | undefined {
  const {
    filters,
    startDateColumn,
    startDateValue,
    endDateColumn,
    endDateValue,
  } = options;

  const combined = [...filters];

  if (startDateColumn && startDateValue) {
    const startDate =
      startDateValue instanceof Date
        ? startDateValue
        : new Date(startDateValue);
    if (Number.isNaN(startDate.getTime())) {
      throw new TypeError(
        `Invalid startDateValue: "${startDateValue}" is not a valid date`
      );
    }
    combined.push(gte(startDateColumn, startDate));
  }

  if (endDateColumn && endDateValue) {
    const endDate =
      endDateValue instanceof Date ? endDateValue : new Date(endDateValue);
    if (Number.isNaN(endDate.getTime())) {
      throw new TypeError(
        `Invalid endDateValue: "${endDateValue}" is not a valid date`
      );
    }
    combined.push(lte(endDateColumn, endDate));
  }

  return combined.length > 0 ? and(...combined) : undefined;
}

export function formatPaginationResponse(
  totalCount: number,
  page: number,
  pageSize: number
) {
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;

  return {
    total: totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getActiveSessionsCount(seconds = 20): Promise<number> {
  const cutoffTime = new Date(Date.now() - seconds * 1000);

  const [{ count: activeCount }] = await db
    .select({ count: count() })
    .from(sessions)
    .where(gte(sessions.lastActivityAt, cutoffTime));

  return activeCount;
}

export async function invalidateSessionCache(sessionId: string): Promise<void> {
  try {
    await db.$cache?.invalidate({ tags: `session:${sessionId}` });
  } catch (error) {
    console.error(`[Cache] Failed to invalidate session ${sessionId}:`, error);
  }
}

const MAX_PARAMS_SIZE = 50_000;
const MAX_PARAM_KEY_LENGTH = 128;
const MAX_PROPERTIES_SIZE = 50_000;
const MAX_PROPERTY_KEY_LENGTH = 128;

function isFlatValue(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

export function validateEventParams(
  params: unknown
): ValidationResult<Record<string, string | number | boolean | null> | null> {
  if (params === null || params === undefined) {
    return { success: true, data: null };
  }

  if (typeof params !== 'object' || Array.isArray(params)) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: 'Params must be a flat object with string keys',
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  const entries = Object.entries(params);

  for (const [key, value] of entries) {
    if (key.length > MAX_PARAM_KEY_LENGTH) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `Param key '${key}' exceeds maximum length of ${MAX_PARAM_KEY_LENGTH}`,
          status: HttpStatus.BAD_REQUEST,
        },
      };
    }

    if (!isFlatValue(value)) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `Param '${key}' must be a string, number, boolean, or null. Nested objects/arrays are not allowed.`,
          status: HttpStatus.BAD_REQUEST,
        },
      };
    }
  }

  let jsonString: string;
  try {
    jsonString = JSON.stringify(params);
  } catch (_error) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: 'Invalid params: must be valid JSON',
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (jsonString.length > MAX_PARAMS_SIZE) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Params too large: maximum ${MAX_PARAMS_SIZE} bytes`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return {
    success: true,
    data: params as Record<string, string | number | boolean | null>,
  };
}

function validateId(
  value: string,
  config: (typeof ID_VALIDATION)[keyof typeof ID_VALIDATION]
): ValidationResult<string> {
  if (value.length < config.minLength) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${config.fieldName} must be at least ${config.minLength} characters`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (value.length > config.maxLength) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${config.fieldName} must be at most ${config.maxLength} characters`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (!config.pattern.test(value)) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${config.fieldName} contains invalid characters (only alphanumeric, underscore, and hyphen allowed)`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return { success: true, data: value };
}

export function validateDeviceId(deviceId: string): ValidationResult<string> {
  return validateId(deviceId, ID_VALIDATION.deviceId);
}

export function validateSessionId(sessionId: string): ValidationResult<string> {
  return validateId(sessionId, ID_VALIDATION.sessionId);
}

export function validateDeviceProperties(
  properties: unknown
): ValidationResult<Record<string, string | number | boolean | null> | null> {
  if (properties === null || properties === undefined) {
    return { success: true, data: null };
  }

  if (typeof properties !== 'object' || Array.isArray(properties)) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: 'Properties must be a flat object with string keys',
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  const entries = Object.entries(properties);

  for (const [key, value] of entries) {
    if (key.length > MAX_PROPERTY_KEY_LENGTH) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `Property key '${key}' exceeds maximum length of ${MAX_PROPERTY_KEY_LENGTH}`,
          status: HttpStatus.BAD_REQUEST,
        },
      };
    }

    if (!isFlatValue(value)) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `Property '${key}' must be a string, number, boolean, or null. Nested objects/arrays are not allowed.`,
          status: HttpStatus.BAD_REQUEST,
        },
      };
    }
  }

  let jsonString: string;
  try {
    jsonString = JSON.stringify(properties);
  } catch (_error) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: 'Invalid properties: must be valid JSON',
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (jsonString.length > MAX_PROPERTIES_SIZE) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Properties too large: maximum ${MAX_PROPERTIES_SIZE} bytes`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return {
    success: true,
    data: properties as Record<string, string | number | boolean | null>,
  };
}

export function validatePropertySearchFilter(
  encodedFilter: string | undefined
): ValidationResult<PropertySearchCondition[] | null> {
  if (!encodedFilter) {
    return { success: true, data: null };
  }

  let decodedJson: string;
  try {
    decodedJson = Buffer.from(encodedFilter, 'base64').toString('utf-8');
  } catch {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: 'Invalid property filter encoding: must be valid base64',
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodedJson);
  } catch {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: 'Invalid property filter: must be valid JSON',
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  const result = PropertySearchFilterSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Invalid property filter: ${result.error.issues[0]?.message || 'validation failed'}`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return { success: true, data: result.data };
}

export function validateEventName(name: string): ValidationResult<string> {
  const config = ID_VALIDATION.eventName;

  if (name.length < config.minLength) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${config.fieldName} must be at least ${config.minLength} character`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (name.length > config.maxLength) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${config.fieldName} must be at most ${config.maxLength} characters`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  if (!config.pattern.test(name)) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `${config.fieldName} contains invalid characters (only alphanumeric, underscore, hyphen, dot, slash, and space allowed)`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return { success: true, data: name };
}
