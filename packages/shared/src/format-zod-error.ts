import type { ZodError } from 'zod';

type ZodIssue = ZodError['issues'][number];

const FIELD_LABELS: Record<string, string> = {
  slug: 'Link',
  destinationUrl: 'Destination URL',
  deviceIosUrl: 'iOS URL',
  deviceAndroidUrl: 'Android URL',
  deviceOthersUrl: 'Other devices URL',
  expiresAt: 'Expires',
  hostname: 'Domain',
  utmSource: 'UTM source',
  utmMedium: 'UTM medium',
  utmCampaign: 'UTM campaign',
  utmTerm: 'UTM term',
  utmContent: 'UTM content',
};

function getFieldLabel(path: PropertyKey[]): string {
  const key = path.map(String).join('.');
  return FIELD_LABELS[key] ?? key;
}

function formatIssue(issue: ZodIssue): string {
  const field = getFieldLabel(issue.path);

  if (issue.message && !issue.message.startsWith('[')) {
    if (issue.code === 'custom' || issue.code === 'invalid_format') {
      return `${field}: ${issue.message}`;
    }
    if (issue.code === 'too_small' && issue.origin === 'string') {
      return `${field} must be at least ${issue.minimum} characters`;
    }
    if (issue.code === 'too_big' && issue.origin === 'string') {
      return `${field} must be at most ${issue.maximum} characters`;
    }
    if (issue.message.includes(field) || issue.message.length < 80) {
      return issue.message;
    }
  }

  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'string') {
        return `${field} must be at least ${issue.minimum} characters`;
      }
      return `${field} is too small`;
    case 'too_big':
      if (issue.origin === 'string') {
        return `${field} must be at most ${issue.maximum} characters`;
      }
      return `${field} is too large`;
    case 'invalid_format':
      if (issue.format === 'url') {
        return `${field} must be a valid URL`;
      }
      if (issue.format === 'datetime') {
        return `${field} must be a valid date`;
      }
      return issue.message || `${field} is invalid`;
    case 'invalid_type':
      return `${field} is invalid`;
    default:
      return issue.message || `${field} is invalid`;
  }
}

export function formatZodError(error: ZodError): string {
  const messages = error.issues.map(formatIssue);
  return messages[0] ?? 'Validation failed';
}

export function formatValidationDetail(detail: string): string {
  const trimmed = detail.trim();
  if (!trimmed.startsWith('[')) {
    return detail;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      return detail;
    }

    const messages = parsed
      .map((issue) => {
        if (!issue || typeof issue !== 'object') {
          return null;
        }
        return formatIssue(issue as ZodIssue);
      })
      .filter((message): message is string => Boolean(message));

    return messages[0] ?? detail;
  } catch {
    return detail;
  }
}
