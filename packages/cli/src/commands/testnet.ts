import { Command } from 'commander';
import chalk from 'chalk';
import { BOT_TESTNET } from '../constants.js';

export const testnetCommand = new Command('testnet')
  .description('Show BOT Testnet resources')
  .action(() => {
    console.log(chalk.bold('🧪 BOT Testnet'));
    console.log();
    console.log(`  Chain ID:     ${chalk.cyan(BOT_TESTNET.chainId)}`);
    console.log(`  RPC URL:      ${chalk.cyan(BOT_TESTNET.rpcUrl)}`);
    console.log(`  Explorer:     ${chalk.cyan(BOT_TESTNET.explorerUrl)}`);
    console.log(`  Faucet:       ${chalk.cyan(BOT_TESTNET.faucetUrl ?? 'N/A')}`);
    console.log(`  Currency:     ${chalk.cyan(BOT_TESTNET.nativeCurrency.symbol)} (${BOT_TESTNET.nativeCurrency.decimals} decimals)`);
    console.log();
    console.log(`Claim test BOT from the faucet, then point your wallet or dApp at the RPC above.`);
  });
