import { Command } from 'commander';
import chalk from 'chalk';
import { BOT_TESTNET } from '../constants.js';

export const testnetCommand = new Command('testnet')
  .description('Testnet tools — faucet, RPC, network config')
  .addHelpText(
    'after',
    `
Subcommands:
  bot testnet info      Show RPC, explorer, and chain ID
  bot testnet faucet    Print faucet URL (and open it if possible)
  bot testnet metamask  Print MetaMask "Add Network" details
`,
  )
  .action(() => {
    // Default: show info
    showTestnetInfo();
  });

function showTestnetInfo() {
  const n = BOT_TESTNET;
  console.log();
  console.log(chalk.cyan.bold('  🧪 BOT Testnet'));
  console.log(chalk.dim('  ' + '─'.repeat(44)));
  console.log(`  ${chalk.dim('Chain ID  ')}  ${chalk.bold(n.chainId)}`);
  console.log(`  ${chalk.dim('RPC URL   ')}  ${chalk.cyan(n.rpcUrl)}`);
  console.log(`  ${chalk.dim('Explorer  ')}  ${chalk.cyan(n.explorerUrl)}`);
  console.log(`  ${chalk.dim('Faucet    ')}  ${chalk.cyan(n.faucetUrl ?? 'N/A')}`);
  console.log(`  ${chalk.dim('Currency  ')}  ${chalk.bold(n.nativeCurrency.symbol)}`);
  console.log(chalk.dim('  ' + '─'.repeat(44)));
  console.log();
}

testnetCommand
  .command('info')
  .description('Show BOT Testnet connection details')
  .action(showTestnetInfo);

testnetCommand
  .command('faucet')
  .description('Get free BOT testnet tokens')
  .action(() => {
    const url = BOT_TESTNET.faucetUrl!;
    console.log();
    console.log(`  ${chalk.bold('🚰 BOT Testnet Faucet')}`);
    console.log();
    console.log(`  ${chalk.cyan(url)}`);
    console.log();
    console.log(chalk.dim('  1. Copy your wallet address'));
    console.log(chalk.dim('  2. Open the link above and paste your address'));
    console.log(chalk.dim('  3. Request test BOT tokens'));
    console.log();

    // Attempt to open in browser (best-effort, silently ignore errors)
    try {
      const { execSync } = require('child_process');
      const cmd =
        process.platform === 'darwin'
          ? `open "${url}"`
          : process.platform === 'win32'
          ? `start "${url}"`
          : `xdg-open "${url}"`;
      execSync(cmd, { stdio: 'ignore' });
      console.log(chalk.green('  ✓ Opened in your browser'));
    } catch {
      /* silently ignore — some CI/headless environments don't have a browser */
    }
    console.log();
  });

testnetCommand
  .command('metamask')
  .description('Print MetaMask / wallet network config')
  .action(() => {
    const n = BOT_TESTNET;
    console.log();
    console.log(chalk.bold('  🦊  Add BOT Testnet to MetaMask'));
    console.log(chalk.dim('  ' + '─'.repeat(44)));
    console.log(`  ${chalk.dim('Network Name  ')}  ${n.name}`);
    console.log(`  ${chalk.dim('New RPC URL   ')}  ${chalk.cyan(n.rpcUrl)}`);
    console.log(`  ${chalk.dim('Chain ID      ')}  ${chalk.bold(n.chainId)}`);
    console.log(`  ${chalk.dim('Symbol        ')}  ${chalk.bold(n.nativeCurrency.symbol)}`);
    console.log(`  ${chalk.dim('Explorer URL  ')}  ${chalk.cyan(n.explorerUrl)}`);
    console.log(chalk.dim('  ' + '─'.repeat(44)));
    console.log();
    console.log(chalk.dim('  MetaMask → Settings → Networks → Add a network → Add manually'));
    console.log();
  });
