
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable } from '../db/schema';
import { type CreateWorkInput } from '../schema';
import { createWork } from '../handlers/create_work';
import { eq } from 'drizzle-orm';

describe('createWork', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let tenantId: number;
  let artistId: number;

  beforeEach(async () => {
    // Create test tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'pro',
        max_artists: 10,
        max_works: 100
      })
      .returning()
      .execute();
    tenantId = tenantResult[0].id;

    // Create test artist
    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenantId,
        stage_name: 'Test Artist',
        legal_name: 'John Doe',
        genres: ['pop', 'rock']
      })
      .returning()
      .execute();
    artistId = artistResult[0].id;
  });

  const testInput: CreateWorkInput = {
    tenant_id: 0, // Will be set in tests
    title: 'Test Song',
    artist_id: 0, // Will be set in tests
    album: 'Test Album',
    genre: 'pop',
    duration_seconds: 210,
    release_date: new Date('2024-01-15'),
    isrc: 'US-ABC-24-12345',
    upc: '123456789012',
    audio_url: 'https://example.com/audio.mp3',
    artwork_url: 'https://example.com/artwork.jpg',
    lyrics: 'Test lyrics here',
    is_explicit: false
  };

  it('should create a work successfully', async () => {
    const input = {
      ...testInput,
      tenant_id: tenantId,
      artist_id: artistId
    };

    const result = await createWork(input);

    expect(result.id).toBeDefined();
    expect(result.tenant_id).toEqual(tenantId);
    expect(result.title).toEqual('Test Song');
    expect(result.artist_id).toEqual(artistId);
    expect(result.album).toEqual('Test Album');
    expect(result.genre).toEqual('pop');
    expect(result.duration_seconds).toEqual(210);
    expect(result.release_date).toEqual(new Date('2024-01-15'));
    expect(result.isrc).toEqual('US-ABC-24-12345');
    expect(result.upc).toEqual('123456789012');
    expect(result.audio_url).toEqual('https://example.com/audio.mp3');
    expect(result.artwork_url).toEqual('https://example.com/artwork.jpg');
    expect(result.lyrics).toEqual('Test lyrics here');
    expect(result.distribution_status).toEqual('pending');
    expect(result.is_explicit).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save work to database', async () => {
    const input = {
      ...testInput,
      tenant_id: tenantId,
      artist_id: artistId
    };

    const result = await createWork(input);

    const works = await db.select()
      .from(worksTable)
      .where(eq(worksTable.id, result.id))
      .execute();

    expect(works).toHaveLength(1);
    expect(works[0].title).toEqual('Test Song');
    expect(works[0].tenant_id).toEqual(tenantId);
    expect(works[0].artist_id).toEqual(artistId);
    expect(works[0].distribution_status).toEqual('pending');
    expect(works[0].release_date).toEqual('2024-01-15');
    expect(works[0].created_at).toBeInstanceOf(Date);
  });

  it('should create work with nullable fields', async () => {
    const input = {
      tenant_id: tenantId,
      title: 'Minimal Song',
      artist_id: artistId,
      album: null,
      genre: 'rock',
      duration_seconds: 180,
      release_date: null,
      isrc: null,
      upc: null,
      audio_url: null,
      artwork_url: null,
      lyrics: null,
      is_explicit: true
    };

    const result = await createWork(input);

    expect(result.title).toEqual('Minimal Song');
    expect(result.album).toBeNull();
    expect(result.release_date).toBeNull();
    expect(result.isrc).toBeNull();
    expect(result.upc).toBeNull();
    expect(result.audio_url).toBeNull();
    expect(result.artwork_url).toBeNull();
    expect(result.lyrics).toBeNull();
    expect(result.is_explicit).toEqual(true);
    expect(result.distribution_status).toEqual('pending');
  });

  it('should throw error when tenant not found', async () => {
    const input = {
      ...testInput,
      tenant_id: 99999,
      artist_id: artistId
    };

    await expect(createWork(input)).rejects.toThrow(/tenant not found/i);
  });

  it('should throw error when artist not found', async () => {
    const input = {
      ...testInput,
      tenant_id: tenantId,
      artist_id: 99999
    };

    await expect(createWork(input)).rejects.toThrow(/artist not found/i);
  });

  it('should throw error when artist does not belong to tenant', async () => {
    // Create another tenant
    const otherTenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Other Label',
        slug: 'other-label',
        contact_email: 'other@label.com',
        subscription_plan: 'standard',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      tenant_id: otherTenantResult[0].id,
      artist_id: artistId // Artist belongs to first tenant
    };

    await expect(createWork(input)).rejects.toThrow(/artist does not belong to the specified tenant/i);
  });

  it('should throw error when tenant reaches max works limit', async () => {
    // Create tenant with max_works = 1
    const limitedTenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Limited Label',
        slug: 'limited-label',
        contact_email: 'limited@label.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 1
      })
      .returning()
      .execute();

    const limitedArtistResult = await db.insert(artistsTable)
      .values({
        tenant_id: limitedTenantResult[0].id,
        stage_name: 'Limited Artist',
        genres: ['pop']
      })
      .returning()
      .execute();

    // Create first work
    const firstInput = {
      ...testInput,
      tenant_id: limitedTenantResult[0].id,
      artist_id: limitedArtistResult[0].id,
      title: 'First Work'
    };

    await createWork(firstInput);

    // Try to create second work - should fail
    const secondInput = {
      ...testInput,
      tenant_id: limitedTenantResult[0].id,
      artist_id: limitedArtistResult[0].id,
      title: 'Second Work'
    };

    await expect(createWork(secondInput)).rejects.toThrow(/tenant has reached maximum number of works allowed/i);
  });

  it('should handle date conversion correctly', async () => {
    const testDate = new Date('2024-06-15');
    const input = {
      ...testInput,
      tenant_id: tenantId,
      artist_id: artistId,
      release_date: testDate
    };

    const result = await createWork(input);

    expect(result.release_date).toEqual(testDate);
    expect(result.release_date).toBeInstanceOf(Date);

    // Verify in database - date columns store as strings
    const works = await db.select()
      .from(worksTable)
      .where(eq(worksTable.id, result.id))
      .execute();

    expect(works[0].release_date).toEqual('2024-06-15');
  });
});
