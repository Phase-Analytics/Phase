import { createHash, randomUUID } from 'node:crypto';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  32
);

const numericNanoid = customAlphabet('0123456789', 15);

export function generateAppKey(): string {
  return `phase_${nanoid()}`;
}

export function generateAppId(): string {
  return numericNanoid();
}

export function generatePublicApiToken(): string {
  return `phase_private_${nanoid()}`;
}

export function hashPublicApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getPublicApiTokenPrefix(token: string): string {
  return token.slice(0, Math.min(token.length, 18));
}

export function generatePublicApiTokenId(): string {
  return randomUUID();
}
