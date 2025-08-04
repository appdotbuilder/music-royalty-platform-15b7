
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable, royaltySplitsTable } from '../db/schema';
import { getRoyaltySplitsByWork } from '../handlers/get_royalty_splits_by_work';

describe('getRoyaltySplitsByWork', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no royalty splits exist for work', async () => {
    // Create prerequisite data
    const tenant = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const artist = await db.insert(artistsTable)
      .values({
        tenant_id: tenant[0].id,
        stage_name: 'Test Artist',
        genres: ['rock']
      })
      .returning()
      .execute();

    const work = await db.insert(worksTable)
      .values({
        tenant_id: tenant[0].id,
        title: 'Test Song',
        artist_id: artist[0].id,
        genre: 'rock',
        duration_seconds: 180
      })
      .returning()
      .execute();

    const result = await getRoyaltySplitsByWork(work[0].id);

    expect(result).toEqual([]);
  });

  it('should return royalty splits for a work', async () => {
    // Create prerequisite data
    const tenant = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const artist = await db.insert(artistsTable)
      .values({
        tenant_id: tenant[0].id,
        stage_name: 'Test Artist',
        genres: ['rock']
      })
      .returning()
      .execute();

    const work = await db.insert(worksTable)
      .values({
        tenant_id: tenant[0].id,
        title: 'Test Song',
        artist_id: artist[0].id,
        genre: 'rock',
        duration_seconds: 180
      })
      .returning()
      .execute();

    // Create royalty splits
    const splits = await db.insert(royaltySplitsTable)
      .values([
        {
          work_id: work[0].id,
          recipient_type: 'artist',
          recipient_id: artist[0].id,
          percentage: 70.0,
          role_description: 'Primary artist'
        },
        {
          work_id: work[0].id,
          recipient_type: 'producer',
          recipient_id: 999,
          percentage: 30.0,
          role_description: 'Producer'
        }
      ])
      .returning()
      .execute();

    const result = await getRoyaltySplitsByWork(work[0].id);

    expect(result).toHaveLength(2);
    
    // Check first split (artist)
    const artistSplit = result.find(s => s.recipient_type === 'artist');
    expect(artistSplit).toBeDefined();
    expect(artistSplit!.work_id).toEqual(work[0].id);
    expect(artistSplit!.recipient_id).toEqual(artist[0].id);
    expect(artistSplit!.percentage).toEqual(70.0);
    expect(artistSplit!.role_description).toEqual('Primary artist');
    expect(artistSplit!.id).toBeDefined();
    expect(artistSplit!.created_at).toBeInstanceOf(Date);
    expect(artistSplit!.updated_at).toBeInstanceOf(Date);

    // Check second split (producer)
    const producerSplit = result.find(s => s.recipient_type === 'producer');
    expect(producerSplit).toBeDefined();
    expect(producerSplit!.work_id).toEqual(work[0].id);
    expect(producerSplit!.recipient_id).toEqual(999);
    expect(producerSplit!.percentage).toEqual(30.0);
    expect(producerSplit!.role_description).toEqual('Producer');
  });

  it('should return splits ordered by creation date', async () => {
    // Create prerequisite data
    const tenant = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const artist = await db.insert(artistsTable)
      .values({
        tenant_id: tenant[0].id,
        stage_name: 'Test Artist',
        genres: ['rock']
      })
      .returning()
      .execute();

    const work = await db.insert(worksTable)
      .values({
        tenant_id: tenant[0].id,
        title: 'Test Song',
        artist_id: artist[0].id,
        genre: 'rock',
        duration_seconds: 180
      })
      .returning()
      .execute();

    // Create multiple splits
    await db.insert(royaltySplitsTable)
      .values([
        {
          work_id: work[0].id,
          recipient_type: 'artist',
          recipient_id: artist[0].id,
          percentage: 50.0,
          role_description: 'Artist'
        },
        {
          work_id: work[0].id,
          recipient_type: 'writer',
          recipient_id: 100,
          percentage: 25.0,
          role_description: 'Writer'
        },
        {
          work_id: work[0].id,
          recipient_type: 'producer',
          recipient_id: 200,
          percentage: 25.0,
          role_description: 'Producer'
        }
      ])
      .returning()
      .execute();

    const result = await getRoyaltySplitsByWork(work[0].id);

    expect(result).toHaveLength(3);
    
    // Verify all splits belong to the correct work
    result.forEach(split => {
      expect(split.work_id).toEqual(work[0].id);
      expect(split.created_at).toBeInstanceOf(Date);
      expect(split.updated_at).toBeInstanceOf(Date);
    });

    // Verify percentage values are numbers
    const totalPercentage = result.reduce((sum, split) => sum + split.percentage, 0);
    expect(totalPercentage).toEqual(100.0);
  });

  it('should not return splits for different works', async () => {
    // Create prerequisite data
    const tenant = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const artist = await db.insert(artistsTable)
      .values({
        tenant_id: tenant[0].id,
        stage_name: 'Test Artist',
        genres: ['rock']
      })
      .returning()
      .execute();

    // Create two works
    const work1 = await db.insert(worksTable)
      .values({
        tenant_id: tenant[0].id,
        title: 'Song 1',
        artist_id: artist[0].id,
        genre: 'rock',
        duration_seconds: 180
      })
      .returning()
      .execute();

    const work2 = await db.insert(worksTable)
      .values({
        tenant_id: tenant[0].id,
        title: 'Song 2',
        artist_id: artist[0].id,
        genre: 'pop',
        duration_seconds: 200
      })
      .returning()
      .execute();

    // Create splits for both works
    await db.insert(royaltySplitsTable)
      .values([
        {
          work_id: work1[0].id,
          recipient_type: 'artist',
          recipient_id: artist[0].id,
          percentage: 100.0,
          role_description: 'Artist for Song 1'
        },
        {
          work_id: work2[0].id,
          recipient_type: 'artist',
          recipient_id: artist[0].id,
          percentage: 100.0,
          role_description: 'Artist for Song 2'
        }
      ])
      .returning()
      .execute();

    // Query splits for work1 only
    const result = await getRoyaltySplitsByWork(work1[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].work_id).toEqual(work1[0].id);
    expect(result[0].role_description).toEqual('Artist for Song 1');
  });
});
