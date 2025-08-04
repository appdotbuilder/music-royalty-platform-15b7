
import { db } from '../db';
import { worksTable, tenantsTable, artistsTable } from '../db/schema';
import { type CreateWorkInput, type Work } from '../schema';
import { eq } from 'drizzle-orm';

export const createWork = async (input: CreateWorkInput): Promise<Work> => {
  try {
    // Verify tenant exists and check max_works limit
    const tenant = await db.select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, input.tenant_id))
      .execute();

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    // Verify artist exists and belongs to the tenant
    const artist = await db.select()
      .from(artistsTable)
      .where(eq(artistsTable.id, input.artist_id))
      .execute();

    if (artist.length === 0) {
      throw new Error('Artist not found');
    }

    if (artist[0].tenant_id !== input.tenant_id) {
      throw new Error('Artist does not belong to the specified tenant');
    }

    // Check current work count against tenant limit
    const currentWorksCount = await db.select()
      .from(worksTable)
      .where(eq(worksTable.tenant_id, input.tenant_id))
      .execute();

    if (currentWorksCount.length >= tenant[0].max_works) {
      throw new Error('Tenant has reached maximum number of works allowed');
    }

    // Convert Date to string for release_date (date column expects string)
    const releaseDate = input.release_date ? input.release_date.toISOString().split('T')[0] : null;

    // Insert the work record
    const result = await db.insert(worksTable)
      .values({
        tenant_id: input.tenant_id,
        title: input.title,
        artist_id: input.artist_id,
        album: input.album,
        genre: input.genre,
        duration_seconds: input.duration_seconds,
        release_date: releaseDate,
        isrc: input.isrc,
        upc: input.upc,
        audio_url: input.audio_url,
        artwork_url: input.artwork_url,
        lyrics: input.lyrics,
        is_explicit: input.is_explicit
      })
      .returning()
      .execute();

    // Convert string back to Date for release_date before returning
    const work = result[0];
    return {
      ...work,
      release_date: work.release_date ? new Date(work.release_date) : null
    };
  } catch (error) {
    console.error('Work creation failed:', error);
    throw error;
  }
};
