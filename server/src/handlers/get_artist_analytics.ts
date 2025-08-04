
import { db } from '../db';
import { worksTable, workEarningsTable, royaltyReportsTable } from '../db/schema';
import { type ArtistAnalytics } from '../schema';
import { eq, sum, count, sql } from 'drizzle-orm';

export async function getArtistAnalytics(artistId: number): Promise<ArtistAnalytics> {
  try {
    // Get total works count
    const worksCountResult = await db.select({
      count: count()
    })
    .from(worksTable)
    .where(eq(worksTable.artist_id, artistId))
    .execute();

    const totalWorks = worksCountResult[0]?.count || 0;

    // Get total streams and revenue across all works
    const totalsResult = await db.select({
      totalStreams: sum(workEarningsTable.streams),
      totalRevenue: sum(workEarningsTable.revenue)
    })
    .from(workEarningsTable)
    .innerJoin(worksTable, eq(workEarningsTable.work_id, worksTable.id))
    .where(eq(worksTable.artist_id, artistId))
    .execute();

    const totalStreams = parseInt(totalsResult[0]?.totalStreams || '0');
    const totalRevenue = parseFloat(totalsResult[0]?.totalRevenue || '0');

    // Get monthly streams breakdown
    const monthlyStreamsResult = await db.select({
      month: sql<string>`TO_CHAR(${royaltyReportsTable.period_start}, 'YYYY-MM')`,
      streams: sum(workEarningsTable.streams),
      revenue: sum(workEarningsTable.revenue)
    })
    .from(workEarningsTable)
    .innerJoin(worksTable, eq(workEarningsTable.work_id, worksTable.id))
    .innerJoin(royaltyReportsTable, eq(workEarningsTable.royalty_report_id, royaltyReportsTable.id))
    .where(eq(worksTable.artist_id, artistId))
    .groupBy(sql`TO_CHAR(${royaltyReportsTable.period_start}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${royaltyReportsTable.period_start}, 'YYYY-MM')`)
    .execute();

    const monthlyStreams = monthlyStreamsResult.map(row => ({
      month: row.month,
      streams: parseInt(row.streams || '0'),
      revenue: parseFloat(row.revenue || '0')
    }));

    // Get platform breakdown
    const platformBreakdownResult = await db.select({
      platform: workEarningsTable.platform,
      streams: sum(workEarningsTable.streams),
      revenue: sum(workEarningsTable.revenue)
    })
    .from(workEarningsTable)
    .innerJoin(worksTable, eq(workEarningsTable.work_id, worksTable.id))
    .where(eq(worksTable.artist_id, artistId))
    .groupBy(workEarningsTable.platform)
    .execute();

    const platformBreakdown = platformBreakdownResult.map(row => ({
      platform: row.platform,
      streams: parseInt(row.streams || '0'),
      revenue: parseFloat(row.revenue || '0')
    }));

    return {
      artist_id: artistId,
      total_works: totalWorks,
      total_streams: totalStreams,
      total_revenue: totalRevenue,
      monthly_streams: monthlyStreams,
      platform_breakdown: platformBreakdown
    };
  } catch (error) {
    console.error('Get artist analytics failed:', error);
    throw error;
  }
}
