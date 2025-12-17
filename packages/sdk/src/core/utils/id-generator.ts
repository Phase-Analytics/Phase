import { ulid } from 'ulid';

export function generateDeviceId(): string {
  return ulid();
}

export function generateSessionId(): string {
  return ulid();
}
