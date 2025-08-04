
import { db } from '../db';
import { tenantsTable } from '../db/schema';
import { type Tenant } from '../schema';
import { eq } from 'drizzle-orm';

export const getTenantById = async (id: number): Promise<Tenant | null> => {
  try {
    const results = await db.select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const tenant = results[0];
    return {
      ...tenant,
      // No numeric conversions needed - all fields are already the correct types
    };
  } catch (error) {
    console.error('Failed to get tenant by id:', error);
    throw error;
  }
};
