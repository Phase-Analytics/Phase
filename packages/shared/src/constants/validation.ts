export const APP_NAME = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 20,
  PATTERN: /^[a-zA-Z0-9\s-]+$/,
} as const;

export const DEVICE_ID = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  PATTERN: /^[\w-]+$/,
} as const;

export const SESSION_ID = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  PATTERN: /^[\w-]+$/,
} as const;

// ULID: 48-bit timestamp + 80-bit randomness, Crockford base32. The first
// character is limited to 0-7 because the timestamp must fit in 48 bits.
export const EVENT_ID = {
  LENGTH: 26,
  PATTERN: /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i,
} as const;

export const EVENT_NAME = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 256,
  PATTERN: /^[\w./ -]+$/,
} as const;

export const VERSION = {
  OS_VERSION_MAX_LENGTH: 64,
} as const;

export const LOCALE = {
  MAX_LENGTH: 10,
} as const;

export const EVENT_PARAMS = {
  MAX_SIZE: 8192,
  MAX_KEYS: 32,
  MAX_KEY_LENGTH: 32,
  MAX_STRING_VALUE_LENGTH: 256,
  MAX_DEPTH: 6,
} as const;

export const BATCH = {
  MAX_SIZE: 1000,
} as const;
