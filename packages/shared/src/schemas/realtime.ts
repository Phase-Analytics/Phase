import { z } from 'zod';

export const RealtimeEventSchema = z.object({
  eventId: z.string(),
  deviceId: z.string(),
  name: z.string(),
  isScreen: z.boolean(),
  isDebug: z.boolean(),
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

export const RealtimeLinkClickSchema = z.object({
  clickId: z.string(),
  linkId: z.string(),
  timestamp: z.string().datetime(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
  os: z.string(),
  browser: z.string(),
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
  linkClicks: z.array(RealtimeLinkClickSchema),
  onlineUsers: OnlineUsersSchema,
});

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
export type RealtimeSession = z.infer<typeof RealtimeSessionSchema>;
export type RealtimeDevice = z.infer<typeof RealtimeDeviceSchema>;
export type RealtimeLinkClick = z.infer<typeof RealtimeLinkClickSchema>;
export type OnlineUsers = z.infer<typeof OnlineUsersSchema>;
export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;
