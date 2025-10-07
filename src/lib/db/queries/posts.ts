import { posts, type Post } from '../schema';
import { db } from '..';

export async function createPost(
  title: string,
  url: string,
  publishedAt: string,
  description: string,
  feedId: string
): Promise<Post> {
  // convert published at value to proper date,

  const pubDate = new Date(publishedAt);

  // TODO: Do we need to convert the description from xml -> string

  const [result] = await db
    .insert(posts)
    .values({
      title,
      url,
      publishedAt: pubDate,
      description,
      feedId,
    })
    .onConflictDoNothing({ target: posts.url })
    .returning();

  return result;
}

// export async function getPostsForUser(userId): Promise<Post[]> {
//  Order the results so that the most recent posts are first.
//  Make the number of posts returned configurable.
/*
   SELECT * FROM users,
   INNER JOIN feedFollows,
   ON user.Id = feedFollows.userId,
   INNER JOIN posts,
   ON feedFollows.feedId = posts.feedId
   ORDER BY posts.publishedAt
   */
// const result = await.db.select().from(users).where(eq(posts.user))
// }
