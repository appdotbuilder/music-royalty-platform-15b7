
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, usersTable } from '../db/schema';
import { type CreateTenantInput, type CreateUserInput } from '../schema';
import { getUsersByTenant } from '../handlers/get_users_by_tenant';

// Test data
const testTenant1: CreateTenantInput = {
  name: 'Label One',
  slug: 'label-one',
  logo_url: null,
  website: null,
  description: 'First music label',
  contact_email: 'contact@labelone.com',
  subscription_plan: 'standard',
  max_artists: 10,
  max_works: 100
};

const testTenant2: CreateTenantInput = {
  name: 'Label Two',
  slug: 'label-two',
  logo_url: null,
  website: null,
  description: 'Second music label',
  contact_email: 'contact@labeltwo.com',
  subscription_plan: 'pro',
  max_artists: 20,
  max_works: 200
};

describe('getUsersByTenant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return users for a specific tenant', async () => {
    // Create tenants
    const tenant1Result = await db.insert(tenantsTable)
      .values(testTenant1)
      .returning()
      .execute();
    const tenant1 = tenant1Result[0];

    const tenant2Result = await db.insert(tenantsTable)
      .values(testTenant2)
      .returning()
      .execute();
    const tenant2 = tenant2Result[0];

    // Create users for tenant 1
    const user1: CreateUserInput = {
      tenant_id: tenant1.id,
      email: 'admin@labelone.com',
      password: 'password123',
      first_name: 'John',
      last_name: 'Admin',
      role: 'label_admin'
    };

    const user2: CreateUserInput = {
      tenant_id: tenant1.id,
      email: 'artist@labelone.com',
      password: 'password123',
      first_name: 'Jane',
      last_name: 'Artist',
      role: 'artist'
    };

    // Create user for tenant 2
    const user3: CreateUserInput = {
      tenant_id: tenant2.id,
      email: 'admin@labeltwo.com',
      password: 'password123',
      first_name: 'Bob',
      last_name: 'Manager',
      role: 'label_admin'
    };

    await db.insert(usersTable).values([
      {
        ...user1,
        password_hash: 'hashed_' + user1.password
      },
      {
        ...user2,
        password_hash: 'hashed_' + user2.password
      },
      {
        ...user3,
        password_hash: 'hashed_' + user3.password
      }
    ]).execute();

    // Test: Get users for tenant 1
    const tenant1Users = await getUsersByTenant(tenant1.id);

    expect(tenant1Users).toHaveLength(2);
    expect(tenant1Users[0].tenant_id).toEqual(tenant1.id);
    expect(tenant1Users[1].tenant_id).toEqual(tenant1.id);

    // Verify user details
    const emails = tenant1Users.map(u => u.email).sort();
    expect(emails).toEqual(['admin@labelone.com', 'artist@labelone.com']);

    const firstNames = tenant1Users.map(u => u.first_name).sort();
    expect(firstNames).toEqual(['Jane', 'John']);
  });

  it('should return empty array for tenant with no users', async () => {
    // Create tenant without users
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant1)
      .returning()
      .execute();
    const tenant = tenantResult[0];

    const users = await getUsersByTenant(tenant.id);

    expect(users).toHaveLength(0);
    expect(users).toEqual([]);
  });

  it('should return empty array for non-existent tenant', async () => {
    const nonExistentTenantId = 99999;

    const users = await getUsersByTenant(nonExistentTenantId);

    expect(users).toHaveLength(0);
    expect(users).toEqual([]);
  });

  it('should include super_admin users with tenant_id', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant1)
      .returning()
      .execute();
    const tenant = tenantResult[0];

    // Create super admin user with tenant_id
    const superAdminUser: CreateUserInput = {
      tenant_id: tenant.id,
      email: 'superadmin@labelone.com',
      password: 'password123',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin'
    };

    await db.insert(usersTable).values({
      ...superAdminUser,
      password_hash: 'hashed_' + superAdminUser.password
    }).execute();

    const users = await getUsersByTenant(tenant.id);

    expect(users).toHaveLength(1);
    expect(users[0].role).toEqual('super_admin');
    expect(users[0].tenant_id).toEqual(tenant.id);
    expect(users[0].email).toEqual('superadmin@labelone.com');
  });

  it('should exclude users with null tenant_id', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values(testTenant1)
      .returning()
      .execute();
    const tenant = tenantResult[0];

    // Create user with tenant_id
    const tenantUser: CreateUserInput = {
      tenant_id: tenant.id,
      email: 'user@labelone.com',
      password: 'password123',
      first_name: 'Tenant',
      last_name: 'User',
      role: 'artist'
    };

    // Create user with null tenant_id
    const globalUser: CreateUserInput = {
      tenant_id: null,
      email: 'global@example.com',
      password: 'password123',
      first_name: 'Global',
      last_name: 'User',
      role: 'super_admin'
    };

    await db.insert(usersTable).values([
      {
        ...tenantUser,
        password_hash: 'hashed_' + tenantUser.password
      },
      {
        ...globalUser,
        password_hash: 'hashed_' + globalUser.password
      }
    ]).execute();

    const users = await getUsersByTenant(tenant.id);

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('user@labelone.com');
    expect(users[0].tenant_id).toEqual(tenant.id);
  });
});
