
import { db } from '../db';
import { invitationsTable, usersTable, tenantsTable } from '../db/schema';
import { type CreateInvitationInput, type Invitation } from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const createInvitation = async (input: CreateInvitationInput): Promise<Invitation> => {
  try {
    // Verify the inviting user exists and has proper permissions
    const invitingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.invited_by))
      .execute();

    if (invitingUser.length === 0) {
      throw new Error('Inviting user not found');
    }

    const user = invitingUser[0];

    // Verify the tenant exists
    const tenant = await db.select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, input.tenant_id))
      .execute();

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    // Verify user has permission to invite to this tenant
    if (user.tenant_id !== input.tenant_id && user.role !== 'super_admin') {
      throw new Error('User does not have permission to invite to this tenant');
    }

    // Verify user has proper role to send invitations
    if (user.role === 'artist') {
      throw new Error('Artists cannot send invitations');
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert invitation record
    const result = await db.insert(invitationsTable)
      .values({
        tenant_id: input.tenant_id,
        email: input.email,
        role: input.role,
        invited_by: input.invited_by,
        token: token,
        expires_at: expiresAt,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Invitation creation failed:', error);
    throw error;
  }
};
