
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable } from '../db/schema';
import { type CreateTenantInput } from '../schema';
import { getTenants } from '../handlers/get_tenants';

const testTenant1: CreateTenantInput = {
  name: 'Test Music Label',
  slug: 'test-music-label',
  logo_url: 'https://example.com/logo.png',
  website: 'https://testlabel.com',
  description: 'A test music label',
  contact_email: 'contact@testlabel.com',
  subscription_plan: 'standard',
  max_artists: 25,
  max_works: 250
};

const testTenant2: CreateTenantInput = {
  name: 'Another Label',
  slug: 'another-label',
  logo_url: null,
  website: null,
  description: null,
  contact_email: 'info@anotherlabel.com',
  subscription_plan: 'free',
  max_artists: 5,
  max_works: 50
};

describe('getTenants', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tenants exist', async () => {
    const result = await getTenants();
    expect(result).toEqual([]);
  });

  it('should return all tenants', async () => {
    // Create first tenant
    await db.insert(tenantsTable)
      .values({
        name: testTenant1.name,
        slug: testTenant1.slug,
        logo_url: testTenant1.logo_url,
        website: testTenant1.website,
        description: testTenant1.description,
        contact_email: testTenant1.contact_email,
        subscription_plan: testTenant1.subscription_plan,
        max_artists: testTenant1.max_artists,
        max_works: testTenant1.max_works
      })
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second tenant
    await db.insert(tenantsTable)
      .values({
        name: testTenant2.name,
        slug: testTenant2.slug,
        logo_url: testTenant2.logo_url,
        website: testTenant2.website,
        description: testTenant2.description,
        contact_email: testTenant2.contact_email,
        subscription_plan: testTenant2.subscription_plan,
        max_artists: testTenant2.max_artists,
        max_works: testTenant2.max_works
      })
      .execute();

    const result = await getTenants();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Another Label'); // Most recent first due to desc ordering
    expect(result[1].name).toEqual('Test Music Label');
    
    // Verify all required fields are present
    result.forEach(tenant => {
      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBeDefined();
      expect(tenant.slug).toBeDefined();
      expect(tenant.contact_email).toBeDefined();
      expect(tenant.subscription_plan).toBeDefined();
      expect(typeof tenant.max_artists).toBe('number');
      expect(typeof tenant.max_works).toBe('number');
      expect(typeof tenant.is_active).toBe('boolean');
      expect(tenant.created_at).toBeInstanceOf(Date);
      expect(tenant.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return tenants ordered by creation date (newest first)', async () => {
    // Create first tenant
    await db.insert(tenantsTable)
      .values({
        name: 'First Label',
        slug: 'first-label',
        contact_email: 'first@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second tenant
    await db.insert(tenantsTable)
      .values({
        name: 'Second Label',
        slug: 'second-label',
        contact_email: 'second@example.com',
        subscription_plan: 'pro',
        max_artists: 100,
        max_works: 1000
      })
      .execute();

    const result = await getTenants();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Second Label'); // Most recent first
    expect(result[1].name).toEqual('First Label');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle tenants with nullable fields correctly', async () => {
    await db.insert(tenantsTable)
      .values({
        name: 'Minimal Label',
        slug: 'minimal-label',
        logo_url: null,
        website: null,
        description: null,
        contact_email: 'minimal@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .execute();

    const result = await getTenants();

    expect(result).toHaveLength(1);
    expect(result[0].logo_url).toBeNull();
    expect(result[0].website).toBeNull();
    expect(result[0].description).toBeNull();
    expect(result[0].name).toEqual('Minimal Label');
  });
});
