import { setUser, readConfig } from './config.js';

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

type CommandRegistry = Record<string, CommandHandler>;
const commands: CommandRegistry = {};

// This function registers a new handler function for a command name.
function registerCommand(
  registry: CommandRegistry,
  cmdName: string,
  handler: CommandHandler
) {
  registry[cmdName] = handler;
}

// This function runs a given command with the provided state if it exists.
async function runCommand(
  registry: CommandRegistry,
  cmdName: string,
  ...args: string[]
) {
  // if in registry
  if (cmdName in registry) {
    registry[cmdName](cmdName, ...args);
  }
}

async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
  if (!args || args.length === 0) {
    throw new Error(`username is required for login`);
  }
  const username = args[0];

  setUser(username);
  console.log(`user has been set to ${username}`);
}

async function main() {
  const registry: Record<string, CommandHandler> = {} as CommandRegistry;
  registerCommand(registry, 'login', handlerLogin);

  const inputArgs: string[] = process.argv.slice(2);
  if (inputArgs.length === 0) {
    throw new Error('Not enough arguments were provided');
  }
  const [cmdName, ...args] = inputArgs;
  await runCommand(registry, cmdName, ...args);
}

await main();
