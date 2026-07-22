import { Command } from 'commander';
import chalk from 'chalk';
import { NETWORKS, BOT_MAINNET, BOT_TESTNET } from '../constants.js';

export const infoCommand = new Command('info')
  .description('Show BOT Chain network info and resources')
  .option('--mainnet', 'Show mainnet details only')
  .option('--testnet', 'Show testnet details only')
  .action((opts) => {
    const networks = opts.mainnet ? [BOT_MAINNET] : opts.testnet ? [BOT_TESTNET] : NETWORKS;

    console.log();
    console.log(chalk.bold.cyanBright('  🤖  BOT Chain Networks'));
    console.log();

    for (const network of networks) {
      const isMainnet = network.chainId === 677;
      const accent = isMainnet ? chalk.green : chalk.yellow;
      const label = isMainnet ? 'MAINNET' : 'TESTNET';

      console.log(`  ${accent.bold(`[${label}]`)}  ${chalk.bold(network.name)}`);
      console.log(chalk.dim('  ' + '─'.repeat(46)));
      console.log(`  ${chalk.dim('Chain ID   ')}  ${chalk.bold(network.chainId)}`);
      console.log(`  ${chalk.dim('RPC URL    ')}  ${chalk.cyan(network.rpcUrl)}`);
      console.log(`  ${chalk.dim('Explorer   ')}  ${chalk.cyan(network.explorerUrl)}`);
      if (network.faucetUrl) {
        console.log(`  ${chalk.dim('Faucet     ')}  ${chalk.cyan(network.faucetUrl)}`);
      }
      console.log(
        `  ${chalk.dim('Currency   ')}  ${chalk.bold(network.nativeCurrency.symbol)} ` +
          chalk.dim(`(${network.nativeCurrency.decimals} decimals)`),
      );
      console.log();
    }

    console.log(
      chalk.dim('  Tip: run ') +
        chalk.cyan('bot testnet faucet') +
        chalk.dim(' to get test tokens'),
    );
    console.log(
      chalk.dim('       run ') +
        chalk.cyan('bot testnet metamask') +
        chalk.dim(' for wallet setup'),
    );
    console.log();
  });
