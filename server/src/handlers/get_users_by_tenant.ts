
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export const getUsersByTenant = async (tenantId: number): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.tenant_id, tenantId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get users by tenant:', error);
    throw error;
  }
};
