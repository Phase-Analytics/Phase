import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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

export const apps = pgTable(
  'apps',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    image: text('image'),
    key: text('key').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('apps_user_id_idx').on(table.userId),
    keyIdx: index('apps_key_idx').on(table.key),
  })
);

export const devices = pgTable(
  'devices',
  {
    deviceId: text('device_id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    identifier: text('identifier'),
    model: text('model'),
    osVersion: text('os_version'),
    platform: text('platform'),
    appVersion: text('app_version'),
    firstSeen: timestamp('first_seen').defaultNow().notNull(),
  },
  (table) => ({
    appIdIdx: index('devices_app_id_idx').on(table.appId),
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

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type AnalyticsSession = typeof sessions.$inferSelect;
export type NewAnalyticsSession = typeof sessions.$inferInsert;
