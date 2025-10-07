import { RSSFeed } from 'src/lib/rss/types.js';
import { setUser, readConfig } from '../config.js';
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUserById,
  getUsers,
} from '../lib/db/queries/users.js';
import {
  createFeed,
  getFeeds,
  getFeedByUrl,
  getNextFeedToFetch,
  markFeedFetched,
} from '../lib/db/queries/feeds.js';
import { createPost } from '../lib/db/queries/posts.js';
import { fetchFeed } from 'src/lib/rss/index.js';
import { type Feed, User } from 'src/lib/db/schema.js';
import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from 'src/lib/db/queries/feedFollows.js';

import { middlewareLoggedIn } from 'src/middleware/userLoggedIn.js';

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandRegistry = Record<string, CommandHandler>;
export const cmdRegistry: CommandRegistry = {}; // command registry to look up function to call

function registerCommand(cmdName: string, handler: CommandHandler) {
  cmdRegistry[cmdName] = handler;
}

async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (!args[0]) {
    throw new Error(`username is required to create user`);
  }
  const username = args[0];

  const existing = await getUserByName(username);
  if (existing) throw new Error('user already exists');

  const user = await createUser(username);
  setUser(username);
  console.log(`created user: ${user}`);
}

async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
  if (!args[0]) {
    throw new Error(`username is required for login`);
  }

  const username = args[0];
  const user = await getUserByName(username);
  if (!user) throw new Error('user does not exist');

  setUser(user.name);
  console.log(`user has been set to: ${user.name}`);
}

async function handlerDeleteAllUsers(cmdName: string, ...args): Promise<void> {
  const result = await deleteAllUsers();
  if (result.length > 0) {
    console.log(`${result.length} user(s) were deleted from table`);
  } else {
    console.log(`No users in table to delete`);
  }
}

async function handlerGetUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const result = await getUsers();
  const { currentUserName } = readConfig();

  for (let user of result) {
    console.log(
      `* ${user.name}${user.name === currentUserName ? ' (current)' : ''}`
    );
  }
}

/*=========
time_between_reqs is a duration string, like 1s, 1m, 1h, etc.

I created a function to parse the input into milliseconds using:
    parseDuration(durationStr: string): number


 (fully-licensed) RegEx:
const regex = /^(\d+)(ms|s|m|h)$/;
const match = durationStr.match(regex);
======*/
function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const test = regex.test(durationStr);

  if (test) {
    const match = durationStr.match(regex);
    console.debug(
      `[DEBUG] - match results  -------  ${JSON.stringify(match, null, 2)} \n\n`
    );
    if (!match) {
      console.log(`No num or unit of time was found in ${durationStr}`);
      return 1000 * 60; // 1 minute by default?
    }
    const [matchStr, numStr, unit] = match;
    const num = Number(numStr);

    console.log('match str found ', matchStr);
    console.log(`num = ${num}    unit = ${unit}`);

    switch (unit) {
      case 'ms':
        return num;
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 3600 * 1000;
      default:
        return num; // assuming the unit will be converted to milliseconds
    }
  }

  console.log(`No num or unit of time was found in ${durationStr}`);
  return 0;
}
// npm run start agg 1m0s
async function handlerAggregate(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  // const url = args[0] || 'https://www.wagslane.dev/index.xml';
  // const rssFeed: RSSFeed = await fetchFeed(url);
  // TODO: update to take in single arg "time_between_reqs"

  const durationStr: string = args[0];
  const timeBetweenRequests = parseDuration(durationStr);
  if (!timeBetweenRequests) {
    throw new Error(`Invalid time_between_reqs ${durationStr}`);
  }

  console.log(`Collecting feeds every ${timeBetweenRequests}`);

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on('SIGINT', () => {
      console.log('Shutting down feed aggregator...');
      clearInterval(interval);
      resolve();
    });
  });
}

/*
shell cmd:
npm run start addFeed "The Boot.dev Blog" https://www.wagslane.dev/index.xml
  */
async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const [name, url] = args; // name is name of Feed, not user

  if (!name || !url) {
    throw new Error(
      `Either feed name = "${name} or feed url = "${url}" missing`
    );
  }

  // const { currentUserName } = readConfig();
  // if (!currentUserName) {
  //   throw new Error('current user not found from config');
  // }
  // const user: User = await getUserByName(currentUserName);
  const feed: Feed = await createFeed(name, url, user.id);

  const feedFollow = await createFeedFollow(feed.id, user.id);
  if (!!feedFollow) {
    console.log(
      `user "${feedFollow.username}" now following "${feedFollow.feedName}"`
    );
  }

  printFeed(feed, user);
}

async function handlerGetAllFeeds(): Promise<void> {
  const feeds: Feed[] = await getFeeds();

  for (const feed of feeds) {
    const user: User = await getUserById(feed.userId);
    if (!user) {
      throw new Error(`User does not exit`);
    }

    console.log(`name: ${feed.name}`);
    console.log(`url: ${feed.url}`);
    console.log(`createdByUser: ${user.name}`);
  }
}

/*-------------
shell cmd:
npm run start follow "https://www.wagslane.dev/index.xml"
----------------*/
async function setUserToFollowFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const url = args[0];
  //1. get feedID --- getFeedByUrl query
  const feed: Feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error(`No feed was found for url=${url}`);
  }

  //2. get userId --- from userName from readConfig()
  // const { currentUserName } = readConfig();
  // if (!currentUserName) {
  //   throw new Error('current user not found from config');
  // }
  // const user = await getUserByName(currentUserName);

  //3. associate feed and user --- use createFeedFollow to create a record
  const feedFollow = await createFeedFollow(feed.id, user.id);

  //4. After record created, print out feedName and currentUser name;
  console.log(`FeedName: ${feedFollow.feedName}`);
  console.log(`Username: ${feedFollow.username}`);
}

async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  // const { currentUserName } = readConfig();
  // if (!currentUserName) {
  //   throw new Error('current user not found from config');
  // }
  // const user = await getUserByName(currentUserName);

  const result = await getFeedFollowsForUser(user.id);

  for (const feedFollow of result) {
    console.log(feedFollow.feedName);
  }
}

async function handlerUnfollow(cmdName: string, user: User, ...args: string[]) {
  // get url from args
  const url = args[0];

  const feed = await getFeedByUrl(url);

  if (!feed) {
    throw new Error(`Feed with url "${url}" does not exist`);
  }

  //check url if feed exits, and get feed id
  // delete feedFollow record with userId and feedId

  const result = await deleteFeedFollow(user.id, feed.id);

  if (result) {
    console.log(`Successfully had user unfollow ${feed.name}`);
  }
}

registerCommand('register', handlerRegister);
registerCommand('login', handlerLogin);
registerCommand('reset', handlerDeleteAllUsers);
registerCommand('users', handlerGetUsers);
registerCommand('agg', handlerAggregate);
registerCommand('addfeed', middlewareLoggedIn(handlerAddFeed)); // checks for user logged in
registerCommand('feeds', handlerGetAllFeeds);
registerCommand('follow', middlewareLoggedIn(setUserToFollowFeed)); //// checks for user logged in
registerCommand('following', middlewareLoggedIn(handlerFollowing)); // checks for user logged in
registerCommand('unfollow', middlewareLoggedIn(handlerUnfollow));

/*================
 helper functions
==================*/

function printFeed(feed: Feed, user: User): void {
  //    printFeed that takes a Feed and User and logs the fields to the console.
  //  Feed and User are types from our schema that we can get with drizzle's type helpers.
  console.log('============`');
  console.log(`User ------- \n ${JSON.stringify(user)} \n`);
  console.log(`Feed ------- \n ${JSON.stringify(feed)} \n ============`);
}

function handleError(err: unknown): void {
  if (err instanceof Error) {
    console.error(`[ERROR] ${err.message}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.error(`[ERROR] unknown error: `, err);
  }
}

export async function scrapeFeeds(): Promise<void> {
  try {
    const nextFeed = await getNextFeedToFetch();
    if (!nextFeed) {
      console.log(`[agg] found no feeds`);
      return;
    }
    console.log(`[agg] fetching ${nextFeed.name} ${nextFeed.name}`);
    await markFeedFetched(nextFeed.id);

    const feed: RSSFeed = await fetchFeed(nextFeed.url);
    console.log(`Feed channel title ${feed.channel.title}`);
    for (const { title, link, description, pubDate } of feed.channel.item) {
      const newPost = await createPost(
        title,
        link,
        pubDate,
        description,
        nextFeed.id
      );

      if (!newPost) {
        console.log(`[SKIP] already had post created for ${link} `);
      }

      console.log(
        `POST CREATED for --------- \n ${JSON.stringify(
          newPost,
          null,
          2
        )} \n\n\n`
      );
    }
  } catch (error) {
    console.error('Error occurred scraping feeds: ', error);
  }
}
