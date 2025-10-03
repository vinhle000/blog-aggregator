import { db } from '..';
import { users, feeds, feedFollows } from '../schema';
import { eq } from 'drizzle-orm';

/*===============
// Select fields from:
feedFollows: Include metadata like id, createdAt, and updatedAt.
feeds: Add related fields such as the feed name.
users: Add related fields such as the user name.

Join Tables the tables:
Use .innerJoin() to connect the feedFollows table to feeds and users:
Join feeds where feedFollows.feedId = feeds.id.
Join users where feedFollows.userId = users.id.
=================*/
export async function createFeedFollow(feedId: string, userId: string) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({ feedId, userId })
    .returning();

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      username: users.name,
      feedName: feeds.name,
    }) // TODO: narrow down fields from feeds and users
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id));

  return result;
}

export async function getFeedFollowsForUser(userId: string) {
  const result = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      username: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, userId))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id));

  return result;
}
