import * as p from '@clack/prompts';
import chalk from 'chalk';

export { p };

export function printBanner(): void {
  console.log();
  console.log(chalk.cyanBright.bold('  BOT Chain Developer Tools'));
  console.log(chalk.gray('  Scaffold BOT Chain projects in seconds'));
  console.log();
}

export function printSuccessBanner(title: string = 'PROJECT CREATED SUCCESSFULLY'): void {
  const ascii = `
  ____   ____ _____    ____ _   _    _ ___ _   _ 
 | __ ) / __ \\_   _|  / ___| | | |  / \\|_ _| \\ | |
 |  _ \\| |  | || |   | |   | |_| | / _ \\| ||  \\| |
 | |_) | |__| || |   | |___|  _  |/ ___ \\ || |\\  |
 |____/ \\____/ |_|    \\____|_| |_/_/   \\_\\___|_| \\_|
`;
  console.log(chalk.cyanBright(ascii));
  console.log(chalk.bold.green(`  ${title}`));
  console.log();
}

export function printDivider(): void {
  console.log(chalk.gray('─'.repeat(50)));
}

export function cancelAndExit(): never {
  p.cancel('Operation cancelled.');
  process.exit(0);
}

export function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}
