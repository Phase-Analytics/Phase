import type { SQL } from 'drizzle-orm';
import { type AnyColumn, and, count, eq, gte, lte } from 'drizzle-orm';
import type { Context } from 'hono';
import { db, devices, sessions } from '@/db';
import { ErrorCode, HttpStatus } from '@/schemas';

const MAX_PAGE_SIZE = 100;
const MAX_TIMESTAMP_AGE_MS = 30 * 60 * 1000;

export type ValidationResult<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPI TypedResponse compatibility requires any
  | { success: false; response: Response | any };

export type PaginationParams = {
  page: number;
  pageSize: number;
  offset: number;
};

export function validatePagination(
  c: Context,
  pageStr: string,
  pageSizeStr: string
): ValidationResult<PaginationParams> {
  const page = Number.parseInt(pageStr, 10);
  const pageSize = Number.parseInt(pageSizeStr, 10);

  if (Number.isNaN(page) || page < 1) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Invalid page parameter: must be a positive integer',
        },
        HttpStatus.BAD_REQUEST
      ),
    };
  }

  if (Number.isNaN(pageSize) || pageSize < 1) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Invalid pageSize parameter: must be a positive integer',
        },
        HttpStatus.BAD_REQUEST
      ),
    };
  }

  if (pageSize > MAX_PAGE_SIZE) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `Invalid pageSize parameter: must be between 1 and ${MAX_PAGE_SIZE}`,
        },
        HttpStatus.BAD_REQUEST
      ),
    };
  }

  const offset = (page - 1) * pageSize;

  return {
    success: true,
    data: { page, pageSize, offset },
  };
}

export function validateTimestamp(
  c: Context,
  timestampStr: string,
  fieldName = 'timestamp'
): ValidationResult<Date> {
  const clientTimestamp = new Date(timestampStr);

  if (Number.isNaN(clientTimestamp.getTime())) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `Invalid ${fieldName} format`,
        },
        HttpStatus.BAD_REQUEST
      ),
    };
  }

  const serverTimestamp = new Date();
  const timeDiffMs = serverTimestamp.getTime() - clientTimestamp.getTime();

  if (timeDiffMs > MAX_TIMESTAMP_AGE_MS) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `${fieldName} is too old (max 30 minutes old)`,
        },
        HttpStatus.BAD_REQUEST
      ),
    };
  }

  return {
    success: true,
    data: clientTimestamp,
  };
}

export async function validateDevice(
  c: Context,
  deviceId: string,
  appId?: string
): Promise<ValidationResult<typeof devices.$inferSelect>> {
  const device = await db.query.devices.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.deviceId, deviceId),
  });

  if (!device) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.NOT_FOUND,
          detail: 'Device not found',
        },
        HttpStatus.NOT_FOUND
      ),
    };
  }

  if (appId && device.appId !== appId) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.FORBIDDEN,
          detail: 'You do not have permission to access this device',
        },
        HttpStatus.FORBIDDEN
      ),
    };
  }

  return {
    success: true,
    data: device,
  };
}

export async function validateSession(
  c: Context,
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
      response: c.json(
        {
          code: ErrorCode.NOT_FOUND,
          detail: 'Session not found',
        },
        HttpStatus.NOT_FOUND
      ),
    };
  }

  if (appId && sessionData.device.appId !== appId) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.FORBIDDEN,
          detail: 'You do not have permission to access this session',
        },
        HttpStatus.FORBIDDEN
      ),
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
  c: Context,
  startDate?: string,
  endDate?: string
): ValidationResult<void> {
  if (startDate) {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return {
        success: false,
        response: c.json(
          {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Invalid startDate format',
          },
          HttpStatus.BAD_REQUEST
        ),
      };
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      return {
        success: false,
        response: c.json(
          {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Invalid endDate format',
          },
          HttpStatus.BAD_REQUEST
        ),
      };
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return {
        success: false,
        response: c.json(
          {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'startDate must be before or equal to endDate',
          },
          HttpStatus.BAD_REQUEST
        ),
      };
    }
  }

  return {
    success: true,
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

export async function getActiveSessionsCount(minutes = 5): Promise<number> {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

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
