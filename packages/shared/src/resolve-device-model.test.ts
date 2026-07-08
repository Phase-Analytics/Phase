import { describe, expect, test } from 'bun:test';
import {
  isAppleMachineId,
  resolveDeviceModel,
} from './resolve-device-model';

describe('resolveDeviceModel', () => {
  test('maps known Apple machine ids', () => {
    expect(resolveDeviceModel('iPhone17,1')).toBe('iPhone 16 Pro');
    expect(resolveDeviceModel('iPhone18,4')).toBe('iPhone Air');
    expect(resolveDeviceModel('iPad16,3')).toBe('iPad Pro 11-inch (M4)');
  });

  test('passes through marketing names and Android models', () => {
    expect(resolveDeviceModel('iPhone 15 Pro')).toBe('iPhone 15 Pro');
    expect(resolveDeviceModel('Pixel 8')).toBe('Pixel 8');
    expect(resolveDeviceModel('SM-S918B')).toBe('SM-S918B');
  });

  test('falls back to family name for unknown Apple ids', () => {
    expect(resolveDeviceModel('iPhone28,4')).toBe('iPhone');
    expect(resolveDeviceModel('iPad99,1')).toBe('iPad');
  });

  test('handles nullish and blank values', () => {
    expect(resolveDeviceModel(null)).toBeNull();
    expect(resolveDeviceModel(undefined)).toBeNull();
    expect(resolveDeviceModel('   ')).toBeNull();
  });
});

describe('isAppleMachineId', () => {
  test('detects Apple machine id shape', () => {
    expect(isAppleMachineId('iPhone17,1')).toBe(true);
    expect(isAppleMachineId('iPhone 17')).toBe(false);
    expect(isAppleMachineId('Pixel 8')).toBe(false);
  });
});
