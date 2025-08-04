
import { db } from '../db';
import { worksTable } from '../db/schema';
import { type Work } from '../schema';
import { eq } from 'drizzle-orm';

export const getWorksByArtist = async (artistId: number): Promise<Work[]> => {
  try {
    const results = await db.select()
      .from(worksTable)
      .where(eq(worksTable.artist_id, artistId))
      .execute();

    // Convert date fields and return as Work objects
    return results.map(work => ({
      ...work,
      release_date: work.release_date ? new Date(work.release_date) : null,
      created_at: new Date(work.created_at),
      updated_at: new Date(work.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch works by artist:', error);
    throw error;
  }
};
