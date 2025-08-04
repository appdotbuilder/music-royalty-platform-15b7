
import { db } from '../db';
import { worksTable, artistsTable } from '../db/schema';
import { type Work } from '../schema';
import { eq } from 'drizzle-orm';

export async function distributeWork(workId: number, platforms: string[]): Promise<Work> {
  try {
    // Validate work exists and get current data
    const works = await db.select()
      .from(worksTable)
      .innerJoin(artistsTable, eq(worksTable.artist_id, artistsTable.id))
      .where(eq(worksTable.id, workId))
      .execute();

    if (works.length === 0) {
      throw new Error(`Work with ID ${workId} not found`);
    }

    const workData = works[0].works;
    const artistData = works[0].artists;

    // Validate work is ready for distribution
    if (!workData.audio_url) {
      throw new Error('Work must have audio file before distribution');
    }

    if (!workData.artwork_url) {
      throw new Error('Work must have artwork before distribution');
    }

    if (!artistData.is_active) {
      throw new Error('Cannot distribute work for inactive artist');
    }

    // Validate platforms
    const validPlatforms = ['spotify', 'apple_music', 'youtube_music', 'amazon_music', 'deezer'];
    const invalidPlatforms = platforms.filter(platform => !validPlatforms.includes(platform));
    
    if (invalidPlatforms.length > 0) {
      throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
    }

    if (platforms.length === 0) {
      throw new Error('At least one platform must be specified');
    }

    // Update work status to processing
    const result = await db.update(worksTable)
      .set({
        distribution_status: 'processing',
        updated_at: new Date()
      })
      .where(eq(worksTable.id, workId))
      .returning()
      .execute();

    const updatedWork = result[0];

    // Return the updated work
    return {
      ...updatedWork,
      release_date: updatedWork.release_date ? new Date(updatedWork.release_date) : null
    };
  } catch (error) {
    console.error('Work distribution failed:', error);
    throw error;
  }
}
