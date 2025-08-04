
import { db } from '../db';
import { invitationsTable, usersTable, artistsTable } from '../db/schema';
import { type Invitation } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function acceptInvitation(token: string, userId: number): Promise<Invitation> {
  try {
    // Find the invitation by token
    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.token, token))
      .execute();

    if (invitations.length === 0) {
      throw new Error('Invalid invitation token');
    }

    const invitation = invitations[0];

    // Check if invitation is already accepted
    if (invitation.status !== 'pending') {
      throw new Error('Invitation has already been processed');
    }

    // Check if invitation has expired
    const now = new Date();
    if (invitation.expires_at < now) {
      throw new Error('Invitation has expired');
    }

    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Update invitation status
    const updatedInvitations = await db.update(invitationsTable)
      .set({
        status: 'accepted',
        accepted_at: now,
        updated_at: now
      })
      .where(eq(invitationsTable.id, invitation.id))
      .returning()
      .execute();

    const updatedInvitation = updatedInvitations[0];

    // Update user's tenant_id to link them to the tenant
    await db.update(usersTable)
      .set({
        tenant_id: invitation.tenant_id,
        updated_at: now
      })
      .where(eq(usersTable.id, userId))
      .execute();

    // If the invited user role is 'artist', create an artist profile
    if (invitation.role === 'artist') {
      await db.insert(artistsTable)
        .values({
          tenant_id: invitation.tenant_id,
          user_id: userId,
          stage_name: `${user.first_name} ${user.last_name}`,
          legal_name: `${user.first_name} ${user.last_name}`,
          genres: []
        })
        .execute();
    }

    return updatedInvitation;
  } catch (error) {
    console.error('Invitation acceptance failed:', error);
    throw error;
  }
}
