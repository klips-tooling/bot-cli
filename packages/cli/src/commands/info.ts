import { Command } from 'commander';
import chalk from 'chalk';
import { NETWORKS } from '../constants.js';

export const infoCommand = new Command('info')
  .description('Show BOT Chain network information')
  .action(() => {
    console.log(chalk.bold('🤖 BOT Chain Networks'));
    console.log();
    for (const network of NETWORKS) {
      console.log(chalk.cyanBright.bold(`  ${network.name}`));
      console.log(`    Chain ID:     ${network.chainId}`);
      console.log(`    RPC URL:      ${network.rpcUrl}`);
      console.log(`    Explorer:     ${network.explorerUrl}`);
      if (network.faucetUrl) {
        console.log(`    Faucet:       ${network.faucetUrl}`);
      }
      console.log(`    Currency:     ${network.nativeCurrency.symbol} (${network.nativeCurrency.decimals} decimals)`);
      console.log();
    }
  });
