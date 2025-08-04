
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, usersTable, invitationsTable } from '../db/schema';
import { type CreateInvitationInput } from '../schema';
import { createInvitation } from '../handlers/create_invitation';
import { eq } from 'drizzle-orm';

describe('createInvitation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let tenantId: number;
  let labelAdminId: number;
  let superAdminId: number;
  let artistId: number;

  beforeEach(async () => {
    // Create test tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'contact@testlabel.com',
        subscription_plan: 'standard',
        max_artists: 10,
        max_works: 100
      })
      .returning()
      .execute();
    tenantId = tenantResult[0].id;

    // Create test users
    const labelAdminResult = await db.insert(usersTable)
      .values({
        tenant_id: tenantId,
        email: 'admin@testlabel.com',
        password_hash: 'hashed_password',
        first_name: 'Label',
        last_name: 'Admin',
        role: 'label_admin'
      })
      .returning()
      .execute();
    labelAdminId = labelAdminResult[0].id;

    const superAdminResult = await db.insert(usersTable)
      .values({
        tenant_id: null,
        email: 'super@admin.com',
        password_hash: 'hashed_password',
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin'
      })
      .returning()
      .execute();
    superAdminId = superAdminResult[0].id;

    const artistResult = await db.insert(usersTable)
      .values({
        tenant_id: tenantId,
        email: 'artist@testlabel.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Artist',
        role: 'artist'
      })
      .returning()
      .execute();
    artistId = artistResult[0].id;
  });

  it('should create invitation with label admin', async () => {
    const testInput: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'newartist@example.com',
      role: 'artist',
      invited_by: labelAdminId
    };

    const result = await createInvitation(testInput);

    expect(result.tenant_id).toEqual(tenantId);
    expect(result.email).toEqual('newartist@example.com');
    expect(result.role).toEqual('artist');
    expect(result.invited_by).toEqual(labelAdminId);
    expect(result.status).toEqual('pending');
    expect(result.token).toBeDefined();
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at > new Date()).toBe(true);
    expect(result.accepted_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create invitation with super admin', async () => {
    const testInput: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'newlabeladmin@example.com',
      role: 'label_admin',
      invited_by: superAdminId
    };

    const result = await createInvitation(testInput);

    expect(result.tenant_id).toEqual(tenantId);
    expect(result.email).toEqual('newlabeladmin@example.com');
    expect(result.role).toEqual('label_admin');
    expect(result.invited_by).toEqual(superAdminId);
    expect(result.status).toEqual('pending');
  });

  it('should save invitation to database', async () => {
    const testInput: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'saved@example.com',
      role: 'artist',
      invited_by: labelAdminId
    };

    const result = await createInvitation(testInput);

    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, result.id))
      .execute();

    expect(invitations).toHaveLength(1);
    expect(invitations[0].email).toEqual('saved@example.com');
    expect(invitations[0].role).toEqual('artist');
    expect(invitations[0].status).toEqual('pending');
    expect(invitations[0].token).toEqual(result.token);
    expect(invitations[0].expires_at).toBeInstanceOf(Date);
  });

  it('should generate unique tokens', async () => {
    const testInput1: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'first@example.com',
      role: 'artist',
      invited_by: labelAdminId
    };

    const testInput2: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'second@example.com',
      role: 'artist',
      invited_by: labelAdminId
    };

    const result1 = await createInvitation(testInput1);
    const result2 = await createInvitation(testInput2);

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.token.length).toBeGreaterThan(32); // hex string should be 64 chars
    expect(result2.token.length).toBeGreaterThan(32);
  });

  it('should set expiration date 7 days in future', async () => {
    const testInput: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'expires@example.com',
      role: 'artist',
      invited_by: labelAdminId
    };

    const beforeCreation = new Date();
    const result = await createInvitation(testInput);
    const afterCreation = new Date();

    const expectedMinExpiry = new Date(beforeCreation);
    expectedMinExpiry.setDate(expectedMinExpiry.getDate() + 7);

    const expectedMaxExpiry = new Date(afterCreation);
    expectedMaxExpiry.setDate(expectedMaxExpiry.getDate() + 7);

    expect(result.expires_at >= expectedMinExpiry).toBe(true);
    expect(result.expires_at <= expectedMaxExpiry).toBe(true);
  });

  it('should throw error when inviting user not found', async () => {
    const testInput: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'test@example.com',
      role: 'artist',
      invited_by: 99999 // Non-existent user
    };

    expect(createInvitation(testInput)).rejects.toThrow(/inviting user not found/i);
  });

  it('should throw error when tenant not found', async () => {
    const testInput: CreateInvitationInput = {
      tenant_id: 99999, // Non-existent tenant
      email: 'test@example.com',
      role: 'artist',
      invited_by: labelAdminId
    };

    expect(createInvitation(testInput)).rejects.toThrow(/tenant not found/i);
  });

  it('should throw error when artist tries to send invitation', async () => {
    const testInput: CreateInvitationInput = {
      tenant_id: tenantId,
      email: 'test@example.com',
      role: 'artist',
      invited_by: artistId
    };

    expect(createInvitation(testInput)).rejects.toThrow(/artists cannot send invitations/i);
  });

  it('should throw error when user lacks permission for tenant', async () => {
    // Create another tenant
    const otherTenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Other Label',
        slug: 'other-label',
        contact_email: 'contact@otherlabel.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 25
      })
      .returning()
      .execute();

    const testInput: CreateInvitationInput = {
      tenant_id: otherTenantResult[0].id, // Different tenant
      email: 'test@example.com',
      role: 'artist',
      invited_by: labelAdminId // Label admin from different tenant
    };

    expect(createInvitation(testInput)).rejects.toThrow(/does not have permission/i);
  });
});
