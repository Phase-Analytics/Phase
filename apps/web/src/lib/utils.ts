import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatChange(change: number): string {
  if (change === 0) {
    return 'No change';
  }

  return change > 0 ? `+${change}` : `${change}`;
}
