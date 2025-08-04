
import { db } from '../db';
import { royaltyReportsTable, workEarningsTable, worksTable } from '../db/schema';
import { type RoyaltyReport, type Platform, type RoyaltyReportPeriod } from '../schema';
import { eq } from 'drizzle-orm';

interface WorkEarningData {
  work_id: number;
  streams: number;
  revenue: number;
}

interface RoyaltyReportData {
  period_type: RoyaltyReportPeriod;
  period_start: Date;
  period_end: Date;
  work_earnings: WorkEarningData[];
}

export const processRoyaltyReport = async (
  tenantId: number, 
  platform: Platform, 
  reportData: RoyaltyReportData
): Promise<RoyaltyReport> => {
  try {
    // Validate that all works belong to the tenant
    for (const earning of reportData.work_earnings) {
      const works = await db.select()
        .from(worksTable)
        .where(eq(worksTable.id, earning.work_id))
        .execute();

      if (works.length === 0 || works[0].tenant_id !== tenantId) {
        throw new Error(`Work ${earning.work_id} not found or does not belong to tenant ${tenantId}`);
      }
    }

    // Calculate totals
    const total_streams = reportData.work_earnings.reduce((sum, earning) => sum + earning.streams, 0);
    const total_revenue = reportData.work_earnings.reduce((sum, earning) => sum + earning.revenue, 0);

    // Create royalty report
    const reportResult = await db.insert(royaltyReportsTable)
      .values({
        tenant_id: tenantId,
        platform,
        period_type: reportData.period_type,
        period_start: reportData.period_start.toISOString().split('T')[0], // Convert Date to string for date column
        period_end: reportData.period_end.toISOString().split('T')[0], // Convert Date to string for date column
        total_streams,
        total_revenue: total_revenue.toString(), // Convert to string for numeric column
        processed_at: new Date()
      })
      .returning()
      .execute();

    const royaltyReport = reportResult[0];

    // Insert work earnings
    if (reportData.work_earnings.length > 0) {
      await db.insert(workEarningsTable)
        .values(
          reportData.work_earnings.map(earning => ({
            work_id: earning.work_id,
            royalty_report_id: royaltyReport.id,
            platform,
            streams: earning.streams,
            revenue: earning.revenue.toString() // Convert to string for numeric column
          }))
        )
        .execute();
    }

    // Return with proper type conversions
    return {
      ...royaltyReport,
      period_start: new Date(royaltyReport.period_start), // Convert string back to Date
      period_end: new Date(royaltyReport.period_end), // Convert string back to Date
      total_revenue: parseFloat(royaltyReport.total_revenue) // Convert back to number
    };
  } catch (error) {
    console.error('Royalty report processing failed:', error);
    throw error;
  }
};
