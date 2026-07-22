import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { printBanner, isCancel, cancelAndExit } from '../utils/prompts.js';

// ── .env helpers ──────────────────────────────────────────────────────────────

function parseEnv(content: string): Map<string, { value: string; comment: string }> {
  const map = new Map<string, { value: string; comment: string }>();
  let lastComment = '';
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd();
    if (line.startsWith('#')) {
      lastComment = line.slice(1).trim();
      continue;
    }
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      map.set(match[1], { value: match[2], comment: lastComment });
      lastComment = '';
    } else {
      lastComment = '';
    }
  }
  return map;
}

function serializeEnv(map: Map<string, { value: string; comment: string }>): string {
  const lines: string[] = [];
  for (const [key, { value, comment }] of map) {
    if (comment) lines.push(`# ${comment}`);
    lines.push(`${key}=${value}`);
  }
  return lines.join('\n') + '\n';
}

async function findEnvFile(startDir: string): Promise<string | null> {
  // Look in cwd, then parent (for monorepo / fullstack)
  for (const dir of [startDir, path.dirname(startDir)]) {
    const candidate = path.join(dir, '.env');
    if (await fs.pathExists(candidate)) return candidate;
  }
  return null;
}

// ── Command ───────────────────────────────────────────────────────────────────

export const configCommand = new Command('config')
  .description('Read and write your project .env configuration')
  .addHelpText(
    'after',
    `
Examples:
  bot config list                         # show all .env values
  bot config set PRIVATE_KEY 0xabc...     # set a specific key
  bot config get NEXT_PUBLIC_BOT_CHAIN_ID # get a specific key
  bot config interactive                  # guided interactive editor
`,
  );

// bot config list
configCommand
  .command('list')
  .description('Show all .env key/value pairs')
  .action(async () => {
    printBanner();
    const envPath = await findEnvFile(process.cwd());
    if (!envPath) {
      p.cancel('No .env file found in this directory. Run bot init first or create one manually.');
      process.exit(1);
    }

    const content = await fs.readFile(envPath, 'utf-8');
    const vars = parseEnv(content);

    p.intro(chalk.bold(`📋  ${path.relative(process.cwd(), envPath)}`));
    console.log();

    if (vars.size === 0) {
      console.log(chalk.dim('  (empty)'));
    } else {
      const maxKey = Math.max(...[...vars.keys()].map((k) => k.length));
      for (const [key, { value }] of vars) {
        const isSecret =
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('private');
        const displayValue = isSecret
          ? chalk.dim(value.slice(0, 6) + '••••••' + value.slice(-4))
          : chalk.green(value || chalk.dim('(empty)'));
        console.log(`  ${chalk.cyan(key.padEnd(maxKey + 2))} ${displayValue}`);
      }
    }
    console.log();
    p.outro(chalk.dim(envPath));
  });

// bot config get <KEY>
configCommand
  .command('get <key>')
  .description('Get a single .env value')
  .action(async (key: string) => {
    const envPath = await findEnvFile(process.cwd());
    if (!envPath) { console.error('No .env file found.'); process.exit(1); }
    const vars = parseEnv(await fs.readFile(envPath, 'utf-8'));
    const entry = vars.get(key.toUpperCase());
    if (!entry) { console.error(chalk.red(`Key "${key}" not found in .env`)); process.exit(1); }
    console.log(entry.value);
  });

// bot config set <KEY> <VALUE>
configCommand
  .command('set <key> <value>')
  .description('Set a .env value (creates the file if absent)')
  .action(async (key: string, value: string) => {
    printBanner();
    const cwd = process.cwd();
    let envPath = await findEnvFile(cwd);
    if (!envPath) {
      envPath = path.join(cwd, '.env');
      await fs.writeFile(envPath, '');
    }

    const content = await fs.readFile(envPath, 'utf-8');
    const vars = parseEnv(content);
    const normKey = key.toUpperCase();
    const existed = vars.has(normKey);
    vars.set(normKey, { value, comment: vars.get(normKey)?.comment ?? '' });
    await fs.writeFile(envPath, serializeEnv(vars));

    console.log(
      `  ${chalk.green('✓')}  ${existed ? 'Updated' : 'Added'} ${chalk.cyan(normKey)} in ${chalk.dim(path.relative(cwd, envPath))}`,
    );
  });

// bot config interactive
configCommand
  .command('interactive')
  .alias('i')
  .description('Guided interactive editor for common BOT Chain env vars')
  .action(async () => {
    printBanner();
    p.intro(chalk.bold('⚙️   Configure Project'));

    const cwd = process.cwd();
    let envPath = await findEnvFile(cwd);
    if (!envPath) envPath = path.join(cwd, '.env');

    const existing = (await fs.pathExists(envPath))
      ? parseEnv(await fs.readFile(envPath, 'utf-8'))
      : new Map<string, { value: string; comment: string }>();

    const get = (key: string) => existing.get(key)?.value ?? '';

    const rpcUrl = await p.text({
      message: 'RPC URL',
      initialValue: get('NEXT_PUBLIC_BOT_RPC_URL') || get('VITE_BOT_RPC_URL') || 'https://rpc.bohr.life',
    });
    if (isCancel(rpcUrl)) cancelAndExit();

    const chainId = await p.text({
      message: 'Chain ID (677 = Mainnet, 968 = Testnet)',
      initialValue: get('NEXT_PUBLIC_BOT_CHAIN_ID') || get('VITE_BOT_CHAIN_ID') || '968',
      validate: (v) => (isNaN(Number(v)) ? 'Must be a number' : undefined),
    });
    if (isCancel(chainId)) cancelAndExit();

    const privateKey = await p.password({
      message: 'Private key (leave blank to skip)',
      mask: '*',
    });
    if (isCancel(privateKey)) cancelAndExit();

    const wcProjectId = await p.text({
      message: 'WalletConnect Project ID (from cloud.walletconnect.com)',
      initialValue:
        get('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID') ||
        get('VITE_WALLETCONNECT_PROJECT_ID') ||
        '',
      placeholder: 'your_project_id_here',
    });
    if (isCancel(wcProjectId)) cancelAndExit();

    // Detect which prefix to use
    const isNext = await fs.pathExists(path.join(cwd, 'next.config.mjs'))
      || await fs.pathExists(path.join(cwd, 'next.config.js'));
    const prefix = isNext ? 'NEXT_PUBLIC_' : 'VITE_';

    const updates: Record<string, string> = {
      [`${prefix}BOT_RPC_URL`]: rpcUrl as string,
      [`${prefix}BOT_CHAIN_ID`]: chainId as string,
      [`${prefix}BOT_MAINNET_RPC_URL`]: 'https://rpc.botchain.ai',
      [`${prefix}BOT_TESTNET_RPC_URL`]: 'https://rpc.bohr.life',
    };
    if (privateKey) updates['PRIVATE_KEY'] = privateKey as string;
    if (wcProjectId) updates[`${prefix}WALLETCONNECT_PROJECT_ID`] = wcProjectId as string;

    for (const [k, v] of Object.entries(updates)) {
      existing.set(k, { value: v, comment: existing.get(k)?.comment ?? '' });
    }

    await fs.writeFile(envPath, serializeEnv(existing));
    p.note(chalk.green(path.relative(cwd, envPath)), '✓ Saved');
    p.outro(chalk.green('Configuration updated.'));
  });
