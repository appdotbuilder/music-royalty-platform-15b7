
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password (in production, use proper hashing like bcrypt)
    const password_hash = `hashed_${input.password}`;

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        tenant_id: input.tenant_id,
        email: input.email,
        password_hash: password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
