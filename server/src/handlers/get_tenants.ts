
import { db } from '../db';
import { tenantsTable } from '../db/schema';
import { type Tenant } from '../schema';
import { desc } from 'drizzle-orm';

export const getTenants = async (): Promise<Tenant[]> => {
  try {
    const results = await db.select()
      .from(tenantsTable)
      .orderBy(desc(tenantsTable.created_at))
      .execute();

    return results.map(tenant => ({
      ...tenant,
      max_artists: tenant.max_artists,
      max_works: tenant.max_works
    }));
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
    throw error;
  }
};
