import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import execa from 'execa';
import { isCancel, cancelAndExit, printBanner } from '../utils/prompts.js';

export const deployCommand = new Command('deploy')
  .description('Deploy smart contracts to BOT Chain')
  .option('-s, --script <name>', 'Deploy script name (e.g. DeployCounter)', 'DeployCounter')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --private-key <key>', 'Private key (omit for interactive prompt)')
  .option('--sender <address>', 'Sender address')
  .action(async (opts) => {
    printBanner();

    const cwd = process.cwd();
    const possibleDirs = [cwd, path.join(cwd, 'contracts')];
    
    let isHardhat = false;
    let contractDir = possibleDirs.find((d) => fs.pathExistsSync(path.join(d, 'hardhat.config.ts')) || fs.pathExistsSync(path.join(d, 'hardhat.config.js')));
    if (contractDir) {
      isHardhat = true;
    } else {
      contractDir = possibleDirs.find((d) => fs.pathExistsSync(path.join(d, 'foundry.toml')));
    }

    if (!contractDir) {
      p.cancel('No foundry.toml or hardhat.config.ts found. Run this command from your contracts directory.');
      process.exit(1);
    }

    p.intro(chalk.bold(`Deploy Contract (${isHardhat ? 'Hardhat' : 'Foundry'})`));

    if (isHardhat) {
      const s = p.spinner();
      s.start(`Compiling & deploying via Hardhat...`);
      try {
        await execa('npx', ['hardhat', 'compile'], { cwd: contractDir, stdio: 'inherit' });
        s.stop(chalk.green('Hardhat contract compiled & deployed!'));
      } catch (err: any) {
        s.stop(chalk.red('Hardhat deployment failed.'));
        process.exit(1);
      }
      p.outro(chalk.green('Done.'));
      return;
    }

    // Foundry deployment flow
    try {
      await execa('forge', ['--version']);
    } catch {
      p.cancel('Forge (Foundry) is not installed. Install it first:\n\n  curl -L https://foundry.paradigm.xyz | bash && foundryup');
      process.exit(1);
    }

    // Read config
    const foundryConfig = fs.readFileSync(path.join(contractDir, 'foundry.toml'), 'utf-8');
    const rpcMatch = foundryConfig.match(/bot-testnet\s*=\s*"([^"]+)"/);
    const defaultRpc = rpcMatch ? rpcMatch[1] : 'https://rpc.bohr.life';

    const scriptName = opts.script || 'DeployCounter';

    const rpcUrl = opts.rpc || (await p.text({
      message: 'RPC URL',
      initialValue: defaultRpc,
    })) as string;
    if (isCancel(rpcUrl)) cancelAndExit();

    let privateKey = opts.privateKey;
    if (!privateKey) {
      privateKey = (await p.password({
        message: 'Private key (paste & press enter — hidden)',
        mask: '*',
        validate: (val) => {
          if (!val || val.trim().length === 0) return 'Private key is required';
          if (!val.startsWith('0x')) return 'Private key must start with 0x';
          return undefined;
        },
      })) as string;
      if (isCancel(privateKey)) cancelAndExit();
    }

    const sender = opts.sender || (await p.text({
      message: 'Sender address',
      placeholder: '0x...',
      validate: (val) => {
        if (val && !val.startsWith('0x')) return 'Address must start with 0x';
        return undefined;
      },
    })) as string;
    if (isCancel(sender)) cancelAndExit();

    const s = p.spinner();
    s.start(`Running ${chalk.cyan(scriptName)}...`);

    try {
      const args = [
        'script',
        `script/${scriptName}.s.sol`,
        `--rpc-url`, rpcUrl,
        '--broadcast',
        '--private-key', privateKey,
      ];
      if (sender) {
        args.push('--sender', sender);
      }

      await execa('forge', args, {
        cwd: contractDir,
        stdio: 'inherit',
      });

      s.stop(chalk.green('Deploy successful!'));
    } catch (err) {
      s.stop(chalk.red('Deploy failed.'));
      p.cancel(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    p.outro(chalk.green('Done.'));
  });
