import { pgTable, timestamp, uuid, text, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: text('name').notNull().unique(),
});

export const feeds = pgTable('feeds', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  lastFetchedAt: timestamp('last_fetched_at').default(sql`NULL`), // Should be nullable
});

/*=================
Create a feed_follows table with a new migration. It should:
Have an id column that is a primary key.
Have created_at and updated_at columns.
Have user_id and feed_id foreign key columns. Feed follows should auto delete when a user or feed is deleted.
Add a unique constraint on user/feed pairs - we don't want duplicate follow records.
============*/

export const feedFollows = pgTable(
  'feed_follows',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    feedId: uuid('feed_id').references(() => feeds.id, { onDelete: 'cascade' }),
  },
  (table) => [unique().on(table.feedId, table.userId)]
);

export type Feed = typeof feeds.$inferSelect; // feeds is the table object in schema.ts
export type User = typeof users.$inferSelect;
