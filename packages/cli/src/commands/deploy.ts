import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import execa from 'execa';
import { isCancel, cancelAndExit, printBanner } from '../utils/prompts.js';

const ISSUE_URL = 'https://github.com/klips-tooling/bot-cli/issues';

function extractDeployedAddress(output: string): string | null {
  // Forge prints something like:
  //   Contract Address: 0x1234...
  //   Deployed to: 0x1234...
  const patterns = [
    /Contract Address:\s*(0x[0-9a-fA-F]{40})/,
    /Deployed to:\s*(0x[0-9a-fA-F]{40})/,
    /contract address:\s*(0x[0-9a-fA-F]{40})/i,
  ];
  for (const re of patterns) {
    const m = output.match(re);
    if (m) return m[1];
  }
  // Fallback: grab any 0x address that looks like a contract address
  const allAddresses = [...output.matchAll(/0x[0-9a-fA-F]{40}/g)].map((m) => m[0]);
  return allAddresses[allAddresses.length - 1] ?? null;
}

async function detectProject(cwd: string) {
  const dirs = [cwd, path.join(cwd, 'contracts')];
  for (const dir of dirs) {
    if (await fs.pathExists(path.join(dir, 'foundry.toml')))
      return { dir, framework: 'foundry' as const };
    for (const cfg of ['hardhat.config.ts', 'hardhat.config.js', 'hardhat.config.cjs']) {
      if (await fs.pathExists(path.join(dir, cfg)))
        return { dir, framework: 'hardhat' as const };
    }
  }
  return null;
}

async function listDeployScripts(dir: string, framework: 'foundry' | 'hardhat'): Promise<string[]> {
  if (framework === 'foundry') {
    const scriptDir = path.join(dir, 'script');
    if (!(await fs.pathExists(scriptDir))) return [];
    return (await fs.readdir(scriptDir))
      .filter((f) => f.endsWith('.s.sol'))
      .map((f) => f.replace('.s.sol', ''));
  } else {
    const scriptDir = path.join(dir, 'scripts');
    if (!(await fs.pathExists(scriptDir))) return [];
    return (await fs.readdir(scriptDir)).filter(
      (f) => f.endsWith('.ts') || f.endsWith('.js'),
    );
  }
}

export const deployCommand = new Command('deploy')
  .description('Deploy smart contracts to BOT Chain')
  .option('-s, --script <name>', 'Deploy script name (Foundry) or file (Hardhat)')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --private-key <key>', 'Private key (omit for prompt)')
  .option('--sender <address>', 'Sender address (Foundry only)')
  .option('--broadcast', 'Broadcast transaction (Foundry only, default: true)')
  .action(async (opts) => {
    printBanner();

    const cwd = process.cwd();
    const detected = await detectProject(cwd);

    if (!detected) {
      p.cancel(
        'No foundry.toml or hardhat.config found.\n' +
          'Run this command from your project or contracts directory.',
      );
      process.exit(1);
    }

    const { dir, framework } = detected;
    p.intro(chalk.bold(`🚀  Deploy (${framework === 'foundry' ? 'Foundry' : 'Hardhat'})`));

    // ── Foundry ────────────────────────────────────────────────────────────────
    if (framework === 'foundry') {
      try {
        await execa('forge', ['--version'], { stdio: 'pipe' });
      } catch {
        p.cancel(
          'forge not found. Install Foundry:\n  curl -L https://foundry.paradigm.xyz | bash && foundryup',
        );
        process.exit(1);
      }

      // Pick script
      const scripts = await listDeployScripts(dir, 'foundry');
      let scriptName = opts.script;

      if (!scriptName) {
        if (scripts.length === 0) {
          p.cancel('No .s.sol scripts found in script/. Create a deploy script first.');
          process.exit(1);
        }
        if (scripts.length === 1) {
          scriptName = scripts[0];
          p.note(`Using script: ${chalk.cyan(scriptName + '.s.sol')}`, 'Auto-detected');
        } else {
          const chosen = await p.select({
            message: 'Which deploy script?',
            options: scripts.map((s) => ({ value: s, label: s + '.s.sol' })),
          });
          if (isCancel(chosen)) cancelAndExit();
          scriptName = chosen as string;
        }
      }

      // RPC URL
      const foundryConfig = await fs.readFile(path.join(dir, 'foundry.toml'), 'utf-8');
      const rpcMatch = foundryConfig.match(/bot-testnet\s*=\s*"([^"]+)"/);
      const defaultRpc = rpcMatch ? rpcMatch[1] : 'https://rpc.bohr.life';

      const rpcUrl = opts.rpc || ((await p.text({
        message: 'RPC URL',
        initialValue: defaultRpc,
      })) as string);
      if (isCancel(rpcUrl)) cancelAndExit();

      // Private key — check .env first
      let privateKey = opts.privateKey;
      if (!privateKey) {
        // Try reading from .env
        const envPath = path.join(dir, '.env');
        if (await fs.pathExists(envPath)) {
          const envContent = await fs.readFile(envPath, 'utf-8');
          const match = envContent.match(/^PRIVATE_KEY=(.+)$/m);
          if (match) {
            privateKey = match[1].trim();
            p.note(chalk.dim('Using PRIVATE_KEY from .env'), '🔑 Key loaded');
          }
        }
      }

      if (!privateKey) {
        privateKey = (await p.password({
          message: 'Private key (hidden)',
          mask: '*',
          validate: (v) => {
            if (!v?.trim()) return 'Private key is required';
            if (!v.startsWith('0x')) return 'Must start with 0x';
          },
        })) as string;
        if (isCancel(privateKey)) cancelAndExit();
      }

      const sender = opts.sender || '';
      const s = p.spinner();
      s.start(`Deploying ${chalk.cyan(scriptName + '.s.sol')}...`);

      try {
        const args = [
          'script',
          `script/${scriptName}.s.sol`,
          '--rpc-url', rpcUrl,
          '--broadcast',
          '--private-key', privateKey,
        ];
        if (sender) args.push('--sender', sender);

        const result = await execa('forge', args, { cwd: dir, all: true });
        const allOutput = result.all ?? '';

        s.stop(chalk.green('✓ Deploy successful!'));

        const contractAddr = extractDeployedAddress(allOutput);
        if (contractAddr) {
          const chainIdMatch = foundryConfig.match(/chain_id\s*=\s*(\d+)/);
          const chainId = chainIdMatch ? parseInt(chainIdMatch[1]) : 968;
          const explorer = chainId === 677 ? 'https://scan.botchain.ai' : 'https://scan.bohr.life';

          p.note(
            [
              `${chalk.bold('Contract:')}   ${chalk.green(contractAddr)}`,
              `${chalk.bold('Explorer:')}   ${chalk.cyan(`${explorer}/address/${contractAddr}`)}`,
            ].join('\n'),
            '📦 Deployed',
          );
        } else {
          p.note('Could not parse contract address from forge output.', '⚠  Address unknown');
        }
      } catch (err: any) {
        s.stop(chalk.red('✗ Deploy failed'));
        console.log();
        console.log(err.all ?? err.message);
        p.cancel(
          `Deployment failed.\n\nIf this is a bug, file an issue: ${chalk.cyan(ISSUE_URL)}`,
        );
        process.exit(1);
      }
    }

    // ── Hardhat ────────────────────────────────────────────────────────────────
    else {
      const scripts = await listDeployScripts(dir, 'hardhat');
      let scriptFile = opts.script;

      if (!scriptFile) {
        if (scripts.length === 0) {
          p.cancel('No scripts found in scripts/. Create a deploy script first.');
          process.exit(1);
        }
        if (scripts.length === 1) {
          scriptFile = scripts[0];
          p.note(`Using script: ${chalk.cyan(scriptFile)}`, 'Auto-detected');
        } else {
          const chosen = await p.select({
            message: 'Which deploy script?',
            options: scripts.map((s) => ({ value: s, label: s })),
          });
          if (isCancel(chosen)) cancelAndExit();
          scriptFile = chosen as string;
        }
      }

      const useNpx = !(await fs.pathExists(path.join(dir, 'node_modules', '.bin', 'hardhat')));
      const s = p.spinner();
      s.start(`Compiling & deploying via ${chalk.cyan('hardhat run scripts/' + scriptFile)}...`);

      try {
        const cmd = useNpx ? 'npx' : path.join(dir, 'node_modules', '.bin', 'hardhat');
        const args = useNpx
          ? ['hardhat', 'run', `scripts/${scriptFile}`, '--network', 'botTestnet']
          : ['run', `scripts/${scriptFile}`, '--network', 'botTestnet'];

        const result = await execa(cmd, args, { cwd: dir, all: true });
        const allOutput = result.all ?? '';

        s.stop(chalk.green('✓ Deploy successful!'));

        const contractAddr = extractDeployedAddress(allOutput);
        if (contractAddr) {
          p.note(
            [
              `${chalk.bold('Contract:')}  ${chalk.green(contractAddr)}`,
              `${chalk.bold('Explorer:')}  ${chalk.cyan(`https://scan.bohr.life/address/${contractAddr}`)}`,
            ].join('\n'),
            '📦 Deployed',
          );
        }

        // Echo any console.log output from the script
        if (allOutput.trim()) {
          console.log();
          console.log(chalk.dim('Script output:'));
          console.log(allOutput);
        }
      } catch (err: any) {
        s.stop(chalk.red('✗ Deploy failed'));
        console.log();
        console.log(err.all ?? err.message);
        p.cancel(
          `Deployment failed.\n\nIf this is a bug, file an issue: ${chalk.cyan(ISSUE_URL)}`,
        );
        process.exit(1);
      }
    }

    p.outro(chalk.green('Done.'));
  });
