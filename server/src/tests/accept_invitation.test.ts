
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invitationsTable, usersTable, tenantsTable, artistsTable } from '../db/schema';
import { acceptInvitation } from '../handlers/accept_invitation';
import { eq } from 'drizzle-orm';

describe('acceptInvitation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should accept a valid invitation', async () => {
    // Create prerequisite data
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

    const inviterResult = await db.insert(usersTable)
      .values({
        tenant_id: tenant.id,
        email: 'admin@label.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'label_admin'
      })
      .returning()
      .execute();
    const inviter = inviterResult[0];

    const userResult = await db.insert(usersTable)
      .values({
        tenant_id: null,
        email: 'artist@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Artist',
        role: 'artist'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const invitationResult = await db.insert(invitationsTable)
      .values({
        tenant_id: tenant.id,
        email: 'artist@example.com',
        role: 'artist',
        status: 'pending',
        invited_by: inviter.id,
        token: 'test-token-123',
        expires_at: futureDate
      })
      .returning()
      .execute();
    const invitation = invitationResult[0];

    // Accept the invitation
    const result = await acceptInvitation('test-token-123', user.id);

    // Verify invitation was updated
    expect(result.status).toEqual('accepted');
    expect(result.accepted_at).toBeInstanceOf(Date);
    expect(result.id).toEqual(invitation.id);

    // Verify invitation in database
    const updatedInvitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitation.id))
      .execute();

    expect(updatedInvitations[0].status).toEqual('accepted');
    expect(updatedInvitations[0].accepted_at).toBeInstanceOf(Date);

    // Verify user was linked to tenant
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].tenant_id).toEqual(tenant.id);
  });

  it('should create artist profile for artist role invitation', async () => {
    // Create prerequisite data
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

    const inviterResult = await db.insert(usersTable)
      .values({
        tenant_id: tenant.id,
        email: 'admin@label.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'label_admin'
      })
      .returning()
      .execute();
    const inviter = inviterResult[0];

    const userResult = await db.insert(usersTable)
      .values({
        tenant_id: null,
        email: 'artist@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Artist',
        role: 'artist'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(invitationsTable)
      .values({
        tenant_id: tenant.id,
        email: 'artist@example.com',
        role: 'artist',
        status: 'pending',
        invited_by: inviter.id,
        token: 'test-token-123',
        expires_at: futureDate
      })
      .execute();

    // Accept the invitation
    await acceptInvitation('test-token-123', user.id);

    // Verify artist profile was created
    const artists = await db.select()
      .from(artistsTable)
      .where(eq(artistsTable.user_id, user.id))
      .execute();

    expect(artists).toHaveLength(1);
    expect(artists[0].tenant_id).toEqual(tenant.id);
    expect(artists[0].stage_name).toEqual('John Artist');
    expect(artists[0].legal_name).toEqual('John Artist');
    expect(artists[0].genres).toEqual([]);
  });

  it('should not create artist profile for non-artist role invitation', async () => {
    // Create prerequisite data
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

    const inviterResult = await db.insert(usersTable)
      .values({
        tenant_id: tenant.id,
        email: 'admin@label.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'label_admin'
      })
      .returning()
      .execute();
    const inviter = inviterResult[0];

    const userResult = await db.insert(usersTable)
      .values({
        tenant_id: null,
        email: 'admin2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Admin',
        role: 'label_admin'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(invitationsTable)
      .values({
        tenant_id: tenant.id,
        email: 'admin2@example.com',
        role: 'label_admin',
        status: 'pending',
        invited_by: inviter.id,
        token: 'test-token-456',
        expires_at: futureDate
      })
      .execute();

    // Accept the invitation
    await acceptInvitation('test-token-456', user.id);

    // Verify no artist profile was created
    const artists = await db.select()
      .from(artistsTable)
      .where(eq(artistsTable.user_id, user.id))
      .execute();

    expect(artists).toHaveLength(0);
  });

  it('should throw error for invalid token', async () => {
    const userResult = await db.insert(usersTable)
      .values({
        tenant_id: null,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'artist'
      })
      .returning()
      .execute();
    const user = userResult[0];

    await expect(acceptInvitation('invalid-token', user.id))
      .rejects.toThrow(/invalid invitation token/i);
  });

  it('should throw error for expired invitation', async () => {
    // Create prerequisite data
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

    const inviterResult = await db.insert(usersTable)
      .values({
        tenant_id: tenant.id,
        email: 'admin@label.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'label_admin'
      })
      .returning()
      .execute();
    const inviter = inviterResult[0];

    const userResult = await db.insert(usersTable)
      .values({
        tenant_id: null,
        email: 'artist@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Artist',
        role: 'artist'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    await db.insert(invitationsTable)
      .values({
        tenant_id: tenant.id,
        email: 'artist@example.com',
        role: 'artist',
        status: 'pending',
        invited_by: inviter.id,
        token: 'expired-token',
        expires_at: pastDate
      })
      .execute();

    await expect(acceptInvitation('expired-token', user.id))
      .rejects.toThrow(/invitation has expired/i);
  });

  it('should throw error for already processed invitation', async () => {
    // Create prerequisite data
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

    const inviterResult = await db.insert(usersTable)
      .values({
        tenant_id: tenant.id,
        email: 'admin@label.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'label_admin'
      })
      .returning()
      .execute();
    const inviter = inviterResult[0];

    const userResult = await db.insert(usersTable)
      .values({
        tenant_id: null,
        email: 'artist@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Artist',
        role: 'artist'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(invitationsTable)
      .values({
        tenant_id: tenant.id,
        email: 'artist@example.com',
        role: 'artist',
        status: 'accepted',
        invited_by: inviter.id,
        token: 'processed-token',
        expires_at: futureDate,
        accepted_at: new Date()
      })
      .execute();

    await expect(acceptInvitation('processed-token', user.id))
      .rejects.toThrow(/invitation has already been processed/i);
  });

  it('should throw error for non-existent user', async () => {
    // Create prerequisite data
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

    const inviterResult = await db.insert(usersTable)
      .values({
        tenant_id: tenant.id,
        email: 'admin@label.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'label_admin'
      })
      .returning()
      .execute();
    const inviter = inviterResult[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(invitationsTable)
      .values({
        tenant_id: tenant.id,
        email: 'artist@example.com',
        role: 'artist',
        status: 'pending',
        invited_by: inviter.id,
        token: 'valid-token',
        expires_at: futureDate
      })
      .execute();

    await expect(acceptInvitation('valid-token', 9999))
      .rejects.toThrow(/user not found/i);
  });
});
