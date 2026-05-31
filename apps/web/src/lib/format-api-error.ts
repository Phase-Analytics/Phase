import { formatValidationDetail } from '@phase/shared';
import { ApiError } from '@/lib/api/client';

export function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return formatValidationDetail(error.message);
  }

  if (error instanceof Error) {
    return formatValidationDetail(error.message);
  }

  return 'Something went wrong';
}
