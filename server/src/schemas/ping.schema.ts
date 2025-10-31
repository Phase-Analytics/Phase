import { z } from '@hono/zod-openapi';

export const pingSessionRequestSchema = z
  .object({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:30:00Z' }),
  })
  .openapi('PingSessionRequest');

export const pingSessionResponseSchema = z
  .object({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    lastActivityAt: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:30:00Z' }),
  })
  .openapi('PingSessionResponse');

export type PingSessionRequest = z.infer<typeof pingSessionRequestSchema>;
export type PingSessionResponse = z.infer<typeof pingSessionResponseSchema>;
