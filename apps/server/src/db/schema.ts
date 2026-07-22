import type {
  ExploreSqlQuery,
  FunnelCustomStep,
  LinkDomainDnsRecord,
} from '@phase/shared';
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

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
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    identifierIdx: index('verification_identifier_idx').on(table.identifier),
  })
);

export const waitlist = pgTable(
  'waitlist',
  {
    id: text('id').primaryKey(),
    emailHash: text('email_hash').notNull().unique(),
    encryptedEmail: text('encrypted_email').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    emailHashIdx: index('waitlist_email_hash_idx').on(table.emailHash),
    createdAtIdx: index('waitlist_created_at_idx').on(table.createdAt.desc()),
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
    keyRotatedAt: timestamp('key_rotated_at'),
    memberIds: text('member_ids').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdCreatedAtIdx: index('apps_user_id_created_at_idx').on(
      table.userId,
      table.createdAt.desc()
    ),
    memberIdsIdx: index('apps_member_ids_idx').using('gin', table.memberIds),
  })
);

export const publicApiTokens = pgTable(
  'public_api_tokens',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    tokenPrefix: text('token_prefix').notNull(),
    scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
    expiresAt: timestamp('expires_at'),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    appIdIdx: index('public_api_tokens_app_id_idx').on(table.appId),
    createdByUserIdIdx: index('public_api_tokens_created_by_user_id_idx').on(
      table.createdByUserId
    ),
    createdAtIdx: index('public_api_tokens_created_at_idx').on(
      table.createdAt.desc()
    ),
  })
);

export const devices = pgTable(
  'devices',
  {
    deviceId: text('device_id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    osVersion: text('os_version'),
    platform: text('platform'),
    locale: text('locale'),
    model: text('model'),
    country: text('country'),
    properties: jsonb('properties').$type<Record<
      string,
      string | number | boolean | null
    > | null>(),
    firstSeen: timestamp('first_seen').defaultNow().notNull(),
  },
  (table) => ({
    appIdIdx: index('devices_app_id_idx').on(table.appId),
    appIdFirstSeenIdx: index('devices_app_id_first_seen_idx').on(
      table.appId,
      table.firstSeen.desc()
    ),
    propertiesIdx: index('devices_properties_idx').using(
      'gin',
      table.properties
    ),
  })
);

export const linkDomains = pgTable(
  'link_domains',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    hostname: text('hostname').notNull().unique(),
    status: text('status').notNull().default('pending'),
    providerId: text('provider_id'),
    providerStatus: text('provider_status'),
    verificationStatus: text('verification_status'),
    certificateStatus: text('certificate_status'),
    ownershipToken: text('ownership_token'),
    ownershipVerifiedAt: timestamp('ownership_verified_at'),
    legacyVerified: boolean('legacy_verified').notNull().default(false),
    dnsRecords: jsonb('dns_records')
      .$type<LinkDomainDnsRecord[]>()
      .notNull()
      .default([]),
    lastCheckAt: timestamp('last_check_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    appIdIdx: index('link_domains_app_id_idx').on(table.appId),
    hostnameIdx: index('link_domains_hostname_idx').on(table.hostname),
    idAppIdUnique: uniqueIndex('link_domains_id_app_id_unique').on(
      table.id,
      table.appId
    ),
  })
);

export const links = pgTable(
  'links',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    domainId: text('domain_id'),
    slug: text('slug').notNull(),
    name: text('name'),
    destinationUrl: text('destination_url').notNull(),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmTerm: text('utm_term'),
    utmContent: text('utm_content'),
    deviceIosUrl: text('device_ios_url'),
    deviceAndroidUrl: text('device_android_url'),
    deviceOthersUrl: text('device_others_url'),
    ogTitle: text('og_title'),
    ogDescription: text('og_description'),
    ogImageUrl: text('og_image_url'),
    expiresAt: timestamp('expires_at'),
    disabledAt: timestamp('disabled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    appIdCreatedAtIdx: index('links_app_id_created_at_idx').on(
      table.appId,
      table.createdAt.desc()
    ),
    defaultSlugUnique: uniqueIndex('links_default_slug_unique')
      .on(table.slug)
      .where(sql`${table.domainId} IS NULL`),
    domainSlugUnique: uniqueIndex('links_domain_slug_unique')
      .on(table.domainId, table.slug)
      .where(sql`${table.domainId} IS NOT NULL`),
    domainAppFk: foreignKey({
      columns: [table.domainId, table.appId],
      foreignColumns: [linkDomains.id, linkDomains.appId],
      name: 'links_domain_id_app_id_link_domains_fk',
    }).onDelete('restrict'),
  })
);

export const explorePresets = pgTable(
  'explore_presets',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    query: jsonb('query').$type<ExploreSqlQuery>().notNull(),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    appIdUpdatedAtIdx: index('explore_presets_app_id_updated_at_idx').on(
      table.appId,
      table.updatedAt.desc()
    ),
  })
);

export const funnelPresets = pgTable(
  'funnel_presets',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    steps: jsonb('steps').$type<FunnelCustomStep[]>().notNull(),
    windowHours: integer('window_hours').notNull().default(168),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    appIdUpdatedAtIdx: index('funnel_presets_app_id_updated_at_idx').on(
      table.appId,
      table.updatedAt.desc()
    ),
  })
);

export const policies = pgTable(
  'policies',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    linkId: text('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    date: date('date').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    linkIdUnique: uniqueIndex('policies_link_id_unique').on(table.linkId),
    appIdCreatedAtIdx: index('policies_app_id_created_at_idx').on(
      table.appId,
      table.createdAt.desc()
    ),
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
    startedAtIdx: index('sessions_started_at_idx').on(table.startedAt.desc()),
    lastActivityAtIdx: index('sessions_analytics_last_activity_at_idx').on(
      table.lastActivityAt.desc()
    ),
    deviceLastActivityIdx: index('sessions_device_last_activity_idx').on(
      table.deviceId,
      table.lastActivityAt.desc()
    ),
  })
);

export const appRelations = relations(apps, ({ one, many }) => ({
  user: one(user, {
    fields: [apps.userId],
    references: [user.id],
  }),
  devices: many(devices),
  publicApiTokens: many(publicApiTokens),
  explorePresets: many(explorePresets),
  funnelPresets: many(funnelPresets),
  links: many(links),
  linkDomains: many(linkDomains),
  policies: many(policies),
}));

export const policiesRelations = relations(policies, ({ one }) => ({
  app: one(apps, {
    fields: [policies.appId],
    references: [apps.id],
  }),
  link: one(links, {
    fields: [policies.linkId],
    references: [links.id],
  }),
}));

export const linksRelations = relations(links, ({ one }) => ({
  app: one(apps, {
    fields: [links.appId],
    references: [apps.id],
  }),
  domain: one(linkDomains, {
    fields: [links.domainId],
    references: [linkDomains.id],
  }),
}));

export const linkDomainsRelations = relations(linkDomains, ({ one, many }) => ({
  app: one(apps, {
    fields: [linkDomains.appId],
    references: [apps.id],
  }),
  links: many(links),
}));

export const explorePresetsRelations = relations(explorePresets, ({ one }) => ({
  app: one(apps, {
    fields: [explorePresets.appId],
    references: [apps.id],
  }),
  createdByUser: one(user, {
    fields: [explorePresets.createdByUserId],
    references: [user.id],
  }),
}));

export const funnelPresetsRelations = relations(funnelPresets, ({ one }) => ({
  app: one(apps, {
    fields: [funnelPresets.appId],
    references: [apps.id],
  }),
  createdByUser: one(user, {
    fields: [funnelPresets.createdByUserId],
    references: [user.id],
  }),
}));

export const deviceRelations = relations(devices, ({ one, many }) => ({
  app: one(apps, {
    fields: [devices.appId],
    references: [apps.id],
  }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  device: one(devices, {
    fields: [sessions.deviceId],
    references: [devices.deviceId],
  }),
}));

export const publicApiTokensRelations = relations(
  publicApiTokens,
  ({ one }) => ({
    app: one(apps, {
      fields: [publicApiTokens.appId],
      references: [apps.id],
    }),
    createdByUser: one(user, {
      fields: [publicApiTokens.createdByUserId],
      references: [user.id],
    }),
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

export type PublicApiToken = typeof publicApiTokens.$inferSelect;
export type NewPublicApiToken = typeof publicApiTokens.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type AnalyticsSession = typeof sessions.$inferSelect;
export type NewAnalyticsSession = typeof sessions.$inferInsert;

export type Waitlist = typeof waitlist.$inferSelect;
export type NewWaitlist = typeof waitlist.$inferInsert;

export type ExplorePresetRow = typeof explorePresets.$inferSelect;
export type NewExplorePresetRow = typeof explorePresets.$inferInsert;

export type FunnelPresetRow = typeof funnelPresets.$inferSelect;
export type NewFunnelPresetRow = typeof funnelPresets.$inferInsert;

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;

export type LinkDomain = typeof linkDomains.$inferSelect;
export type NewLinkDomain = typeof linkDomains.$inferInsert;
