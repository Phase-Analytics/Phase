import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  32
);

const numericNanoid = customAlphabet('0123456789', 14);

export function generateAppKey(): string {
  return `telemetra_${nanoid()}`;
}

export function generateAppId(): string {
  return numericNanoid();
}
