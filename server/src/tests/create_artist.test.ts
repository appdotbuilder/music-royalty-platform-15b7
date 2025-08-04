
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { artistsTable, tenantsTable, usersTable } from '../db/schema';
import { type CreateArtistInput } from '../schema';
import { createArtist } from '../handlers/create_artist';
import { eq } from 'drizzle-orm';

describe('createArtist', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestTenant = async (maxArtists = 5) => {
    const result = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'standard',
        max_artists: maxArtists,
        max_works: 100
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestUser = async (tenantId: number) => {
    const result = await db.insert(usersTable)
      .values({
        tenant_id: tenantId,
        email: 'artist@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Artist',
        role: 'artist'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create an artist with all fields', async () => {
    const tenant = await createTestTenant();
    const user = await createTestUser(tenant.id);

    const testInput: CreateArtistInput = {
      tenant_id: tenant.id,
      user_id: user.id,
      stage_name: 'Test Artist',
      legal_name: 'John Doe',
      bio: 'A talented artist',
      avatar_url: 'https://example.com/avatar.jpg',
      genres: ['pop', 'rock'],
      social_links: {
        instagram: 'https://instagram.com/testartist',
        twitter: 'https://twitter.com/testartist'
      }
    };

    const result = await createArtist(testInput);

    expect(result.id).toBeDefined();
    expect(result.tenant_id).toEqual(tenant.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.stage_name).toEqual('Test Artist');
    expect(result.legal_name).toEqual('John Doe');
    expect(result.bio).toEqual('A talented artist');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.genres).toEqual(['pop', 'rock']);
    expect(result.social_links).toEqual({
      instagram: 'https://instagram.com/testartist',
      twitter: 'https://twitter.com/testartist'
    });
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an artist with minimal fields', async () => {
    const tenant = await createTestTenant();

    const testInput: CreateArtistInput = {
      tenant_id: tenant.id,
      user_id: null,
      stage_name: 'Minimal Artist',
      legal_name: null,
      bio: null,
      avatar_url: null,
      genres: ['electronic'],
      social_links: null
    };

    const result = await createArtist(testInput);

    expect(result.stage_name).toEqual('Minimal Artist');
    expect(result.user_id).toBeNull();
    expect(result.legal_name).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.genres).toEqual(['electronic']);
    expect(result.social_links).toBeNull();
  });

  it('should save artist to database', async () => {
    const tenant = await createTestTenant();

    const testInput: CreateArtistInput = {
      tenant_id: tenant.id,
      user_id: null,
      stage_name: 'Database Test',
      legal_name: null,
      bio: null,
      avatar_url: null,
      genres: ['jazz'],
      social_links: null
    };

    const result = await createArtist(testInput);

    const artists = await db.select()
      .from(artistsTable)
      .where(eq(artistsTable.id, result.id))
      .execute();

    expect(artists).toHaveLength(1);
    expect(artists[0].stage_name).toEqual('Database Test');
    expect(artists[0].tenant_id).toEqual(tenant.id);
    expect(artists[0].genres).toEqual(['jazz']);
  });

  it('should enforce tenant artist limits', async () => {
    const tenant = await createTestTenant(2); // Limit of 2 artists

    const baseInput: CreateArtistInput = {
      tenant_id: tenant.id,
      user_id: null,
      stage_name: 'Artist',
      legal_name: null,
      bio: null,
      avatar_url: null,
      genres: ['pop'],
      social_links: null
    };

    // Create first artist - should succeed
    await createArtist({ ...baseInput, stage_name: 'Artist 1' });

    // Create second artist - should succeed
    await createArtist({ ...baseInput, stage_name: 'Artist 2' });

    // Try to create third artist - should fail
    await expect(
      createArtist({ ...baseInput, stage_name: 'Artist 3' })
    ).rejects.toThrow(/artist limit reached/i);
  });

  it('should reject creation for non-existent tenant', async () => {
    const testInput: CreateArtistInput = {
      tenant_id: 999,
      user_id: null,
      stage_name: 'Test Artist',
      legal_name: null,
      bio: null,
      avatar_url: null,
      genres: ['pop'],
      social_links: null
    };

    await expect(createArtist(testInput)).rejects.toThrow(/tenant not found/i);
  });

  it('should reject creation for inactive tenant', async () => {
    const tenant = await createTestTenant();
    
    // Deactivate tenant
    await db.update(tenantsTable)
      .set({ is_active: false })
      .where(eq(tenantsTable.id, tenant.id))
      .execute();

    const testInput: CreateArtistInput = {
      tenant_id: tenant.id,
      user_id: null,
      stage_name: 'Test Artist',
      legal_name: null,
      bio: null,
      avatar_url: null,
      genres: ['pop'],
      social_links: null
    };

    await expect(createArtist(testInput)).rejects.toThrow(/tenant is not active/i);
  });

  it('should handle empty social links correctly', async () => {
    const tenant = await createTestTenant();

    const testInput: CreateArtistInput = {
      tenant_id: tenant.id,
      user_id: null,
      stage_name: 'Social Test',
      legal_name: null,
      bio: null,
      avatar_url: null,
      genres: ['hip-hop'],
      social_links: {}
    };

    const result = await createArtist(testInput);
    expect(result.social_links).toEqual({});
  });
});
