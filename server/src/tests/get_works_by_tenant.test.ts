
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable } from '../db/schema';
import { type CreateTenantInput, type CreateArtistInput } from '../schema';
import { getWorksByTenant } from '../handlers/get_works_by_tenant';

// Test data
const testTenant: CreateTenantInput = {
  name: 'Test Label',
  slug: 'test-label',
  logo_url: null,
  website: null,
  description: null,
  contact_email: 'test@example.com',
  subscription_plan: 'standard',
  max_artists: 10,
  max_works: 100
};

const testArtist: CreateArtistInput = {
  tenant_id: 1, // Will be set after tenant creation
  user_id: null,
  stage_name: 'Test Artist',
  legal_name: 'John Doe',
  bio: null,
  avatar_url: null,
  genres: ['rock', 'pop'],
  social_links: null
};

// Work input for database insertion (using string date format)
const testWorkDbInput = {
  title: 'Test Song',
  album: 'Test Album',
  genre: 'rock',
  duration_seconds: 180,
  release_date: '2024-01-01', // String format for database
  isrc: 'US-ABC-12-34567',
  upc: null,
  audio_url: null,
  artwork_url: null,
  lyrics: null,
  is_explicit: false
};

describe('getWorksByTenant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return works for a specific tenant', async () => {
    // Create tenant
    const [tenant] = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();

    // Create artist
    const [artist] = await db.insert(artistsTable)
      .values({
        ...testArtist,
        tenant_id: tenant.id
      })
      .returning()
      .execute();

    // Create work
    const [work] = await db.insert(worksTable)
      .values({
        ...testWorkDbInput,
        tenant_id: tenant.id,
        artist_id: artist.id
      })
      .returning()
      .execute();

    const results = await getWorksByTenant(tenant.id);

    expect(results).toHaveLength(1);
    expect(results[0].id).toEqual(work.id);
    expect(results[0].title).toEqual('Test Song');
    expect(results[0].tenant_id).toEqual(tenant.id);
    expect(results[0].artist_id).toEqual(artist.id);
    expect(results[0].album).toEqual('Test Album');
    expect(results[0].genre).toEqual('rock');
    expect(results[0].duration_seconds).toEqual(180);
    expect(results[0].release_date).toBeInstanceOf(Date);
    expect(results[0].release_date?.toISOString().split('T')[0]).toEqual('2024-01-01');
    expect(results[0].distribution_status).toEqual('pending');
    expect(results[0].is_explicit).toEqual(false);
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(results[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple works for a tenant', async () => {
    // Create tenant
    const [tenant] = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();

    // Create artist
    const [artist] = await db.insert(artistsTable)
      .values({
        ...testArtist,
        tenant_id: tenant.id
      })
      .returning()
      .execute();

    // Create multiple works
    await db.insert(worksTable)
      .values([
        {
          ...testWorkDbInput,
          tenant_id: tenant.id,
          artist_id: artist.id,
          title: 'First Song'
        },
        {
          ...testWorkDbInput,
          tenant_id: tenant.id,
          artist_id: artist.id,
          title: 'Second Song',
          genre: 'pop'
        }
      ])
      .execute();

    const results = await getWorksByTenant(tenant.id);

    expect(results).toHaveLength(2);
    expect(results.map(w => w.title)).toContain('First Song');
    expect(results.map(w => w.title)).toContain('Second Song');
    expect(results.every(w => w.tenant_id === tenant.id)).toBe(true);
  });

  it('should return empty array for tenant with no works', async () => {
    // Create tenant without works
    const [tenant] = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();

    const results = await getWorksByTenant(tenant.id);

    expect(results).toHaveLength(0);
  });

  it('should only return works for the specified tenant', async () => {
    // Create two tenants
    const [tenant1] = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();

    const [tenant2] = await db.insert(tenantsTable)
      .values({
        ...testTenant,
        name: 'Second Label',
        slug: 'second-label',
        contact_email: 'second@example.com'
      })
      .returning()
      .execute();

    // Create artists for both tenants
    const [artist1] = await db.insert(artistsTable)
      .values({
        ...testArtist,
        tenant_id: tenant1.id
      })
      .returning()
      .execute();

    const [artist2] = await db.insert(artistsTable)
      .values({
        ...testArtist,
        tenant_id: tenant2.id,
        stage_name: 'Second Artist'
      })
      .returning()
      .execute();

    // Create works for both tenants
    await db.insert(worksTable)
      .values([
        {
          ...testWorkDbInput,
          tenant_id: tenant1.id,
          artist_id: artist1.id,
          title: 'Tenant 1 Song'
        },
        {
          ...testWorkDbInput,
          tenant_id: tenant2.id,
          artist_id: artist2.id,
          title: 'Tenant 2 Song'
        }
      ])
      .execute();

    const results = await getWorksByTenant(tenant1.id);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Tenant 1 Song');
    expect(results[0].tenant_id).toEqual(tenant1.id);
  });

  it('should handle works with different distribution statuses', async () => {
    // Create tenant
    const [tenant] = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();

    // Create artist
    const [artist] = await db.insert(artistsTable)
      .values({
        ...testArtist,
        tenant_id: tenant.id
      })
      .returning()
      .execute();

    // Create works with different statuses
    await db.insert(worksTable)
      .values([
        {
          ...testWorkDbInput,
          tenant_id: tenant.id,
          artist_id: artist.id,
          title: 'Pending Song'
          // distribution_status defaults to 'pending'
        },
        {
          ...testWorkDbInput,
          tenant_id: tenant.id,
          artist_id: artist.id,
          title: 'Live Song',
          distribution_status: 'live'
        }
      ])
      .execute();

    const results = await getWorksByTenant(tenant.id);

    expect(results).toHaveLength(2);
    expect(results.find(w => w.title === 'Pending Song')?.distribution_status).toEqual('pending');
    expect(results.find(w => w.title === 'Live Song')?.distribution_status).toEqual('live');
  });

  it('should handle works with null release dates', async () => {
    // Create tenant
    const [tenant] = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();

    // Create artist
    const [artist] = await db.insert(artistsTable)
      .values({
        ...testArtist,
        tenant_id: tenant.id
      })
      .returning()
      .execute();

    // Create work with null release date
    await db.insert(worksTable)
      .values({
        ...testWorkDbInput,
        tenant_id: tenant.id,
        artist_id: artist.id,
        title: 'No Release Date Song',
        release_date: null
      })
      .execute();

    const results = await getWorksByTenant(tenant.id);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('No Release Date Song');
    expect(results[0].release_date).toBeNull();
  });
});
