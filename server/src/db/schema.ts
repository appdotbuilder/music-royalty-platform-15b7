
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  jsonb,
  date,
  real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'standard', 'pro']);
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'label_admin', 'artist']);
export const distributionStatusEnum = pgEnum('distribution_status', ['pending', 'processing', 'live', 'failed', 'removed']);
export const platformEnum = pgEnum('platform', ['spotify', 'apple_music', 'youtube_music', 'amazon_music', 'deezer']);
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'declined', 'expired']);
export const royaltyReportPeriodEnum = pgEnum('royalty_report_period', ['monthly', 'quarterly', 'yearly']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'past_due', 'unpaid']);
export const recipientTypeEnum = pgEnum('recipient_type', ['artist', 'writer', 'producer', 'label']);

// Tenants table
export const tenantsTable = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo_url: text('logo_url'),
  website: text('website'),
  description: text('description'),
  contact_email: text('contact_email').notNull(),
  subscription_plan: subscriptionPlanEnum('subscription_plan').notNull().default('free'),
  max_artists: integer('max_artists').notNull().default(5),
  max_works: integer('max_works').notNull().default(50),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id').references(() => tenantsTable.id),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Artists table
export const artistsTable = pgTable('artists', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id').notNull().references(() => tenantsTable.id),
  user_id: integer('user_id').references(() => usersTable.id),
  stage_name: text('stage_name').notNull(),
  legal_name: text('legal_name'),
  bio: text('bio'),
  avatar_url: text('avatar_url'),
  genres: jsonb('genres').$type<string[]>().notNull().default([]),
  social_links: jsonb('social_links').$type<Record<string, string>>(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Works table
export const worksTable = pgTable('works', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id').notNull().references(() => tenantsTable.id),
  title: text('title').notNull(),
  artist_id: integer('artist_id').notNull().references(() => artistsTable.id),
  album: text('album'),
  genre: text('genre').notNull(),
  duration_seconds: integer('duration_seconds').notNull(),
  release_date: date('release_date'),
  isrc: text('isrc'),
  upc: text('upc'),
  audio_url: text('audio_url'),
  artwork_url: text('artwork_url'),
  lyrics: text('lyrics'),
  distribution_status: distributionStatusEnum('distribution_status').notNull().default('pending'),
  is_explicit: boolean('is_explicit').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Royalty splits table
export const royaltySplitsTable = pgTable('royalty_splits', {
  id: serial('id').primaryKey(),
  work_id: integer('work_id').notNull().references(() => worksTable.id),
  recipient_type: recipientTypeEnum('recipient_type').notNull(),
  recipient_id: integer('recipient_id').notNull(),
  percentage: real('percentage').notNull(),
  role_description: text('role_description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Royalty reports table
export const royaltyReportsTable = pgTable('royalty_reports', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id').notNull().references(() => tenantsTable.id),
  platform: platformEnum('platform').notNull(),
  period_type: royaltyReportPeriodEnum('period_type').notNull(),
  period_start: date('period_start').notNull(),
  period_end: date('period_end').notNull(),
  total_streams: integer('total_streams').notNull().default(0),
  total_revenue: numeric('total_revenue', { precision: 10, scale: 2 }).notNull().default('0.00'),
  processed_at: timestamp('processed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Work earnings table
export const workEarningsTable = pgTable('work_earnings', {
  id: serial('id').primaryKey(),
  work_id: integer('work_id').notNull().references(() => worksTable.id),
  royalty_report_id: integer('royalty_report_id').notNull().references(() => royaltyReportsTable.id),
  platform: platformEnum('platform').notNull(),
  streams: integer('streams').notNull().default(0),
  revenue: numeric('revenue', { precision: 10, scale: 2 }).notNull().default('0.00'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Subscriptions table
export const subscriptionsTable = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id').notNull().references(() => tenantsTable.id),
  plan: subscriptionPlanEnum('plan').notNull(),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  current_period_start: date('current_period_start').notNull(),
  current_period_end: date('current_period_end').notNull(),
  cancel_at_period_end: boolean('cancel_at_period_end').notNull().default(false),
  stripe_subscription_id: text('stripe_subscription_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Invitations table
export const invitationsTable = pgTable('invitations', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id').notNull().references(() => tenantsTable.id),
  email: text('email').notNull(),
  role: userRoleEnum('role').notNull(),
  status: invitationStatusEnum('status').notNull().default('pending'),
  invited_by: integer('invited_by').notNull().references(() => usersTable.id),
  token: text('token').notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  accepted_at: timestamp('accepted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const tenantsRelations = relations(tenantsTable, ({ many, one }) => ({
  users: many(usersTable),
  artists: many(artistsTable),
  works: many(worksTable),
  royaltyReports: many(royaltyReportsTable),
  subscription: one(subscriptionsTable),
  invitations: many(invitationsTable)
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  tenant: one(tenantsTable, {
    fields: [usersTable.tenant_id],
    references: [tenantsTable.id]
  }),
  artist: one(artistsTable),
  sentInvitations: many(invitationsTable)
}));

export const artistsRelations = relations(artistsTable, ({ one, many }) => ({
  tenant: one(tenantsTable, {
    fields: [artistsTable.tenant_id],
    references: [tenantsTable.id]
  }),
  user: one(usersTable, {
    fields: [artistsTable.user_id],
    references: [usersTable.id]
  }),
  works: many(worksTable)
}));

export const worksRelations = relations(worksTable, ({ one, many }) => ({
  tenant: one(tenantsTable, {
    fields: [worksTable.tenant_id],
    references: [tenantsTable.id]
  }),
  artist: one(artistsTable, {
    fields: [worksTable.artist_id],
    references: [artistsTable.id]
  }),
  royaltySplits: many(royaltySplitsTable),
  earnings: many(workEarningsTable)
}));

export const royaltySplitsRelations = relations(royaltySplitsTable, ({ one }) => ({
  work: one(worksTable, {
    fields: [royaltySplitsTable.work_id],
    references: [worksTable.id]
  })
}));

export const royaltyReportsRelations = relations(royaltyReportsTable, ({ one, many }) => ({
  tenant: one(tenantsTable, {
    fields: [royaltyReportsTable.tenant_id],
    references: [tenantsTable.id]
  }),
  workEarnings: many(workEarningsTable)
}));

export const workEarningsRelations = relations(workEarningsTable, ({ one }) => ({
  work: one(worksTable, {
    fields: [workEarningsTable.work_id],
    references: [worksTable.id]
  }),
  royaltyReport: one(royaltyReportsTable, {
    fields: [workEarningsTable.royalty_report_id],
    references: [royaltyReportsTable.id]
  })
}));

export const subscriptionsRelations = relations(subscriptionsTable, ({ one }) => ({
  tenant: one(tenantsTable, {
    fields: [subscriptionsTable.tenant_id],
    references: [tenantsTable.id]
  })
}));

export const invitationsRelations = relations(invitationsTable, ({ one }) => ({
  tenant: one(tenantsTable, {
    fields: [invitationsTable.tenant_id],
    references: [tenantsTable.id]
  }),
  invitedBy: one(usersTable, {
    fields: [invitationsTable.invited_by],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  tenants: tenantsTable,
  users: usersTable,
  artists: artistsTable,
  works: worksTable,
  royaltySplits: royaltySplitsTable,
  royaltyReports: royaltyReportsTable,
  workEarnings: workEarningsTable,
  subscriptions: subscriptionsTable,
  invitations: invitationsTable
};
