
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable } from '../db/schema';
import { type CreateTenantInput } from '../schema';
import { createTenant } from '../handlers/create_tenant';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateTenantInput = {
  name: 'Test Music Label',
  slug: 'test-music-label',
  logo_url: 'https://example.com/logo.png',
  website: 'https://testlabel.com',
  description: 'A test music label for testing purposes',
  contact_email: 'contact@testlabel.com',
  subscription_plan: 'standard',
  max_artists: 10,
  max_works: 100
};

describe('createTenant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a tenant', async () => {
    const result = await createTenant(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Music Label');
    expect(result.slug).toEqual('test-music-label');
    expect(result.logo_url).toEqual('https://example.com/logo.png');
    expect(result.website).toEqual('https://testlabel.com');
    expect(result.description).toEqual('A test music label for testing purposes');
    expect(result.contact_email).toEqual('contact@testlabel.com');
    expect(result.subscription_plan).toEqual('standard');
    expect(result.max_artists).toEqual(10);
    expect(result.max_works).toEqual(100);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save tenant to database', async () => {
    const result = await createTenant(testInput);

    // Query database to verify the tenant was saved
    const tenants = await db.select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, result.id))
      .execute();

    expect(tenants).toHaveLength(1);
    expect(tenants[0].name).toEqual('Test Music Label');
    expect(tenants[0].slug).toEqual('test-music-label');
    expect(tenants[0].contact_email).toEqual('contact@testlabel.com');
    expect(tenants[0].subscription_plan).toEqual('standard');
    expect(tenants[0].max_artists).toEqual(10);
    expect(tenants[0].max_works).toEqual(100);
    expect(tenants[0].is_active).toEqual(true);
    expect(tenants[0].created_at).toBeInstanceOf(Date);
    expect(tenants[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create tenant with minimal fields', async () => {
    const minimalInput: CreateTenantInput = {
      name: 'Minimal Label',
      slug: 'minimal-label',
      logo_url: null,
      website: null,
      description: null,
      contact_email: 'minimal@example.com',
      subscription_plan: 'free',
      max_artists: 5,
      max_works: 50
    };

    const result = await createTenant(minimalInput);

    expect(result.name).toEqual('Minimal Label');
    expect(result.slug).toEqual('minimal-label');
    expect(result.logo_url).toBeNull();
    expect(result.website).toBeNull();
    expect(result.description).toBeNull();
    expect(result.contact_email).toEqual('minimal@example.com');
    expect(result.subscription_plan).toEqual('free');
    expect(result.max_artists).toEqual(5);
    expect(result.max_works).toEqual(50);
    expect(result.is_active).toEqual(true);
  });

  it('should fail when slug is duplicate', async () => {
    // Create first tenant
    await createTenant(testInput);

    // Try to create second tenant with same slug
    const duplicateInput: CreateTenantInput = {
      ...testInput,
      name: 'Another Label',
      contact_email: 'another@example.com'
    };

    expect(createTenant(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should create tenant with different subscription plans', async () => {
    const freeInput: CreateTenantInput = {
      ...testInput,
      slug: 'free-label',
      subscription_plan: 'free'
    };

    const proInput: CreateTenantInput = {
      ...testInput,
      slug: 'pro-label',
      subscription_plan: 'pro'
    };

    const freeResult = await createTenant(freeInput);
    const proResult = await createTenant(proInput);

    expect(freeResult.subscription_plan).toEqual('free');
    expect(proResult.subscription_plan).toEqual('pro');
  });
});
