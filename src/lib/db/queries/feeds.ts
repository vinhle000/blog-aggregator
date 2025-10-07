import { db } from '..';
import { feeds, type Feed } from '../schema';
import { RSSFeed, RSSItem } from 'src/lib/rss/types';
import { fetchFeed } from '../../rss';
import { eq, sql } from 'drizzle-orm';

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

export async function getFeedByUrl(url: string): Promise<Feed> {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}

export async function markFeedFetched(feedId: string): Promise<Feed> {
  const [result] = await db
    .update(feeds)
    .set({ updatedAt: new Date(), lastFetchedAt: new Date() })
    .where(eq(feeds.id, feedId));
  return result;
}

/*
Add a getNextFeedToFetch function.
[ ] return the next feed we should fetch posts from.
 - We want to scrape all the feeds in a continuous loop.

 A simple approach is to keep track of when a feed was last fetched,
 and always fetch the oldest one first (or any that haven't ever been fetched).

 SQL has a NULLS FIRST clause that can help with this.

// VLN:

*/

export async function getNextFeedToFetch(): Promise<Feed> {
  const [result] = await db
    .select()
    .from(feeds)
    .orderBy(sql`feeds.last_fetched_at ASC NULLS FIRST`);
  return result;
}

export async function scrapeFeeds(): Promise<void> {
  try {
    const nextFeed = await getNextFeedToFetch();
    await markFeedFetched(nextFeed.id);
    const feed: RSSFeed = await fetchFeed(nextFeed.url);

    for (const feedItem of feed.channel.item) {
      console.log(`Title: ${feedItem.title}`);
    }
  } catch (error) {
    console.error('Error occurred scraping feeds: ', error);
  }
}
scrapeFeeds().then((res) =>
  console.log(`Result scrape ----->  ${JSON.stringify(res, null, 2)}    \n\n`)
);
//   .catch((err) => console.error('error occured fetching next feeds:  ', err));
// ``;
// https://blog.boot.dev/index.xml
