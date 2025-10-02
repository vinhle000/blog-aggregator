import { db } from '..';
import { feeds } from '../schema';

export async function createFeed(
  name: string,
  url: string,
  userId: string
): Promise<any> {
  const [result] = await db
    .insert(feeds)
    .values({ name, url, userId })
    .returning();
  return result;
}
