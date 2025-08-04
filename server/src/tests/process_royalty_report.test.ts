
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable, royaltyReportsTable, workEarningsTable } from '../db/schema';
import { processRoyaltyReport } from '../handlers/process_royalty_report';
import { eq } from 'drizzle-orm';

describe('processRoyaltyReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process a royalty report with work earnings', async () => {
    // Create test tenant
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

    // Create test artist
    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenant.id,
        stage_name: 'Test Artist',
        genres: ['pop']
      })
      .returning()
      .execute();
    const artist = artistResult[0];

    // Create test works
    const work1Result = await db.insert(worksTable)
      .values({
        tenant_id: tenant.id,
        title: 'Test Song 1',
        artist_id: artist.id,
        genre: 'pop',
        duration_seconds: 180
      })
      .returning()
      .execute();
    const work1 = work1Result[0];

    const work2Result = await db.insert(worksTable)
      .values({
        tenant_id: tenant.id,
        title: 'Test Song 2',
        artist_id: artist.id,
        genre: 'rock',
        duration_seconds: 200
      })
      .returning()
      .execute();
    const work2 = work2Result[0];

    // Test report data
    const reportData = {
      period_type: 'monthly' as const,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31'),
      work_earnings: [
        {
          work_id: work1.id,
          streams: 1000,
          revenue: 50.75
        },
        {
          work_id: work2.id,
          streams: 500,
          revenue: 25.25
        }
      ]
    };

    const result = await processRoyaltyReport(tenant.id, 'spotify', reportData);

    // Verify royalty report
    expect(result.tenant_id).toEqual(tenant.id);
    expect(result.platform).toEqual('spotify');
    expect(result.period_type).toEqual('monthly');
    expect(result.period_start).toEqual(new Date('2024-01-01'));
    expect(result.period_end).toEqual(new Date('2024-01-31'));
    expect(result.total_streams).toEqual(1500);
    expect(result.total_revenue).toEqual(76.00);
    expect(result.processed_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should save royalty report to database', async () => {
    // Create test data
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'standard',
        max_artists: 50,
        max_works: 500
      })
      .returning()
      .execute();
    const tenant = tenantResult[0];

    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenant.id,
        stage_name: 'Test Artist',
        genres: ['jazz']
      })
      .returning()
      .execute();
    const artist = artistResult[0];

    const workResult = await db.insert(worksTable)
      .values({
        tenant_id: tenant.id,
        title: 'Test Song',
        artist_id: artist.id,
        genre: 'jazz',
        duration_seconds: 240
      })
      .returning()
      .execute();
    const work = workResult[0];

    const reportData = {
      period_type: 'quarterly' as const,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-03-31'),
      work_earnings: [
        {
          work_id: work.id,
          streams: 2000,
          revenue: 100.50
        }
      ]
    };

    const result = await processRoyaltyReport(tenant.id, 'apple_music', reportData);

    // Verify database record
    const reports = await db.select()
      .from(royaltyReportsTable)
      .where(eq(royaltyReportsTable.id, result.id))
      .execute();

    expect(reports).toHaveLength(1);
    const savedReport = reports[0];
    expect(savedReport.tenant_id).toEqual(tenant.id);
    expect(savedReport.platform).toEqual('apple_music');
    expect(savedReport.period_type).toEqual('quarterly');
    expect(parseFloat(savedReport.total_revenue)).toEqual(100.50);
    expect(savedReport.total_streams).toEqual(2000);
  });

  it('should create work earnings records', async () => {
    // Create test data
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

    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenant.id,
        stage_name: 'Test Artist',
        genres: ['electronic']
      })
      .returning()
      .execute();
    const artist = artistResult[0];

    const workResult = await db.insert(worksTable)
      .values({
        tenant_id: tenant.id,
        title: 'Electronic Beat',
        artist_id: artist.id,
        genre: 'electronic',
        duration_seconds: 300
      })
      .returning()
      .execute();
    const work = workResult[0];

    const reportData = {
      period_type: 'yearly' as const,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-12-31'),
      work_earnings: [
        {
          work_id: work.id,
          streams: 5000,
          revenue: 250.75
        }
      ]
    };

    const result = await processRoyaltyReport(tenant.id, 'youtube_music', reportData);

    // Verify work earnings records
    const earnings = await db.select()
      .from(workEarningsTable)
      .where(eq(workEarningsTable.royalty_report_id, result.id))
      .execute();

    expect(earnings).toHaveLength(1);
    const earning = earnings[0];
    expect(earning.work_id).toEqual(work.id);
    expect(earning.platform).toEqual('youtube_music');
    expect(earning.streams).toEqual(5000);
    expect(parseFloat(earning.revenue)).toEqual(250.75);
    expect(earning.created_at).toBeInstanceOf(Date);
  });

  it('should handle empty work earnings', async () => {
    // Create test tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'standard',
        max_artists: 20,
        max_works: 200
      })
      .returning()
      .execute();
    const tenant = tenantResult[0];

    const reportData = {
      period_type: 'monthly' as const,
      period_start: new Date('2024-02-01'),
      period_end: new Date('2024-02-29'),
      work_earnings: []
    };

    const result = await processRoyaltyReport(tenant.id, 'deezer', reportData);

    // Verify report with zero totals
    expect(result.total_streams).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.platform).toEqual('deezer');

    // Verify no work earnings created
    const earnings = await db.select()
      .from(workEarningsTable)
      .where(eq(workEarningsTable.royalty_report_id, result.id))
      .execute();

    expect(earnings).toHaveLength(0);
  });

  it('should reject report for non-existent work', async () => {
    // Create test tenant
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

    const reportData = {
      period_type: 'monthly' as const,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31'),
      work_earnings: [
        {
          work_id: 99999, // Non-existent work ID
          streams: 1000,
          revenue: 50.00
        }
      ]
    };

    await expect(
      processRoyaltyReport(tenant.id, 'spotify', reportData)
    ).rejects.toThrow(/Work 99999 not found/i);
  });

  it('should reject report for work from different tenant', async () => {
    // Create two tenants
    const tenant1Result = await db.insert(tenantsTable)
      .values({
        name: 'Label One',
        slug: 'label-one',
        contact_email: 'one@label.com',
        subscription_plan: 'standard',
        max_artists: 50,
        max_works: 500
      })
      .returning()
      .execute();
    const tenant1 = tenant1Result[0];

    const tenant2Result = await db.insert(tenantsTable)
      .values({
        name: 'Label Two',
        slug: 'label-two',
        contact_email: 'two@label.com',
        subscription_plan: 'pro',
        max_artists: 100,
        max_works: 1000
      })
      .returning()
      .execute();
    const tenant2 = tenant2Result[0];

    // Create artist and work for tenant2
    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenant2.id,
        stage_name: 'Artist Two',
        genres: ['hip-hop']
      })
      .returning()
      .execute();
    const artist = artistResult[0];

    const workResult = await db.insert(worksTable)
      .values({
        tenant_id: tenant2.id,
        title: 'Hip Hop Track',
        artist_id: artist.id,
        genre: 'hip-hop',
        duration_seconds: 220
      })
      .returning()
      .execute();
    const work = workResult[0];

    // Try to process report for tenant1 using tenant2's work
    const reportData = {
      period_type: 'monthly' as const,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31'),
      work_earnings: [
        {
          work_id: work.id,
          streams: 1000,
          revenue: 50.00
        }
      ]
    };

    await expect(
      processRoyaltyReport(tenant1.id, 'spotify', reportData)
    ).rejects.toThrow(/does not belong to tenant/i);
  });
});
