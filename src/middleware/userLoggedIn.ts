import { type CommandHandler, UserCommandHandler } from 'src/commands/commands';
import { type User } from 'src/lib/db/schema';
import { readConfig } from 'src/config';
import { getUserByName } from 'src/lib/db/queries/users';

// type middlewareLoggedIn = (handler: UserCommandHandler) => CommandHandler;

export const middlewareLoggedIn = (
  handler: UserCommandHandler
): CommandHandler => {
  return async (cmdName: string, ...args: string[]) => {
    const { currentUserName } = readConfig(); // if logged in, their name will be in teh config file

    const user = await getUserByName(currentUserName || '');

    if (!user) {
      throw new Error(`User "${currentUserName} not found`);
    }

    console.debug(
      `=========== Middle ware was used to login user: ${JSON.stringify(
        user,
        null,
        2
      )}`
    );
    console.debug(' ===================================================');

    await handler(cmdName, user, ...args); //
  };
};
