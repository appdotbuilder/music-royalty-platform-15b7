
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable } from '../db/schema';
import { distributeWork } from '../handlers/distribute_work';
import { eq } from 'drizzle-orm';

describe('distributeWork', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestData = async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'standard',
        max_artists: 10,
        max_works: 100
      })
      .returning()
      .execute();
    const tenant = tenantResult[0];

    // Create artist
    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenant.id,
        stage_name: 'Test Artist',
        genres: ['pop', 'rock'],
        is_active: true
      })
      .returning()
      .execute();
    const artist = artistResult[0];

    // Create work ready for distribution
    const workResult = await db.insert(worksTable)
      .values({
        tenant_id: tenant.id,
        title: 'Test Song',
        artist_id: artist.id,
        genre: 'pop',
        duration_seconds: 180,
        audio_url: 'https://example.com/audio.mp3',
        artwork_url: 'https://example.com/artwork.jpg',
        distribution_status: 'pending'
      })
      .returning()
      .execute();
    const work = workResult[0];

    return { tenant, artist, work };
  };

  it('should update work status to processing', async () => {
    const { work } = await createTestData();
    const platforms = ['spotify', 'apple_music'];

    const result = await distributeWork(work.id, platforms);

    expect(result.distribution_status).toEqual('processing');
    expect(result.id).toEqual(work.id);
    expect(result.title).toEqual('Test Song');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save status update to database', async () => {
    const { work } = await createTestData();
    const platforms = ['spotify'];

    await distributeWork(work.id, platforms);

    const updatedWorks = await db.select()
      .from(worksTable)
      .where(eq(worksTable.id, work.id))
      .execute();

    expect(updatedWorks).toHaveLength(1);
    expect(updatedWorks[0].distribution_status).toEqual('processing');
    expect(updatedWorks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error if work not found', async () => {
    const platforms = ['spotify'];

    await expect(distributeWork(999, platforms)).rejects.toThrow(/Work with ID 999 not found/i);
  });

  it('should throw error if work missing audio file', async () => {
    const { tenant, artist } = await createTestData();
    
    // Create work without audio
    const workResult = await db.insert(worksTable)
      .values({
        tenant_id: tenant.id,
        title: 'Incomplete Song',
        artist_id: artist.id,
        genre: 'pop',
        duration_seconds: 180,
        artwork_url: 'https://example.com/artwork.jpg',
        distribution_status: 'pending'
      })
      .returning()
      .execute();

    const platforms = ['spotify'];

    await expect(distributeWork(workResult[0].id, platforms)).rejects.toThrow(/must have audio file/i);
  });

  it('should throw error if work missing artwork', async () => {
    const { tenant, artist } = await createTestData();
    
    // Create work without artwork
    const workResult = await db.insert(worksTable)
      .values({
        tenant_id: tenant.id,
        title: 'Incomplete Song',
        artist_id: artist.id,
        genre: 'pop',
        duration_seconds: 180,
        audio_url: 'https://example.com/audio.mp3',
        distribution_status: 'pending'
      })
      .returning()
      .execute();

    const platforms = ['spotify'];

    await expect(distributeWork(workResult[0].id, platforms)).rejects.toThrow(/must have artwork/i);
  });

  it('should throw error if artist is inactive', async () => {
    const { tenant, work } = await createTestData();
    
    // Create inactive artist
    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenant.id,
        stage_name: 'Inactive Artist',
        genres: ['pop'],
        is_active: false
      })
      .returning()
      .execute();

    // Update work to use inactive artist
    await db.update(worksTable)
      .set({ artist_id: artistResult[0].id })
      .where(eq(worksTable.id, work.id))
      .execute();

    const platforms = ['spotify'];

    await expect(distributeWork(work.id, platforms)).rejects.toThrow(/inactive artist/i);
  });

  it('should throw error for invalid platforms', async () => {
    const { work } = await createTestData();
    const platforms = ['spotify', 'invalid_platform', 'youtube_music'];

    await expect(distributeWork(work.id, platforms)).rejects.toThrow(/Invalid platforms: invalid_platform/i);
  });

  it('should throw error if no platforms specified', async () => {
    const { work } = await createTestData();
    const platforms: string[] = [];

    await expect(distributeWork(work.id, platforms)).rejects.toThrow(/At least one platform must be specified/i);
  });

  it('should accept all valid platforms', async () => {
    const { work } = await createTestData();
    const platforms = ['spotify', 'apple_music', 'youtube_music', 'amazon_music', 'deezer'];

    const result = await distributeWork(work.id, platforms);

    expect(result.distribution_status).toEqual('processing');
    expect(result.id).toEqual(work.id);
  });
});
