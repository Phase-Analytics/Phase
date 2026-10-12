import type { BatchItem } from '@phase/shared';
import { decodeTime } from 'ulid';

export function shouldRejectBatch(items: BatchItem[]): {
  reject: boolean;
  reason: string;
} {
  const deviceIds = new Set<string>();
  let eventCount = 0;

  for (const item of items) {
    if (item.type === 'device') {
      deviceIds.add(item.payload.deviceId);
    } else if (item.type === 'session') {
      deviceIds.add(item.payload.deviceId);
    } else if (item.type === 'event') {
      eventCount++;
    }
  }

  if (deviceIds.size > 1) {
    return {
      reject: true,
      reason: `Batch contains multiple devices: ${deviceIds.size}`,
    };
  }

  if (deviceIds.size === 0) {
    return { reject: false, reason: '' };
  }

  const deviceId = Array.from(deviceIds)[0];

  let deviceCreatedAt: number;
  try {
    deviceCreatedAt = decodeTime(deviceId);
  } catch {
    return {
      reject: true,
      reason: 'Invalid device ID format',
    };
  }

  const deviceAge = Date.now() - deviceCreatedAt;
  if (deviceAge < 5 * 60 * 1000 && eventCount >= 100) {
    return {
      reject: true,
      reason: `New device (${Math.round(deviceAge / 1000)}s old) with ${eventCount} events`,
    };
  }

  return { reject: false, reason: '' };
}
