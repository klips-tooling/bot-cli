import { Command } from 'commander';
import { VERSION } from './constants.js';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { deployCommand } from './commands/deploy.js';
import { testnetCommand } from './commands/testnet.js';
import { infoCommand } from './commands/info.js';

const program = new Command();

program
  .name('bot-cli')
  .description('BOT Chain developer tools')
  .version(VERSION, '-v, --version', 'Display the current version');

program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(deployCommand);
program.addCommand(testnetCommand);
program.addCommand(infoCommand);

program.action(() => {
  program.help();
});

program.parse();
