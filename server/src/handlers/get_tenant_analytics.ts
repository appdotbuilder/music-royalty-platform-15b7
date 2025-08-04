
import { db } from '../db';
import { artistsTable, worksTable, workEarningsTable, royaltyReportsTable } from '../db/schema';
import { type TenantAnalytics } from '../schema';
import { eq, sum, count, desc, sql } from 'drizzle-orm';

export async function getTenantAnalytics(tenantId: number): Promise<TenantAnalytics> {
  try {
    // Get total artists for the tenant
    const artistsResult = await db.select({ count: count() })
      .from(artistsTable)
      .where(eq(artistsTable.tenant_id, tenantId))
      .execute();

    const totalArtists = artistsResult[0]?.count || 0;

    // Get total works for the tenant
    const worksResult = await db.select({ count: count() })
      .from(worksTable)
      .where(eq(worksTable.tenant_id, tenantId))
      .execute();

    const totalWorks = worksResult[0]?.count || 0;

    // Get total streams and revenue from work earnings
    const earningsResult = await db.select({
      totalStreams: sum(workEarningsTable.streams),
      totalRevenue: sum(workEarningsTable.revenue)
    })
      .from(workEarningsTable)
      .innerJoin(worksTable, eq(workEarningsTable.work_id, worksTable.id))
      .where(eq(worksTable.tenant_id, tenantId))
      .execute();

    const totalStreams = Number(earningsResult[0]?.totalStreams) || 0;
    const totalRevenue = parseFloat(earningsResult[0]?.totalRevenue || '0');

    // Calculate monthly growth (comparing current month to previous month)
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    // Current month earnings
    const currentMonthResult = await db.select({
      revenue: sum(workEarningsTable.revenue)
    })
      .from(workEarningsTable)
      .innerJoin(worksTable, eq(workEarningsTable.work_id, worksTable.id))
      .innerJoin(royaltyReportsTable, eq(workEarningsTable.royalty_report_id, royaltyReportsTable.id))
      .where(
        sql`${worksTable.tenant_id} = ${tenantId} 
            AND ${royaltyReportsTable.period_start} >= ${currentMonth}
            AND ${royaltyReportsTable.period_start} < ${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)}`
      )
      .execute();

    // Previous month earnings
    const previousMonthResult = await db.select({
      revenue: sum(workEarningsTable.revenue)
    })
      .from(workEarningsTable)
      .innerJoin(worksTable, eq(workEarningsTable.work_id, worksTable.id))
      .innerJoin(royaltyReportsTable, eq(workEarningsTable.royalty_report_id, royaltyReportsTable.id))
      .where(
        sql`${worksTable.tenant_id} = ${tenantId} 
            AND ${royaltyReportsTable.period_start} >= ${previousMonth}
            AND ${royaltyReportsTable.period_start} <= ${previousMonthEnd}`
      )
      .execute();

    const currentMonthRevenue = parseFloat(currentMonthResult[0]?.revenue || '0');
    const previousMonthRevenue = parseFloat(previousMonthResult[0]?.revenue || '0');

    const monthlyGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

    // Get top performing works (top 5 by streams)
    const topWorksResult = await db.select({
      workId: worksTable.id,
      title: worksTable.title,
      artistName: artistsTable.stage_name,
      streams: sum(workEarningsTable.streams),
      revenue: sum(workEarningsTable.revenue)
    })
      .from(workEarningsTable)
      .innerJoin(worksTable, eq(workEarningsTable.work_id, worksTable.id))
      .innerJoin(artistsTable, eq(worksTable.artist_id, artistsTable.id))
      .where(eq(worksTable.tenant_id, tenantId))
      .groupBy(worksTable.id, worksTable.title, artistsTable.stage_name)
      .orderBy(desc(sum(workEarningsTable.streams)))
      .limit(5)
      .execute();

    const topPerformingWorks = topWorksResult.map(work => ({
      work_id: work.workId,
      title: work.title,
      artist_name: work.artistName,
      streams: Number(work.streams) || 0,
      revenue: parseFloat(work.revenue || '0')
    }));

    return {
      total_artists: totalArtists,
      total_works: totalWorks,
      total_streams: totalStreams,
      total_revenue: totalRevenue,
      monthly_growth: monthlyGrowth,
      top_performing_works: topPerformingWorks
    };
  } catch (error) {
    console.error('Failed to get tenant analytics:', error);
    throw error;
  }
}
