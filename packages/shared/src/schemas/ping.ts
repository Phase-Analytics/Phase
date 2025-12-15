import { z } from 'zod';

export const PingSessionRequestSchema = z.object({
  sessionId: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const PingSessionResponseSchema = z.object({
  sessionId: z.string(),
  lastActivityAt: z.string().datetime(),
});

export type PingSessionRequest = z.infer<typeof PingSessionRequestSchema>;
export type PingSessionResponse = z.infer<typeof PingSessionResponseSchema>;
