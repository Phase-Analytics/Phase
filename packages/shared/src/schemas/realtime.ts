import { z } from 'zod';

export const RealtimeEventSchema = z.object({
  eventId: z.string(),
  deviceId: z.string(),
  name: z.string(),
  timestamp: z.string().datetime(),
  country: z.string().nullable(),
  platform: z.string().nullable(),
});

export const RealtimeSessionSchema = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  startedAt: z.string().datetime(),
  country: z.string().nullable(),
  platform: z.string().nullable(),
});

export const RealtimeDeviceSchema = z.object({
  deviceId: z.string(),
  country: z.string().nullable(),
  platform: z.string().nullable(),
});

export const OnlineUsersSchema = z.object({
  total: z.number().min(0),
  platforms: z.record(z.string(), z.number().min(1)),
  countries: z.record(z.string(), z.number().min(1)),
});

export const RealtimeMessageSchema = z.object({
  timestamp: z.string().datetime(),
  appName: z.string().optional(),
  events: z.array(RealtimeEventSchema),
  sessions: z.array(RealtimeSessionSchema),
  devices: z.array(RealtimeDeviceSchema),
  onlineUsers: OnlineUsersSchema,
});

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
export type RealtimeSession = z.infer<typeof RealtimeSessionSchema>;
export type RealtimeDevice = z.infer<typeof RealtimeDeviceSchema>;
export type OnlineUsers = z.infer<typeof OnlineUsersSchema>;
export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;
