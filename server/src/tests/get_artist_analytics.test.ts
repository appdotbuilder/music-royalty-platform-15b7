
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tenantsTable, artistsTable, worksTable, royaltyReportsTable, workEarningsTable } from '../db/schema';
import { getArtistAnalytics } from '../handlers/get_artist_analytics';

describe('getArtistAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return analytics for artist with no works', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'free',
        max_artists: 10,
        max_works: 100
      })
      .returning()
      .execute();

    // Create artist
    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenantResult[0].id,
        stage_name: 'Test Artist',
        genres: ['rock']
      })
      .returning()
      .execute();

    const result = await getArtistAnalytics(artistResult[0].id);

    expect(result.artist_id).toEqual(artistResult[0].id);
    expect(result.total_works).toEqual(0);
    expect(result.total_streams).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.monthly_streams).toEqual([]);
    expect(result.platform_breakdown).toEqual([]);
  });

  it('should return complete analytics for artist with works and earnings', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'free',
        max_artists: 10,
        max_works: 100
      })
      .returning()
      .execute();

    // Create artist
    const artistResult = await db.insert(artistsTable)
      .values({
        tenant_id: tenantResult[0].id,
        stage_name: 'Test Artist',
        genres: ['rock']
      })
      .returning()
      .execute();

    // Create works
    const work1Result = await db.insert(worksTable)
      .values({
        tenant_id: tenantResult[0].id,
        title: 'Song 1',
        artist_id: artistResult[0].id,
        genre: 'rock',
        duration_seconds: 180
      })
      .returning()
      .execute();

    const work2Result = await db.insert(worksTable)
      .values({
        tenant_id: tenantResult[0].id,
        title: 'Song 2',
        artist_id: artistResult[0].id,
        genre: 'rock',
        duration_seconds: 200
      })
      .returning()
      .execute();

    // Create royalty reports - use string dates for date columns
    const report1Result = await db.insert(royaltyReportsTable)
      .values({
        tenant_id: tenantResult[0].id,
        platform: 'spotify',
        period_type: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_streams: 1000,
        total_revenue: '100.00'
      })
      .returning()
      .execute();

    const report2Result = await db.insert(royaltyReportsTable)
      .values({
        tenant_id: tenantResult[0].id,
        platform: 'apple_music',
        period_type: 'monthly',
        period_start: '2024-02-01',
        period_end: '2024-02-29',
        total_streams: 800,
        total_revenue: '80.00'
      })
      .returning()
      .execute();

    // Create work earnings - separate inserts
    await db.insert(workEarningsTable)
      .values({
        work_id: work1Result[0].id,
        royalty_report_id: report1Result[0].id,
        platform: 'spotify',
        streams: 500,
        revenue: '50.00'
      })
      .execute();

    await db.insert(workEarningsTable)
      .values({
        work_id: work2Result[0].id,
        royalty_report_id: report1Result[0].id,
        platform: 'spotify',
        streams: 300,
        revenue: '30.00'
      })
      .execute();

    await db.insert(workEarningsTable)
      .values({
        work_id: work1Result[0].id,
        royalty_report_id: report2Result[0].id,
        platform: 'apple_music',
        streams: 400,
        revenue: '40.00'
      })
      .execute();

    await db.insert(workEarningsTable)
      .values({
        work_id: work2Result[0].id,
        royalty_report_id: report2Result[0].id,
        platform: 'apple_music',
        streams: 200,
        revenue: '20.00'
      })
      .execute();

    const result = await getArtistAnalytics(artistResult[0].id);

    expect(result.artist_id).toEqual(artistResult[0].id);
    expect(result.total_works).toEqual(2);
    expect(result.total_streams).toEqual(1400);
    expect(result.total_revenue).toEqual(140);

    // Check monthly streams (should be sorted by month)
    expect(result.monthly_streams).toHaveLength(2);
    expect(result.monthly_streams[0].month).toEqual('2024-01');
    expect(result.monthly_streams[0].streams).toEqual(800);
    expect(result.monthly_streams[0].revenue).toEqual(80);
    expect(result.monthly_streams[1].month).toEqual('2024-02');
    expect(result.monthly_streams[1].streams).toEqual(600);
    expect(result.monthly_streams[1].revenue).toEqual(60);

    // Check platform breakdown
    expect(result.platform_breakdown).toHaveLength(2);
    
    const spotifyBreakdown = result.platform_breakdown.find(p => p.platform === 'spotify');
    expect(spotifyBreakdown).toBeDefined();
    expect(spotifyBreakdown!.streams).toEqual(800);
    expect(spotifyBreakdown!.revenue).toEqual(80);

    const appleMusicBreakdown = result.platform_breakdown.find(p => p.platform === 'apple_music');
    expect(appleMusicBreakdown).toBeDefined();
    expect(appleMusicBreakdown!.streams).toEqual(600);
    expect(appleMusicBreakdown!.revenue).toEqual(60);
  });

  it('should return analytics only for specified artist', async () => {
    // Create tenant
    const tenantResult = await db.insert(tenantsTable)
      .values({
        name: 'Test Label',
        slug: 'test-label',
        contact_email: 'test@label.com',
        subscription_plan: 'free',
        max_artists: 10,
        max_works: 100
      })
      .returning()
      .execute();

    // Create two artists
    const artist1Result = await db.insert(artistsTable)
      .values({
        tenant_id: tenantResult[0].id,
        stage_name: 'Artist 1',
        genres: ['rock']
      })
      .returning()
      .execute();

    const artist2Result = await db.insert(artistsTable)
      .values({
        tenant_id: tenantResult[0].id,
        stage_name: 'Artist 2',
        genres: ['pop']
      })
      .returning()
      .execute();

    // Create works for both artists
    const work1Result = await db.insert(worksTable)
      .values({
        tenant_id: tenantResult[0].id,
        title: 'Song by Artist 1',
        artist_id: artist1Result[0].id,
        genre: 'rock',
        duration_seconds: 180
      })
      .returning()
      .execute();

    const work2Result = await db.insert(worksTable)
      .values({
        tenant_id: tenantResult[0].id,
        title: 'Song by Artist 2',
        artist_id: artist2Result[0].id,
        genre: 'pop',
        duration_seconds: 200
      })
      .returning()
      .execute();

    // Create royalty report - use string date
    const reportResult = await db.insert(royaltyReportsTable)
      .values({
        tenant_id: tenantResult[0].id,
        platform: 'spotify',
        period_type: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_streams: 1000,
        total_revenue: '100.00'
      })
      .returning()
      .execute();

    // Create earnings for both artists - separate inserts
    await db.insert(workEarningsTable)
      .values({
        work_id: work1Result[0].id,
        royalty_report_id: reportResult[0].id,
        platform: 'spotify',
        streams: 700,
        revenue: '70.00'
      })
      .execute();

    await db.insert(workEarningsTable)
      .values({
        work_id: work2Result[0].id,
        royalty_report_id: reportResult[0].id,
        platform: 'spotify',
        streams: 300,
        revenue: '30.00'
      })
      .execute();

    // Get analytics for artist 1 only
    const result = await getArtistAnalytics(artist1Result[0].id);

    expect(result.artist_id).toEqual(artist1Result[0].id);
    expect(result.total_works).toEqual(1);
    expect(result.total_streams).toEqual(700);
    expect(result.total_revenue).toEqual(70);
    expect(result.monthly_streams[0].streams).toEqual(700);
    expect(result.platform_breakdown[0].streams).toEqual(700);
  });
});
