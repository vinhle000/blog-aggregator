import { db } from '..';
import { users } from '../schema';
import { eq, sql } from 'drizzle-orm';

/*
 * INSERT INTO <table> (<columns>) VALUES (<values>) RETURNING *;
 */
export async function createUser(name: string) {
  console.log('about to insert');
  const [result] = await db.insert(users).values({ name }).returning();
  console.log('inserted', result);
  return result;
}

/*
 * SELECT * FROM users WHERE name = name
 */
export async function getUserByName(name: string) {
  const [result] = await db.select().from(users).where(eq(users.name, name));
  return result;
}
