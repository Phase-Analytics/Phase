import { t } from 'elysia';

export const RealtimeEventSchema = t.Object({
  eventId: t.String(),
  deviceId: t.String(),
  name: t.String(),
  timestamp: t.String({ format: 'date-time' }),
});

export const RealtimeSessionSchema = t.Object({
  sessionId: t.String(),
  deviceId: t.String(),
  startedAt: t.String({ format: 'date-time' }),
});

export const RealtimeDeviceSchema = t.Object({
  deviceId: t.String(),
  country: t.Union([t.String(), t.Null()]),
});

export const OnlineUsersSchema = t.Object({
  total: t.Number({ minimum: 0 }),
  devices: t.Array(t.String()),
  platforms: t.Record(t.String(), t.Number({ minimum: 1 })),
  countries: t.Record(t.String(), t.Number({ minimum: 1 })),
});

export const RealtimeMessageSchema = t.Object({
  timestamp: t.String({ format: 'date-time' }),
  events: t.Array(RealtimeEventSchema),
  sessions: t.Array(RealtimeSessionSchema),
  devices: t.Array(RealtimeDeviceSchema),
  onlineUsers: OnlineUsersSchema,
});

export type RealtimeEvent = typeof RealtimeEventSchema.static;
export type RealtimeSession = typeof RealtimeSessionSchema.static;
export type RealtimeDevice = typeof RealtimeDeviceSchema.static;
export type OnlineUsers = typeof OnlineUsersSchema.static;
export type RealtimeMessage = typeof RealtimeMessageSchema.static;
