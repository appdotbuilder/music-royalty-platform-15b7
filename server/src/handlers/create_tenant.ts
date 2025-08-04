
import { db } from '../db';
import { tenantsTable } from '../db/schema';
import { type CreateTenantInput, type Tenant } from '../schema';

export const createTenant = async (input: CreateTenantInput): Promise<Tenant> => {
  try {
    // Insert tenant record
    const result = await db.insert(tenantsTable)
      .values({
        name: input.name,
        slug: input.slug,
        logo_url: input.logo_url,
        website: input.website,
        description: input.description,
        contact_email: input.contact_email,
        subscription_plan: input.subscription_plan,
        max_artists: input.max_artists,
        max_works: input.max_works
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Tenant creation failed:', error);
    throw error;
  }
};
