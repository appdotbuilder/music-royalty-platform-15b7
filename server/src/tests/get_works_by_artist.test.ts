
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable } from '../db/schema';
import { type CreateTenantInput, type CreateArtistInput } from '../schema';
import { getWorksByArtist } from '../handlers/get_works_by_artist';

// Test data
const testTenant: CreateTenantInput = {
  name: 'Test Label',
  slug: 'test-label',
  logo_url: null,
  website: null,
  description: null,
  contact_email: 'test@example.com',
  subscription_plan: 'free',
  max_artists: 5,
  max_works: 50
};

const testArtist: CreateArtistInput = {
  tenant_id: 1, // Will be set after tenant creation
  user_id: null,
  stage_name: 'Test Artist',
  legal_name: 'John Doe',
  bio: 'A test artist',
  avatar_url: null,
  genres: ['rock', 'pop'],
  social_links: null
};

describe('getWorksByArtist', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all works for a specific artist', async () => {
    // Create prerequisite data
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();
    const tenantId = tenantResult[0].id;

    const artistResult = await db.insert(artistsTable)
      .values({ ...testArtist, tenant_id: tenantId })
      .returning()
      .execute();
    const artistId = artistResult[0].id;

    // Create works for the artist - insert one by one to avoid array type issues
    await db.insert(worksTable)
      .values({
        tenant_id: tenantId,
        title: 'First Song',
        artist_id: artistId,
        album: 'Test Album',
        genre: 'rock',
        duration_seconds: 180,
        release_date: '2024-01-15', // Use string format for date
        isrc: 'TEST123456789',
        upc: null,
        audio_url: null,
        artwork_url: null,
        lyrics: null,
        is_explicit: false
      })
      .execute();

    await db.insert(worksTable)
      .values({
        tenant_id: tenantId,
        title: 'Second Song',
        artist_id: artistId,
        album: null,
        genre: 'pop',
        duration_seconds: 210,
        release_date: null,
        isrc: null,
        upc: null,
        audio_url: null,
        artwork_url: null,
        lyrics: 'Test lyrics here',
        is_explicit: true
      })
      .execute();

    // Test the handler
    const result = await getWorksByArtist(artistId);

    expect(result).toHaveLength(2);
    
    // Verify first work
    const firstWork = result.find(w => w.title === 'First Song');
    expect(firstWork).toBeDefined();
    expect(firstWork!.title).toEqual('First Song');
    expect(firstWork!.artist_id).toEqual(artistId);
    expect(firstWork!.genre).toEqual('rock');
    expect(firstWork!.duration_seconds).toEqual(180);
    expect(firstWork!.release_date).toEqual(new Date('2024-01-15'));
    expect(firstWork!.is_explicit).toBe(false);
    expect(firstWork!.created_at).toBeInstanceOf(Date);
    expect(firstWork!.updated_at).toBeInstanceOf(Date);

    // Verify second work
    const secondWork = result.find(w => w.title === 'Second Song');
    expect(secondWork).toBeDefined();
    expect(secondWork!.title).toEqual('Second Song');
    expect(secondWork!.artist_id).toEqual(artistId);
    expect(secondWork!.genre).toEqual('pop');
    expect(secondWork!.duration_seconds).toEqual(210);
    expect(secondWork!.release_date).toBeNull();
    expect(secondWork!.lyrics).toEqual('Test lyrics here');
    expect(secondWork!.is_explicit).toBe(true);
  });

  it('should return empty array when artist has no works', async () => {
    // Create prerequisite data
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();
    const tenantId = tenantResult[0].id;

    const artistResult = await db.insert(artistsTable)
      .values({ ...testArtist, tenant_id: tenantId })
      .returning()
      .execute();
    const artistId = artistResult[0].id;

    // Test with artist that has no works
    const result = await getWorksByArtist(artistId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent artist', async () => {
    const result = await getWorksByArtist(99999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return works for the specified artist', async () => {
    // Create prerequisite data
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();
    const tenantId = tenantResult[0].id;

    // Create two artists
    const artist1Result = await db.insert(artistsTable)
      .values({ ...testArtist, tenant_id: tenantId, stage_name: 'Artist 1' })
      .returning()
      .execute();
    const artist1Id = artist1Result[0].id;

    const artist2Result = await db.insert(artistsTable)
      .values({ ...testArtist, tenant_id: tenantId, stage_name: 'Artist 2' })
      .returning()
      .execute();
    const artist2Id = artist2Result[0].id;

    // Create works for both artists
    await db.insert(worksTable)
      .values({
        tenant_id: tenantId,
        title: 'Artist 1 Song',
        artist_id: artist1Id,
        album: 'Test Album',
        genre: 'rock',
        duration_seconds: 180,
        release_date: '2024-01-15',
        isrc: 'TEST123456789',
        upc: null,
        audio_url: null,
        artwork_url: null,
        lyrics: null,
        is_explicit: false
      })
      .execute();

    await db.insert(worksTable)
      .values({
        tenant_id: tenantId,
        title: 'Artist 2 Song',
        artist_id: artist2Id,
        album: null,
        genre: 'pop',
        duration_seconds: 210,
        release_date: null,
        isrc: null,
        upc: null,
        audio_url: null,
        artwork_url: null,
        lyrics: 'Test lyrics here',
        is_explicit: true
      })
      .execute();

    // Test that we only get works for artist 1
    const result = await getWorksByArtist(artist1Id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Artist 1 Song');
    expect(result[0].artist_id).toEqual(artist1Id);
  });
});
