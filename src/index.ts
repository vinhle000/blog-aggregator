import {
  cmdRegistry,
  type CommandHandler,
  CommandRegistry,
} from './commands/commands.js';

async function runCommand(
  registry: CommandRegistry,
  cmdName: string,
  ...args: string[]
) {
  if (cmdName in registry) {
    await registry[cmdName](cmdName, ...args);
    return;
  }
  throw new Error(`unknown command: ${cmdName}`);
}

async function main() {
  const inputArgs: string[] = process.argv.slice(2);
  if (inputArgs.length === 0) {
    throw new Error('Not enough arguments were provided');
  }
  const [cmdName, ...args] = inputArgs;
  await runCommand(cmdRegistry, cmdName, ...args);
  process.exit(0);
}

await main();
