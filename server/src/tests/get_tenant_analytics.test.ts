
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, usersTable, artistsTable, worksTable, royaltyReportsTable, workEarningsTable } from '../db/schema';
import { getTenantAnalytics } from '../handlers/get_tenant_analytics';

describe('getTenantAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return analytics for tenant with no data', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const tenantId = tenantResult[0].id;

    const result = await getTenantAnalytics(tenantId);

    expect(result.total_artists).toEqual(0);
    expect(result.total_works).toEqual(0);
    expect(result.total_streams).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.monthly_growth).toEqual(0);
    expect(result.top_performing_works).toEqual([]);
  });

  it('should return correct analytics for tenant with data', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@example.com',
        subscription_plan: 'pro',
        max_artists: 100,
        max_works: 1000
      })
      .returning()
      .execute();

    const tenantId = tenantResult[0].id;

    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        tenant_id: tenantId,
        email: 'artist@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'artist'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create artists
    const artist1Result = await db.insert(artistsTable)
      .values({
        tenant_id: tenantId,
        user_id: userId,
        stage_name: 'Artist One',
        legal_name: 'John Doe',
        genres: ['rock', 'pop']
      })
      .returning()
      .execute();

    const artist2Result = await db.insert(artistsTable)
      .values({
        tenant_id: tenantId,
        stage_name: 'Artist Two',
        genres: ['hip-hop']
      })
      .returning()
      .execute();

    const artist1Id = artist1Result[0].id;
    const artist2Id = artist2Result[0].id;

    // Create works
    const work1Result = await db.insert(worksTable)
      .values({
        tenant_id: tenantId,
        title: 'Hit Song',
        artist_id: artist1Id,
        genre: 'rock',
        duration_seconds: 180,
        distribution_status: 'live',
        is_explicit: false
      })
      .returning()
      .execute();

    const work2Result = await db.insert(worksTable)
      .values({
        tenant_id: tenantId,
        title: 'Another Song',
        artist_id: artist2Id,
        genre: 'hip-hop',
        duration_seconds: 210,
        distribution_status: 'live',
        is_explicit: false
      })
      .returning()
      .execute();

    const work1Id = work1Result[0].id;
    const work2Id = work2Result[0].id;

    // Create royalty report - use string dates for date columns
    const reportResult = await db.insert(royaltyReportsTable)
      .values({
        tenant_id: tenantId,
        platform: 'spotify',
        period_type: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_streams: 15000,
        total_revenue: '750.00'
      })
      .returning()
      .execute();

    const reportId = reportResult[0].id;

    // Create work earnings
    await db.insert(workEarningsTable)
      .values({
        work_id: work1Id,
        royalty_report_id: reportId,
        platform: 'spotify',
        streams: 10000,
        revenue: '500.00'
      })
      .execute();

    await db.insert(workEarningsTable)
      .values({
        work_id: work2Id,
        royalty_report_id: reportId,
        platform: 'spotify',
        streams: 5000,
        revenue: '250.00'
      })
      .execute();

    const result = await getTenantAnalytics(tenantId);

    expect(result.total_artists).toEqual(2);
    expect(result.total_works).toEqual(2);
    expect(result.total_streams).toEqual(15000);
    expect(result.total_revenue).toEqual(750);
    expect(result.top_performing_works).toHaveLength(2);
    
    // Check top performing work
    const topWork = result.top_performing_works[0];
    expect(topWork.work_id).toEqual(work1Id);
    expect(topWork.title).toEqual('Hit Song');
    expect(topWork.artist_name).toEqual('Artist One');
    expect(topWork.streams).toEqual(10000);
    expect(topWork.revenue).toEqual(500);
  });

  it('should only include data for the specified tenant', async () => {
    // Create two tenants
    const tenant1Result = await db.insert(tenantsTable)
      .values({
        name: 'Tenant 1',
        slug: 'tenant-1',
        contact_email: 'tenant1@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const tenant2Result = await db.insert(tenantsTable)
      .values({
        name: 'Tenant 2',
        slug: 'tenant-2',
        contact_email: 'tenant2@example.com',
        subscription_plan: 'free',
        max_artists: 5,
        max_works: 50
      })
      .returning()
      .execute();

    const tenant1Id = tenant1Result[0].id;
    const tenant2Id = tenant2Result[0].id;

    // Create artists for both tenants
    const artist1Result = await db.insert(artistsTable)
      .values({
        tenant_id: tenant1Id,
        stage_name: 'Tenant 1 Artist',
        genres: ['rock']
      })
      .returning()
      .execute();

    await db.insert(artistsTable)
      .values({
        tenant_id: tenant2Id,
        stage_name: 'Tenant 2 Artist',
        genres: ['pop']
      })
      .execute();

    // Create work only for tenant 1
    await db.insert(worksTable)
      .values({
        tenant_id: tenant1Id,
        title: 'Tenant 1 Song',
        artist_id: artist1Result[0].id,
        genre: 'rock',
        duration_seconds: 200,
        distribution_status: 'live',
        is_explicit: false
      })
      .execute();

    const result = await getTenantAnalytics(tenant1Id);

    // Should only count data for tenant 1
    expect(result.total_artists).toEqual(1);
    expect(result.total_works).toEqual(1);
  });
});
