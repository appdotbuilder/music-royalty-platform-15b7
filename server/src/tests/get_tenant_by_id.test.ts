
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable } from '../db/schema';
import { type CreateTenantInput } from '../schema';
import { getTenantById } from '../handlers/get_tenant_by_id';

const testTenant: CreateTenantInput = {
  name: 'Test Music Label',
  slug: 'test-music-label',
  logo_url: 'https://example.com/logo.png',
  website: 'https://testlabel.com',
  description: 'A test music label',
  contact_email: 'contact@testlabel.com',
  subscription_plan: 'standard',
  max_artists: 25,
  max_works: 200
};

describe('getTenantById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return tenant when found', async () => {
    // Create test tenant
    const insertResult = await db.insert(tenantsTable)
      .values({
        ...testTenant
      })
      .returning()
      .execute();

    const createdTenant = insertResult[0];

    // Get tenant by ID
    const result = await getTenantById(createdTenant.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTenant.id);
    expect(result!.name).toEqual('Test Music Label');
    expect(result!.slug).toEqual('test-music-label');
    expect(result!.logo_url).toEqual('https://example.com/logo.png');
    expect(result!.website).toEqual('https://testlabel.com');
    expect(result!.description).toEqual('A test music label');
    expect(result!.contact_email).toEqual('contact@testlabel.com');
    expect(result!.subscription_plan).toEqual('standard');
    expect(result!.max_artists).toEqual(25);
    expect(result!.max_works).toEqual(200);
    expect(result!.is_active).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when tenant not found', async () => {
    const result = await getTenantById(99999);
    expect(result).toBeNull();
  });

  it('should handle tenant with null optional fields', async () => {
    // Create tenant with minimal required fields
    const minimalTenant = {
      name: 'Minimal Label',
      slug: 'minimal-label',
      logo_url: null,
      website: null,
      description: null,
      contact_email: 'minimal@label.com',
      subscription_plan: 'free' as const,
      max_artists: 5,
      max_works: 50
    };

    const insertResult = await db.insert(tenantsTable)
      .values(minimalTenant)
      .returning()
      .execute();

    const createdTenant = insertResult[0];

    // Get tenant by ID
    const result = await getTenantById(createdTenant.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Minimal Label');
    expect(result!.logo_url).toBeNull();
    expect(result!.website).toBeNull();
    expect(result!.description).toBeNull();
    expect(result!.subscription_plan).toEqual('free');
  });

  it('should return active and inactive tenants', async () => {
    // Create inactive tenant
    const inactiveTenant = {
      ...testTenant,
      name: 'Inactive Label',
      slug: 'inactive-label',
      is_active: false
    };

    const insertResult = await db.insert(tenantsTable)
      .values(inactiveTenant)
      .returning()
      .execute();

    const createdTenant = insertResult[0];

    // Get inactive tenant by ID
    const result = await getTenantById(createdTenant.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Inactive Label');
    expect(result!.is_active).toBe(false);
  });
});
