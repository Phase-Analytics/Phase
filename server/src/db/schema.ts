import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    userIdIdx: index('session_user_id_idx').on(table.userId),
  })
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('account_user_id_idx').on(table.userId),
  })
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    identifierIdx: index('verification_identifier_idx').on(table.identifier),
  })
);

export const apikey = pgTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    start: text('start'),
    prefix: text('prefix'),
    key: text('key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: timestamp('last_refill_at'),
    enabled: boolean('enabled').default(true),
    rateLimitEnabled: boolean('rate_limit_enabled').default(false),
    rateLimitTimeWindow: integer('rate_limit_time_window').default(86_400_000),
    rateLimitMax: integer('rate_limit_max').default(10),
    requestCount: integer('request_count').default(0),
    remaining: integer('remaining'),
    lastRequest: timestamp('last_request'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    permissions: text('permissions'),
    metadata: text('metadata'),
  },
  (table) => ({
    userIdIdx: index('apikey_user_id_idx').on(table.userId),
    keyIdx: index('apikey_key_idx').on(table.key),
  })
);

export const devices = pgTable(
  'devices',
  {
    deviceId: text('device_id').primaryKey(),
    apiKeyId: text('api_key_id')
      .notNull()
      .references(() => apikey.id, { onDelete: 'cascade' }),
    identifier: text('identifier'),
    model: text('model'),
    osVersion: text('os_version'),
    platform: text('platform'),
    appVersion: text('app_version'),
    firstSeen: timestamp('first_seen').defaultNow().notNull(),
  },
  (table) => ({
    apiKeyIdIdx: index('devices_api_key_id_idx').on(table.apiKeyId),
    platformIdx: index('devices_platform_idx').on(table.platform),
  })
);

export const sessions = pgTable(
  'sessions_analytics',
  {
    sessionId: text('session_id').primaryKey(),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.deviceId, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at').notNull(),
    lastActivityAt: timestamp('last_activity_at').notNull(),
  },
  (table) => ({
    deviceStartedAtIdx: index('sessions_device_started_at_idx').on(
      table.deviceId,
      table.startedAt.desc()
    ),
    lastActivityAtIdx: index('sessions_analytics_last_activity_at_idx').on(
      table.lastActivityAt
    ),
  })
);

// Events and Errors tables migrated to QuestDB
// Type definitions kept for backward compatibility
export type Event = {
  eventId: string;
  sessionId: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  timestamp: Date;
};

export type NewEvent = Event;

export type ErrorLog = {
  errorId: string;
  sessionId: string;
  message: string;
  type: string;
  stackTrace: string | null;
  timestamp: Date;
};

export type NewErrorLog = ErrorLog;

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type ApiKey = typeof apikey.$inferSelect;
export type NewApiKey = typeof apikey.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type AnalyticsSession = typeof sessions.$inferSelect;
export type NewAnalyticsSession = typeof sessions.$inferInsert;
