
import { z } from 'zod';

// Enums
export const subscriptionPlanSchema = z.enum(['free', 'standard', 'pro']);
export const userRoleSchema = z.enum(['super_admin', 'label_admin', 'artist']);
export const distributionStatusSchema = z.enum(['pending', 'processing', 'live', 'failed', 'removed']);
export const platformSchema = z.enum(['spotify', 'apple_music', 'youtube_music', 'amazon_music', 'deezer']);
export const invitationStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired']);
export const royaltyReportPeriodSchema = z.enum(['monthly', 'quarterly', 'yearly']);

export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type DistributionStatus = z.infer<typeof distributionStatusSchema>;
export type Platform = z.infer<typeof platformSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type RoyaltyReportPeriod = z.infer<typeof royaltyReportPeriodSchema>;

// Tenant schema
export const tenantSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  logo_url: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  contact_email: z.string(),
  subscription_plan: subscriptionPlanSchema,
  max_artists: z.number().int(),
  max_works: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Tenant = z.infer<typeof tenantSchema>;

// Create tenant input schema
export const createTenantInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  logo_url: z.string().url().nullable(),
  website: z.string().url().nullable(),
  description: z.string().nullable(),
  contact_email: z.string().email(),
  subscription_plan: subscriptionPlanSchema,
  max_artists: z.number().int().positive(),
  max_works: z.number().int().positive()
});

export type CreateTenantInput = z.infer<typeof createTenantInputSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  tenant_id: z.number().nullable(),
  email: z.string(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  last_login: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Create user input schema
export const createUserInputSchema = z.object({
  tenant_id: z.number().nullable(),
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Artist schema
export const artistSchema = z.object({
  id: z.number(),
  tenant_id: z.number(),
  user_id: z.number().nullable(),
  stage_name: z.string(),
  legal_name: z.string().nullable(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  genres: z.array(z.string()),
  social_links: z.record(z.string()).nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Artist = z.infer<typeof artistSchema>;

// Create artist input schema
export const createArtistInputSchema = z.object({
  tenant_id: z.number(),
  user_id: z.number().nullable(),
  stage_name: z.string().min(1),
  legal_name: z.string().nullable(),
  bio: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  genres: z.array(z.string()),
  social_links: z.record(z.string()).nullable()
});

export type CreateArtistInput = z.infer<typeof createArtistInputSchema>;

// Work schema
export const workSchema = z.object({
  id: z.number(),
  tenant_id: z.number(),
  title: z.string(),
  artist_id: z.number(),
  album: z.string().nullable(),
  genre: z.string(),
  duration_seconds: z.number().int(),
  release_date: z.coerce.date().nullable(),
  isrc: z.string().nullable(),
  upc: z.string().nullable(),
  audio_url: z.string().nullable(),
  artwork_url: z.string().nullable(),
  lyrics: z.string().nullable(),
  distribution_status: distributionStatusSchema,
  is_explicit: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Work = z.infer<typeof workSchema>;

// Create work input schema
export const createWorkInputSchema = z.object({
  tenant_id: z.number(),
  title: z.string().min(1),
  artist_id: z.number(),
  album: z.string().nullable(),
  genre: z.string().min(1),
  duration_seconds: z.number().int().positive(),
  release_date: z.coerce.date().nullable(),
  isrc: z.string().nullable(),
  upc: z.string().nullable(),
  audio_url: z.string().url().nullable(),
  artwork_url: z.string().url().nullable(),
  lyrics: z.string().nullable(),
  is_explicit: z.boolean()
});

export type CreateWorkInput = z.infer<typeof createWorkInputSchema>;

// Royalty split schema
export const royaltySplitSchema = z.object({
  id: z.number(),
  work_id: z.number(),
  recipient_type: z.enum(['artist', 'writer', 'producer', 'label']),
  recipient_id: z.number(),
  percentage: z.number(),
  role_description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type RoyaltySplit = z.infer<typeof royaltySplitSchema>;

// Create royalty split input schema
export const createRoyaltySplitInputSchema = z.object({
  work_id: z.number(),
  recipient_type: z.enum(['artist', 'writer', 'producer', 'label']),
  recipient_id: z.number(),
  percentage: z.number().min(0).max(100),
  role_description: z.string().nullable()
});

export type CreateRoyaltySplitInput = z.infer<typeof createRoyaltySplitInputSchema>;

// Royalty report schema
export const royaltyReportSchema = z.object({
  id: z.number(),
  tenant_id: z.number(),
  platform: platformSchema,
  period_type: royaltyReportPeriodSchema,
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  total_streams: z.number().int(),
  total_revenue: z.number(),
  processed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type RoyaltyReport = z.infer<typeof royaltyReportSchema>;

// Work earnings schema
export const workEarningsSchema = z.object({
  id: z.number(),
  work_id: z.number(),
  royalty_report_id: z.number(),
  platform: platformSchema,
  streams: z.number().int(),
  revenue: z.number(),
  created_at: z.coerce.date()
});

export type WorkEarnings = z.infer<typeof workEarningsSchema>;

// Subscription schema
export const subscriptionSchema = z.object({
  id: z.number(),
  tenant_id: z.number(),
  plan: subscriptionPlanSchema,
  status: z.enum(['active', 'cancelled', 'past_due', 'unpaid']),
  current_period_start: z.coerce.date(),
  current_period_end: z.coerce.date(),
  cancel_at_period_end: z.boolean(),
  stripe_subscription_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Subscription = z.infer<typeof subscriptionSchema>;

// Invitation schema
export const invitationSchema = z.object({
  id: z.number(),
  tenant_id: z.number(),
  email: z.string(),
  role: userRoleSchema,
  status: invitationStatusSchema,
  invited_by: z.number(),
  token: z.string(),
  expires_at: z.coerce.date(),
  accepted_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invitation = z.infer<typeof invitationSchema>;

// Create invitation input schema
export const createInvitationInputSchema = z.object({
  tenant_id: z.number(),
  email: z.string().email(),
  role: userRoleSchema,
  invited_by: z.number()
});

export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

// Analytics schemas
export const tenantAnalyticsSchema = z.object({
  total_artists: z.number().int(),
  total_works: z.number().int(),
  total_streams: z.number().int(),
  total_revenue: z.number(),
  monthly_growth: z.number(),
  top_performing_works: z.array(z.object({
    work_id: z.number(),
    title: z.string(),
    artist_name: z.string(),
    streams: z.number().int(),
    revenue: z.number()
  }))
});

export type TenantAnalytics = z.infer<typeof tenantAnalyticsSchema>;

export const artistAnalyticsSchema = z.object({
  artist_id: z.number(),
  total_works: z.number().int(),
  total_streams: z.number().int(),
  total_revenue: z.number(),
  monthly_streams: z.array(z.object({
    month: z.string(),
    streams: z.number().int(),
    revenue: z.number()
  })),
  platform_breakdown: z.array(z.object({
    platform: platformSchema,
    streams: z.number().int(),
    revenue: z.number()
  }))
});

export type ArtistAnalytics = z.infer<typeof artistAnalyticsSchema>;
