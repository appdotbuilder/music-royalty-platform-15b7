
import { db } from '../db';
import { royaltySplitsTable, worksTable } from '../db/schema';
import { type CreateRoyaltySplitInput, type RoyaltySplit } from '../schema';
import { eq, sum } from 'drizzle-orm';

export const createRoyaltySplit = async (input: CreateRoyaltySplitInput): Promise<RoyaltySplit> => {
  try {
    // Verify work exists
    const work = await db.select()
      .from(worksTable)
      .where(eq(worksTable.id, input.work_id))
      .execute();

    if (work.length === 0) {
      throw new Error(`Work with id ${input.work_id} not found`);
    }

    // Calculate current total percentage for this work
    const existingSplits = await db.select({
      total: sum(royaltySplitsTable.percentage)
    })
      .from(royaltySplitsTable)
      .where(eq(royaltySplitsTable.work_id, input.work_id))
      .execute();

    const currentTotal = parseFloat(existingSplits[0]?.total?.toString() || '0');
    const newTotal = currentTotal + input.percentage;

    if (newTotal > 100) {
      throw new Error(`Total percentage cannot exceed 100%. Current total: ${currentTotal}%, trying to add: ${input.percentage}%`);
    }

    // Insert royalty split record
    const result = await db.insert(royaltySplitsTable)
      .values({
        work_id: input.work_id,
        recipient_type: input.recipient_type,
        recipient_id: input.recipient_id,
        percentage: input.percentage,
        role_description: input.role_description
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Royalty split creation failed:', error);
    throw error;
  }
};
