
import { db } from '../db';
import { worksTable, artistsTable } from '../db/schema';
import { type Work } from '../schema';
import { eq } from 'drizzle-orm';

export async function getWorksByTenant(tenantId: number): Promise<Work[]> {
  try {
    // Query works with artist information for the specific tenant
    const results = await db.select({
      id: worksTable.id,
      tenant_id: worksTable.tenant_id,
      title: worksTable.title,
      artist_id: worksTable.artist_id,
      album: worksTable.album,
      genre: worksTable.genre,
      duration_seconds: worksTable.duration_seconds,
      release_date: worksTable.release_date,
      isrc: worksTable.isrc,
      upc: worksTable.upc,
      audio_url: worksTable.audio_url,
      artwork_url: worksTable.artwork_url,
      lyrics: worksTable.lyrics,
      distribution_status: worksTable.distribution_status,
      is_explicit: worksTable.is_explicit,
      created_at: worksTable.created_at,
      updated_at: worksTable.updated_at
    })
    .from(worksTable)
    .innerJoin(artistsTable, eq(worksTable.artist_id, artistsTable.id))
    .where(eq(worksTable.tenant_id, tenantId))
    .execute();

    // Convert date strings to Date objects to match the Work schema
    return results.map(work => ({
      ...work,
      release_date: work.release_date ? new Date(work.release_date) : null
    }));
  } catch (error) {
    console.error('Failed to fetch works by tenant:', error);
    throw error;
  }
}
