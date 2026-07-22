import { Command } from 'commander';
import chalk from 'chalk';
import { VERSION } from './constants.js';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { deployCommand } from './commands/deploy.js';
import { compileCommand } from './commands/compile.js';
import { testnetCommand } from './commands/testnet.js';
import { infoCommand } from './commands/info.js';
import { walletCommand } from './commands/wallet.js';
import { cleanCommand } from './commands/clean.js';
import { configCommand } from './commands/config.js';
import { checkForUpdates } from './utils/checkUpdate.js';

// ── Global crash handler ──────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error();
  console.error(chalk.red.bold('  ✖  Unexpected error:'), err.message);
  if (process.env.DEBUG) console.error(err.stack);
  console.error();
  console.error(
    chalk.dim('  If this is a bug, please file an issue:'),
    chalk.cyan('https://github.com/klips-tooling/bot-cli/issues'),
  );
  console.error();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error();
  console.error(chalk.red.bold('  ✖  Unhandled error:'), msg);
  console.error(
    chalk.dim('  If this is a bug:'),
    chalk.cyan('https://github.com/klips-tooling/bot-cli/issues'),
  );
  console.error();
  process.exit(1);
});

// ── Custom help renderer ──────────────────────────────────────────────────────
function printCustomHelp(): void {
  const i = '  ';
  const lines = [
    '',
    chalk.bold.cyanBright(`${i}🤖  BOT Chain Developer Tools`) + chalk.dim(`  v${VERSION}`),
    chalk.dim(`${i}Build and ship dApps on BOT Chain in seconds`),
    '',
    chalk.dim(`${i}Usage:`),
    `${i}  ${chalk.cyan('bot')} ${chalk.yellow('<command>')} ${chalk.dim('[options]')}`,
    '',
    chalk.dim(`${i}Commands:`),
    `${i}  ${chalk.cyan('init')}             Scaffold a new BOT Chain project`,
    `${i}  ${chalk.cyan('add')}              Add a contract starter (token, nft)`,
    `${i}  ${chalk.cyan('compile')}          Compile contracts (Foundry / Hardhat)`,
    `${i}  ${chalk.cyan('deploy')}           Deploy contracts to BOT Chain`,
    `${i}  ${chalk.cyan('clean')}            Wipe build artifacts`,
    `${i}  ${chalk.cyan('wallet')}           Generate a dev keypair for testing`,
    `${i}  ${chalk.cyan('config')}           Read / write project .env`,
    `${i}  ${chalk.cyan('testnet')}          Testnet tools — faucet, MetaMask config`,
    `${i}  ${chalk.cyan('info')}             Show BOT Chain network info`,
    `${i}  ${chalk.cyan('templates')}        List all available project templates`,
    '',
    chalk.dim(`${i}Options:`),
    `${i}  ${chalk.yellow('-v, --version')}   Display the current version`,
    `${i}  ${chalk.yellow('-h, --help')}      Display help for a command`,
    '',
    chalk.dim(`${i}Examples:`),
    `${i}  ${chalk.cyan('bot init')}                    Scaffold a new project interactively`,
    `${i}  ${chalk.cyan('bot templates')}               List all available templates`,
    `${i}  ${chalk.cyan('bot compile')}                 Compile smart contracts`,
    `${i}  ${chalk.cyan('bot deploy')}                  Deploy to BOT Chain`,
    `${i}  ${chalk.cyan('bot wallet')}                  Generate a dev keypair`,
    `${i}  ${chalk.cyan('bot testnet faucet')}          Open testnet faucet in browser`,
    `${i}  ${chalk.cyan('bot config interactive')}      Edit .env config interactively`,
    '',
    chalk.dim(`${i}Docs: https://klips-tooling.github.io/bot-cli`),
    '',
  ];
  console.log(lines.join('\n'));
}

// ── Program setup ─────────────────────────────────────────────────────────────
const program = new Command();

program
  .name('bot-cli')
  .description('BOT Chain developer tools')
  .version(VERSION, '-v, --version', 'Display the current version');

// Override Commander's outputHelp to use our coloured version
(program as any).outputHelp = () => {
  printCustomHelp();
};

// ── templates command ─────────────────────────────────────────────────────────
const templatesCommand = new Command('templates')
  .description('List all available project templates and frameworks')
  .action(() => {
    const i = '  ';
    console.log();
    console.log(chalk.bold.cyanBright(`${i}📦  Available Templates`));
    console.log();
    console.log(chalk.dim(`${i}Contract Frameworks:`));
    console.log(`${i}  ${chalk.cyan('foundry')}           Foundry (forge) — fast, Rust-based`);
    console.log(`${i}  ${chalk.cyan('hardhat')}           Hardhat — JS/TS, extensive plugin ecosystem`);
    console.log();
    console.log(chalk.dim(`${i}Contract Starters:`));
    console.log(`${i}  ${chalk.cyan('counter')}           Simple counter contract (read/write state)`);
    console.log(`${i}  ${chalk.cyan('guess-the-number')}  Number guessing game contract`);
    console.log();
    console.log(chalk.dim(`${i}Frontend Templates (Fullstack dApp only):`));
    console.log(`${i}  ${chalk.cyan('nextjs-react')}      Next.js 14 + React + RainbowKit + Wagmi`);
    console.log(`${i}  ${chalk.cyan('vite-react')}        Vite + React + RainbowKit + Wagmi`);
    console.log(`${i}  ${chalk.cyan('vite-vue')}          Vite + Vue 3`);
    console.log(`${i}  ${chalk.cyan('vite-vanilla')}      Vite + Vanilla JS`);
    console.log();
    console.log(chalk.dim(`${i}Package Managers:`));
    console.log(`${i}  ${chalk.cyan('bun')}  ${chalk.cyan('npm')}  ${chalk.cyan('yarn')}  ${chalk.cyan('pnpm')}`);
    console.log();
    console.log(`${i}Run ${chalk.cyan('bot init')} to scaffold a project.`);
    console.log();
  });

// ── Register commands ─────────────────────────────────────────────────────────
program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(compileCommand);
program.addCommand(deployCommand);
program.addCommand(cleanCommand);
program.addCommand(walletCommand);
program.addCommand(configCommand);
program.addCommand(testnetCommand);
program.addCommand(infoCommand);
program.addCommand(templatesCommand);

// No-args default: show our custom help
program.action(() => {
  printCustomHelp();
});

// ── Update check (cached — max 1 network hit per 24 h) ───────────────────────
checkForUpdates();

program.parse();
