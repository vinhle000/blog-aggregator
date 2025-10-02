import { db } from '..';
import { feeds, type Feed } from '../schema';

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

// gets all feeds in db
export async function getFeeds(): Promise<Feed[]> {
  const result = await db.select().from(feeds);
  return result;
}
