import { Command } from 'commander';
import chalk from 'chalk';

export const addCommand = new Command('add')
  .description('Add a feature to an existing BOT Chain project')
  .argument('[feature]', 'Feature to add (ui, bridge, token)')
  .action((feature?: string) => {
    if (!feature) {
      console.log(chalk.bold('Available features:'));
      console.log(`  ${chalk.cyan('ui')}      — Add the BOT UI Kit (coming in v0.2)`);
      console.log(`  ${chalk.cyan('bridge')}  — Add BOT Bridge integration (coming in v0.2)`);
      console.log(`  ${chalk.cyan('token')}   — Add an ERC-20 token starter (coming in v0.2)`);
      console.log();
      console.log(`Run ${chalk.yellow('bot add <feature>')} when available.`);
      return;
    }

    console.log(chalk.yellow(`Feature "${feature}" is not available in v0.1.`));
    console.log('Stay tuned for v0.2, which will include UI kit, bridge, and token starters.');
  });
