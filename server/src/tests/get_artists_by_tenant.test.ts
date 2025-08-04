
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, usersTable } from '../db/schema';
import { type CreateTenantInput, type CreateArtistInput, type CreateUserInput } from '../schema';
import { getArtistsByTenant } from '../handlers/get_artists_by_tenant';

// Test data
const testTenant: CreateTenantInput = {
  name: 'Test Label',
  slug: 'test-label',
  logo_url: null,
  website: null,
  description: null,
  contact_email: 'contact@testlabel.com',
  subscription_plan: 'standard',
  max_artists: 10,
  max_works: 100
};

const testUser: CreateUserInput = {
  tenant_id: null, // Will be set after tenant creation
  email: 'artist@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Artist',
  role: 'artist'
};

const testArtist1: CreateArtistInput = {
  tenant_id: 0, // Will be set after tenant creation
  user_id: null, // Will be set after user creation
  stage_name: 'Test Artist 1',
  legal_name: 'John Artist',
  bio: 'A test artist',
  avatar_url: null,
  genres: ['rock', 'pop'],
  social_links: { instagram: '@testartist1' }
};

const testArtist2: CreateArtistInput = {
  tenant_id: 0, // Will be set after tenant creation
  user_id: null,
  stage_name: 'Test Artist 2',
  legal_name: null,
  bio: null,
  avatar_url: null,
  genres: ['jazz'],
  social_links: null
};

describe('getArtistsByTenant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all artists for a tenant', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();
    const tenantId = tenantResult[0].id;

    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        tenant_id: tenantId,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create artists
    await db.insert(artistsTable)
      .values([
        {
          ...testArtist1,
          tenant_id: tenantId,
          user_id: userId
        },
        {
          ...testArtist2,
          tenant_id: tenantId,
          user_id: null
        }
      ])
      .execute();

    const result = await getArtistsByTenant(tenantId);

    expect(result).toHaveLength(2);
    
    // Check first artist
    const artist1 = result.find(a => a.stage_name === 'Test Artist 1');
    expect(artist1).toBeDefined();
    expect(artist1!.tenant_id).toBe(tenantId);
    expect(artist1!.user_id).toBe(userId);
    expect(artist1!.stage_name).toBe('Test Artist 1');
    expect(artist1!.legal_name).toBe('John Artist');
    expect(artist1!.bio).toBe('A test artist');
    expect(artist1!.genres).toEqual(['rock', 'pop']);
    expect(artist1!.social_links).toEqual({ instagram: '@testartist1' });
    expect(artist1!.is_active).toBe(true);
    expect(artist1!.created_at).toBeInstanceOf(Date);
    expect(artist1!.updated_at).toBeInstanceOf(Date);

    // Check second artist
    const artist2 = result.find(a => a.stage_name === 'Test Artist 2');
    expect(artist2).toBeDefined();
    expect(artist2!.tenant_id).toBe(tenantId);
    expect(artist2!.user_id).toBe(null);
    expect(artist2!.stage_name).toBe('Test Artist 2');
    expect(artist2!.legal_name).toBe(null);
    expect(artist2!.bio).toBe(null);
    expect(artist2!.genres).toEqual(['jazz']);
    expect(artist2!.social_links).toBe(null);
  });

  it('should return empty array for tenant with no artists', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();
    const tenantId = tenantResult[0].id;

    const result = await getArtistsByTenant(tenantId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return artists for the specified tenant', async () => {
    // Create two tenants
    const tenant1Result = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();
    const tenant1Id = tenant1Result[0].id;

    const tenant2Result = await db.insert(tenantsTable)
      .values({
        ...testTenant,
        name: 'Another Label',
        slug: 'another-label',
        contact_email: 'contact@anotherlabel.com'
      })
      .returning()
      .execute();
    const tenant2Id = tenant2Result[0].id;

    // Create artists for both tenants
    await db.insert(artistsTable)
      .values([
        {
          ...testArtist1,
          tenant_id: tenant1Id,
          user_id: null
        },
        {
          ...testArtist2,
          tenant_id: tenant2Id,
          user_id: null
        }
      ])
      .execute();

    const result = await getArtistsByTenant(tenant1Id);

    expect(result).toHaveLength(1);
    expect(result[0].stage_name).toBe('Test Artist 1');
    expect(result[0].tenant_id).toBe(tenant1Id);
  });

  it('should handle artists with and without associated users', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant)
      .returning()
      .execute();
    const tenantId = tenantResult[0].id;

    // Create user for one artist
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        tenant_id: tenantId,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create one artist with user, one without
    await db.insert(artistsTable)
      .values([
        {
          ...testArtist1,
          tenant_id: tenantId,
          user_id: userId
        },
        {
          ...testArtist2,
          tenant_id: tenantId,
          user_id: null
        }
      ])
      .execute();

    const result = await getArtistsByTenant(tenantId);

    expect(result).toHaveLength(2);
    
    const artistWithUser = result.find(a => a.user_id === userId);
    const artistWithoutUser = result.find(a => a.user_id === null);
    
    expect(artistWithUser).toBeDefined();
    expect(artistWithoutUser).toBeDefined();
    expect(artistWithUser!.user_id).toBe(userId);
    expect(artistWithoutUser!.user_id).toBe(null);
  });
});
