import { RSSFeed } from 'src/lib/rss/types.js';
import { setUser, readConfig } from '../config.js';
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from '../lib/db/queries/users.js';
import { createFeed } from '../lib/db/queries/feeds.js';
import { fetchFeed } from 'src/lib/rss/index.js';
import { type Feed, User } from 'src/lib/db';

export type CommandHandler = (
  cmdName: string,
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

  const existing = await getUserByName(username);
  if (!existing) throw new Error('user does not exist');

  setUser(username);
  console.log(`user has been set to: ${username}`);
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

async function handlerAggregate(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const url = args[0] || 'https://www.wagslane.dev/index.xml';
  const rssFeed: RSSFeed = await fetchFeed(url);

  console.log(JSON.stringify(rssFeed, null, 2));
}

/*
name: The name of the feed
  - name of the feed (like "The Changelog, or "The Boot.dev Blog")
url: The URL of the feed
  - https://www.wagslane.dev/index.xml
shell cmd:
npm run start addFeed "The Boot.dev Blog" https://www.wagslane.dev/index.xml
  */
async function handlerAddFeed(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const [name, url] = args; // name is name of Feed, not user

  if (!name || !url) {
    throw new Error(
      `Either feed name = "${name} or feed url = "${url} missing"`
    );
  }

  const { currentUserName } = readConfig();
  if (!currentUserName) {
    throw new Error('current user not found from config');
  }
  const user: User = await getUserByName(currentUserName);
  const feed: Feed = await createFeed(name, url, user.id);

  printFeed(feed, user);
}

registerCommand('register', handlerRegister);
registerCommand('login', handlerLogin);
registerCommand('reset', handlerDeleteAllUsers);
registerCommand('users', handlerGetUsers);
registerCommand('agg', handlerAggregate);
registerCommand('addfeed', handlerAddFeed);

/*
 helper function called printFeed that takes a Feed and User and logs the fields to the console.
 Feed and User are types from our schema that we can get with drizzle's type helpers.
*/

function printFeed(feed: Feed, user: User): void {
  console.log('============`');
  console.log(`User ------- \n ${JSON.stringify(user)} \n`);
  console.log(`Feed ------- \n ${JSON.stringify(feed)} \n ============`);
}
//https://www.wagslane.dev/index.xml
