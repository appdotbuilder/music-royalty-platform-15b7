
import { db } from '../db';
import { royaltySplitsTable, artistsTable } from '../db/schema';
import { type RoyaltySplit } from '../schema';
import { eq } from 'drizzle-orm';

export async function getRoyaltySplitsByWork(workId: number): Promise<RoyaltySplit[]> {
  try {
    // Query royalty splits with artist details for recipient names
    const results = await db.select({
      id: royaltySplitsTable.id,
      work_id: royaltySplitsTable.work_id,
      recipient_type: royaltySplitsTable.recipient_type,
      recipient_id: royaltySplitsTable.recipient_id,
      percentage: royaltySplitsTable.percentage,
      role_description: royaltySplitsTable.role_description,
      created_at: royaltySplitsTable.created_at,
      updated_at: royaltySplitsTable.updated_at,
      // Include artist name for display purposes when recipient_type is 'artist'
      artist: {
        stage_name: artistsTable.stage_name,
        legal_name: artistsTable.legal_name
      }
    })
    .from(royaltySplitsTable)
    .leftJoin(
      artistsTable,
      eq(royaltySplitsTable.recipient_id, artistsTable.id)
    )
    .where(eq(royaltySplitsTable.work_id, workId))
    .execute();

    // Transform results back to RoyaltySplit schema format
    return results.map(result => ({
      id: result.id,
      work_id: result.work_id,
      recipient_type: result.recipient_type,
      recipient_id: result.recipient_id,
      percentage: result.percentage,
      role_description: result.role_description,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Failed to get royalty splits by work:', error);
    throw error;
  }
}
