import type { SQL } from 'drizzle-orm';
import { type AnyColumn, and, gte, lte } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '@/db';
import type { apikey, devices, sessions } from '@/db/schema';
import { badRequest } from '@/lib/response';
import { ErrorCode } from '@/types/codes';

const MAX_PAGE_SIZE = 100;

export type ValidationResult<T = void> =
  | { success: true; data: T }
  | { success: false; response: Response };

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
      response: badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid page parameter: must be a positive integer'
      ),
    };
  }

  if (Number.isNaN(pageSize) || pageSize < 1) {
    return {
      success: false,
      response: badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid pageSize parameter: must be a positive integer'
      ),
    };
  }

  if (pageSize > MAX_PAGE_SIZE) {
    return {
      success: false,
      response: badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        `Invalid pageSize parameter: must be between 1 and ${MAX_PAGE_SIZE}`
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
  fieldName = 'timestamp',
  maxDiffMs = 60 * 60 * 1000
): ValidationResult<Date> {
  const clientTimestamp = new Date(timestampStr);

  if (Number.isNaN(clientTimestamp.getTime())) {
    return {
      success: false,
      response: badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        `Invalid ${fieldName} format`
      ),
    };
  }

  const serverTimestamp = new Date();
  const timeDiffMs = Math.abs(
    serverTimestamp.getTime() - clientTimestamp.getTime()
  );

  if (timeDiffMs > maxDiffMs) {
    const maxDiffHours = maxDiffMs / (60 * 60 * 1000);
    return {
      success: false,
      response: badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        `${fieldName} is too far from server time (max ${maxDiffHours} hour difference)`
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
      response: badRequest(c, ErrorCode.VALIDATION_ERROR, 'API key not found'),
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
      response: badRequest(c, ErrorCode.VALIDATION_ERROR, 'Device not found'),
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
      response: badRequest(c, ErrorCode.VALIDATION_ERROR, 'Session not found'),
    };
  }

  return {
    success: true,
    data: session,
  };
}

export function buildFilters<T extends AnyColumn>(options: {
  filters: SQL[];
  startDateColumn?: T;
  startDateValue?: string;
  endDateColumn?: T;
  endDateValue?: string;
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
    const startDate = new Date(startDateValue);
    if (Number.isNaN(startDate.getTime())) {
      throw new TypeError(
        `Invalid startDateValue: "${startDateValue}" is not a valid date`
      );
    }
    combined.push(gte(startDateColumn, startDate));
  }

  if (endDateColumn && endDateValue) {
    const endDate = new Date(endDateValue);
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
