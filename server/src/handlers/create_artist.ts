
import { db } from '../db';
import { artistsTable, tenantsTable } from '../db/schema';
import { type CreateArtistInput, type Artist } from '../schema';
import { eq } from 'drizzle-orm';

export const createArtist = async (input: CreateArtistInput): Promise<Artist> => {
  try {
    // First, validate tenant exists and check artist limits
    const tenant = await db.select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, input.tenant_id))
      .execute();

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    if (!tenant[0].is_active) {
      throw new Error('Tenant is not active');
    }

    // Check current artist count against limit
    const currentArtists = await db.select()
      .from(artistsTable)
      .where(eq(artistsTable.tenant_id, input.tenant_id))
      .execute();

    if (currentArtists.length >= tenant[0].max_artists) {
      throw new Error(`Artist limit reached. Maximum ${tenant[0].max_artists} artists allowed for this subscription plan.`);
    }

    // Insert artist record
    const result = await db.insert(artistsTable)
      .values({
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        stage_name: input.stage_name,
        legal_name: input.legal_name,
        bio: input.bio,
        avatar_url: input.avatar_url,
        genres: input.genres,
        social_links: input.social_links
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Artist creation failed:', error);
    throw error;
  }
};
