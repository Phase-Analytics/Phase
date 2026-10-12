// Monotonic ULID generator (https://github.com/ulid/spec). The server decodes
// the timestamp from device IDs, so every ID here must be a valid ULID.

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

type CryptoLike = {
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

let lastTime = -1;
let lastRandom = '';

function randomChars(length: number): string {
  const cryptoObj = (globalThis as { crypto?: CryptoLike }).crypto;
  if (cryptoObj?.getRandomValues) {
    try {
      const bytes = cryptoObj.getRandomValues(new Uint8Array(length));
      let out = '';
      for (const byte of bytes) {
        // 256 is a multiple of 32, so masking keeps the distribution uniform.
        out += ENCODING[byte % 32];
      }
      return out;
    } catch {
      // Some polyfills throw without a secure source; use Math.random below.
    }
  }

  // Hermes has no crypto without a polyfill; previous releases (ulidx with
  // Math.random) used the same source.
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ENCODING[Math.floor(Math.random() * 32)];
  }
  return out;
}

function encodeTime(ms: number): string {
  let out = '';
  let remaining = ms;
  for (let i = 0; i < TIME_LENGTH; i++) {
    const mod = remaining % 32;
    out = ENCODING[mod] + out;
    remaining = (remaining - mod) / 32;
  }
  return out;
}

function incrementBase32(value: string): string | null {
  const chars = value.split('');
  for (let i = chars.length - 1; i >= 0; i--) {
    const index = ENCODING.indexOf(chars[i]);
    if (index < ENCODING.length - 1) {
      chars[i] = ENCODING[index + 1];
      return chars.join('');
    }
    chars[i] = ENCODING[0];
  }
  return null;
}

export function generateUlid(): string {
  const now = Date.now();

  if (now <= lastTime) {
    const next = incrementBase32(lastRandom);
    if (next) {
      lastRandom = next;
      return encodeTime(lastTime) + next;
    }
    lastTime += 1;
  } else {
    lastTime = now;
  }

  lastRandom = randomChars(RANDOM_LENGTH);
  return encodeTime(lastTime) + lastRandom;
}

export function generateDeviceId(): string {
  return generateUlid();
}

export function generateSessionId(): string {
  return generateUlid();
}

export function generateEventId(): string {
  return generateUlid();
}
