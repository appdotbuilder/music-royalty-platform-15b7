
import { db } from '../db';
import { artistsTable, usersTable } from '../db/schema';
import { type Artist } from '../schema';
import { eq } from 'drizzle-orm';

export async function getArtistsByTenant(tenantId: number): Promise<Artist[]> {
  try {
    const results = await db.select()
      .from(artistsTable)
      .leftJoin(usersTable, eq(artistsTable.user_id, usersTable.id))
      .where(eq(artistsTable.tenant_id, tenantId))
      .execute();

    return results.map(result => ({
      id: result.artists.id,
      tenant_id: result.artists.tenant_id,
      user_id: result.artists.user_id,
      stage_name: result.artists.stage_name,
      legal_name: result.artists.legal_name,
      bio: result.artists.bio,
      avatar_url: result.artists.avatar_url,
      genres: result.artists.genres as string[], // Cast JSONB to string array
      social_links: result.artists.social_links as Record<string, string> | null, // Cast JSONB to Record
      is_active: result.artists.is_active,
      created_at: result.artists.created_at,
      updated_at: result.artists.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch artists by tenant:', error);
    throw error;
  }
}
