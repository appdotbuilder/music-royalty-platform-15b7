
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable, royaltySplitsTable } from '../db/schema';
import { type CreateRoyaltySplitInput } from '../schema';
import { createRoyaltySplit } from '../handlers/create_royalty_split';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateRoyaltySplitInput = {
  work_id: 1,
  recipient_type: 'artist',
  recipient_id: 1,
  percentage: 50.0,
  role_description: 'Main performer'
};

describe('createRoyaltySplit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create prerequisite tenant
    await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .execute();

    // Create prerequisite artist
    await db.insert(artistsTable)
      .values({
        tenant_id: 1,
        stage_name: 'Test Artist',
        genres: ['rock']
      })
      .execute();

    // Create prerequisite work
    await db.insert(worksTable)
      .values({
        tenant_id: 1,
        title: 'Test Song',
        artist_id: 1,
        genre: 'rock',
        duration_seconds: 180
      })
      .execute();
  });

  it('should create a royalty split', async () => {
    const result = await createRoyaltySplit(testInput);

    // Basic field validation
    expect(result.work_id).toEqual(1);
    expect(result.recipient_type).toEqual('artist');
    expect(result.recipient_id).toEqual(1);
    expect(result.percentage).toEqual(50.0);
    expect(result.role_description).toEqual('Main performer');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save royalty split to database', async () => {
    const result = await createRoyaltySplit(testInput);

    const splits = await db.select()
      .from(royaltySplitsTable)
      .where(eq(royaltySplitsTable.id, result.id))
      .execute();

    expect(splits).toHaveLength(1);
    expect(splits[0].work_id).toEqual(1);
    expect(splits[0].recipient_type).toEqual('artist');
    expect(splits[0].recipient_id).toEqual(1);
    expect(splits[0].percentage).toEqual(50.0);
    expect(splits[0].role_description).toEqual('Main performer');
    expect(splits[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when work does not exist', async () => {
    const invalidInput = { ...testInput, work_id: 999 };

    await expect(createRoyaltySplit(invalidInput))
      .rejects
      .toThrow(/work with id 999 not found/i);
  });

  it('should prevent total percentage from exceeding 100%', async () => {
    // Create first split with 60%
    await createRoyaltySplit({ ...testInput, percentage: 60.0 });

    // Try to add another split that would exceed 100%
    const secondSplit: CreateRoyaltySplitInput = {
      work_id: 1,
      recipient_type: 'producer',
      recipient_id: 2,
      percentage: 50.0,
      role_description: 'Producer'
    };

    await expect(createRoyaltySplit(secondSplit))
      .rejects
      .toThrow(/total percentage cannot exceed 100%/i);
  });

  it('should allow multiple splits that total exactly 100%', async () => {
    // Create first split with 50%
    await createRoyaltySplit({ ...testInput, percentage: 50.0 });

    // Add second split with 50% (total = 100%)
    const secondSplit: CreateRoyaltySplitInput = {
      work_id: 1,
      recipient_type: 'writer',
      recipient_id: 2,
      percentage: 50.0,
      role_description: 'Songwriter'
    };

    const result = await createRoyaltySplit(secondSplit);

    expect(result.percentage).toEqual(50.0);
    expect(result.recipient_type).toEqual('writer');

    // Verify both splits exist in database
    const allSplits = await db.select()
      .from(royaltySplitsTable)
      .where(eq(royaltySplitsTable.work_id, 1))
      .execute();

    expect(allSplits).toHaveLength(2);
    const totalPercentage = allSplits.reduce((sum, split) => sum + split.percentage, 0);
    expect(totalPercentage).toEqual(100.0);
  });

  it('should handle different recipient types', async () => {
    const producerSplit: CreateRoyaltySplitInput = {
      work_id: 1,
      recipient_type: 'producer',
      recipient_id: 3,
      percentage: 25.0,
      role_description: 'Music producer'
    };

    const result = await createRoyaltySplit(producerSplit);

    expect(result.recipient_type).toEqual('producer');
    expect(result.recipient_id).toEqual(3);
    expect(result.percentage).toEqual(25.0);
    expect(result.role_description).toEqual('Music producer');
  });
});
