import { ErrorCode, HttpStatus } from '@phase/shared';
import { type ValidationResult, validateDateRange } from '@/lib/validators';

export const MAX_REPORT_RANGE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Base date validation plus a span cap. When only startDate is given the span
 * is measured against now, matching how the range is resolved.
 */
export function validateReportDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  maxDays = MAX_REPORT_RANGE_DAYS,
  now = new Date()
): ValidationResult<void> {
  const baseValidation = validateDateRange(startDate, endDate);
  if (!(baseValidation.success && startDate)) {
    return baseValidation;
  }

  const end = endDate ? new Date(endDate) : now;
  if (end.getTime() - new Date(startDate).getTime() > maxDays * DAY_MS) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Date range cannot exceed ${maxDays} days`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return baseValidation;
}
