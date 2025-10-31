import type { SQL } from 'drizzle-orm';
import { type AnyColumn, and, count, gte, lte } from 'drizzle-orm';
import type { Context } from 'hono';
import { db, sessions } from '@/db';
import type { apikey, devices } from '@/db/schema';
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

export async function validateApiKey(
  c: Context,
  apikeyId: string
): Promise<ValidationResult<typeof apikey.$inferSelect>> {
  const key = await db.query.apikey.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.id, apikeyId),
  });

  if (!key) {
    return {
      success: false,
      response: c.json(
        {
          code: ErrorCode.NOT_FOUND,
          detail: 'API key not found',
        },
        HttpStatus.NOT_FOUND
      ),
    };
  }

  return {
    success: true,
    data: key,
  };
}

export async function validateDevice(
  c: Context,
  deviceId: string
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

  return {
    success: true,
    data: device,
  };
}

export async function validateSession(
  c: Context,
  sessionId: string
): Promise<ValidationResult<typeof sessions.$inferSelect>> {
  const session = await db.query.sessions.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.sessionId, sessionId),
  });

  if (!session) {
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

  return {
    success: true,
    data: session,
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
