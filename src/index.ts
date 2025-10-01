import { setUser, readConfig } from './config.js';

type CommandHandler = (cmdName: string, ...args: string[]) => void;

// Allows additional fields of type CommandHandler
// through index signature
// type CommandRegistry = {
//   [key: string]: CommandHandler;
// };

// through Record utility
type CommandRegistry = Record<string, CommandHandler>;

const commands: CommandRegistry = {};

// This function registers a new handler function for a command name.
function registerCommand(
  registry: CommandRegistry,
  cmdName: string,
  handler: CommandHandler
) {}

// This function runs a given command with the provided state if it exists.
function runCommand(
  registry: CommandRegistry,
  cmdName: string,
  ...args: string[]
) {}

function handlerLogin(cmdName: string, ...args: string[]): void {
  if (!args || args.length === 0) {
    throw new Error(`username is required for login`);
  }
  const username = args[0];

  setUser(username);
  console.log(`user has been set to ${username}`);
}

function main() {
  // register commands
  const commands: Record<string, CommandHandler> = {} as CommandRegistry;
  commands['login'] = handlerLogin;

  const inputArgs: string[] = process.argv.slice(2);
  if (inputArgs.length === 0) {
    throw new Error('Not enough arguments were provided');
  }

  const [cmdName, ...args] = inputArgs;
  if (cmdName in commands) {
    commands[cmdName](cmdName, ...args);
  }
}

main();
