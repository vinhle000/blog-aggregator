import { RSSFeed } from 'src/lib/rss/types.js';
import { setUser, readConfig } from '../config.js';
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from '../lib/db/queries/users.js';
import { fetchFeed } from 'src/lib/rss/fetch.js';

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

  const username = args[0];

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

registerCommand('register', handlerRegister);
registerCommand('login', handlerLogin);
registerCommand('reset', handlerDeleteAllUsers);
registerCommand('users', handlerGetUsers);
registerCommand('agg', handlerAggregate);
