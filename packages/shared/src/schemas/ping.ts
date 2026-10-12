import { z } from 'zod';
import { SESSION_ID } from '../constants/validation';

export const PingSessionRequestSchema = z.object({
  sessionId: z
    .string()
    .min(SESSION_ID.MIN_LENGTH)
    .max(SESSION_ID.MAX_LENGTH)
    .regex(SESSION_ID.PATTERN),
  timestamp: z.string().datetime(),
});

export const PingSessionResponseSchema = z.object({
  sessionId: z.string(),
  lastActivityAt: z.string().datetime(),
});

export type PingSessionRequest = z.infer<typeof PingSessionRequestSchema>;
export type PingSessionResponse = z.infer<typeof PingSessionResponseSchema>;
