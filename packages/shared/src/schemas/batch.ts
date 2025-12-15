import { z } from 'zod';
import { BATCH } from '../constants/validation';
import { CreateDeviceRequestSchema } from './device';
import { CreateEventRequestSchema } from './event';
import { CreateSessionRequestSchema } from './session';

export const BatchDeviceItemSchema = z.object({
  type: z.literal('device'),
  payload: CreateDeviceRequestSchema,
  clientOrder: z.number().min(0),
});

export const BatchSessionItemSchema = z.object({
  type: z.literal('session'),
  payload: CreateSessionRequestSchema,
  clientOrder: z.number().min(0),
});

export const BatchEventItemSchema = z.object({
  type: z.literal('event'),
  payload: CreateEventRequestSchema,
  clientOrder: z.number().min(0),
});

export const BatchItemSchema = z.union([
  BatchDeviceItemSchema,
  BatchSessionItemSchema,
  BatchEventItemSchema,
]);

export const BatchRequestSchema = z.object({
  items: z.array(BatchItemSchema).min(1).max(BATCH.MAX_SIZE),
});

export const BatchErrorSchema = z.object({
  clientOrder: z.number(),
  code: z.string(),
  detail: z.string(),
});

export const BatchResultItemSchema = z.object({
  clientOrder: z.number(),
  type: z.enum(['device', 'session', 'event']),
  id: z.string(),
});

export const BatchResponseSchema = z.object({
  processed: z.number().min(0),
  failed: z.number().min(0),
  errors: z.array(BatchErrorSchema),
  results: z.array(BatchResultItemSchema),
});

export type BatchDeviceItem = z.infer<typeof BatchDeviceItemSchema>;
export type BatchSessionItem = z.infer<typeof BatchSessionItemSchema>;
export type BatchEventItem = z.infer<typeof BatchEventItemSchema>;
export type BatchItem = z.infer<typeof BatchItemSchema>;
export type BatchRequest = z.infer<typeof BatchRequestSchema>;
export type BatchError = z.infer<typeof BatchErrorSchema>;
export type BatchResultItem = z.infer<typeof BatchResultItemSchema>;
export type BatchResponse = z.infer<typeof BatchResponseSchema>;
