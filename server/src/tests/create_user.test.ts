
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tenantsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with tenant', async () => {
    // Create a tenant first
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const tenant = tenantResult[0];

    const testInput: CreateUserInput = {
      tenant_id: tenant.id,
      email: 'user@test.com',
      password: 'password123',
      first_name: 'John',
      last_name: 'Doe',
      role: 'artist'
    };

    const result = await createUser(testInput);

    // Basic field validation
    expect(result.tenant_id).toEqual(tenant.id);
    expect(result.email).toEqual('user@test.com');
    expect(result.password_hash).toEqual('hashed_password123');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('artist');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.last_login).toBeNull();
  });

  it('should create a user without tenant (super admin)', async () => {
    const testInput: CreateUserInput = {
      tenant_id: null,
      email: 'admin@test.com',
      password: 'adminpass123',
      first_name: 'Admin',
      last_name: 'User',
      role: 'super_admin'
    };

    const result = await createUser(testInput);

    expect(result.tenant_id).toBeNull();
    expect(result.email).toEqual('admin@test.com');
    expect(result.password_hash).toEqual('hashed_adminpass123');
    expect(result.first_name).toEqual('Admin');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('super_admin');
    expect(result.is_active).toBe(true);
  });

  it('should save user to database', async () => {
    // Create a tenant first
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const tenant = tenantResult[0];

    const testInput: CreateUserInput = {
      tenant_id: tenant.id,
      email: 'saved@test.com',
      password: 'password123',
      first_name: 'Saved',
      last_name: 'User',
      role: 'label_admin'
    };

    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('saved@test.com');
    expect(users[0].first_name).toEqual('Saved');
    expect(users[0].last_name).toEqual('User');
    expect(users[0].role).toEqual('label_admin');
    expect(users[0].tenant_id).toEqual(tenant.id);
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].is_active).toBe(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different user roles', async () => {
    // Create a tenant first
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'pro',
        max_artists: 100,
        max_works: 1000
      })
      .returning()
      .execute();

    const tenant = tenantResult[0];

    const roles = ['super_admin', 'label_admin', 'artist'] as const;

    for (const role of roles) {
      const testInput: CreateUserInput = {
        tenant_id: role === 'super_admin' ? null : tenant.id,
        email: `${role}@test.com`,
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        role: role
      };

      const result = await createUser(testInput);

      expect(result.role).toEqual(role);
      expect(result.email).toEqual(`${role}@test.com`);
      
      if (role === 'super_admin') {
        expect(result.tenant_id).toBeNull();
      } else {
        expect(result.tenant_id).toEqual(tenant.id);
      }
    }
  });
});
