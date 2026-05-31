const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;
const EXPLORE_EVENT_NAME_REGEX = /^[\w./ -]+$/;

export function escapeQuestDbString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

export function assertQuestDbIdentifier(
  value: string,
  fieldName: string
): void {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new Error(
      `Invalid ${fieldName}: contains unexpected characters. Only alphanumeric, hyphens, and underscores are allowed.`
    );
  }
  if (value.length > 128) {
    throw new Error(`Invalid ${fieldName}: exceeds maximum length of 128`);
  }
}

export function assertExploreEventName(eventName: string): void {
  if (
    eventName.length < 1 ||
    eventName.length > 128 ||
    !EXPLORE_EVENT_NAME_REGEX.test(eventName)
  ) {
    throw new Error('Invalid event name');
  }
}
