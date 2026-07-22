import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { printBanner } from '../utils/prompts.js';

// Directories to wipe, keyed by label
const CLEAN_TARGETS = [
  { name: 'out/',       relPath: 'out',        desc: 'Foundry build output' },
  { name: 'cache/',     relPath: 'cache',       desc: 'Foundry build cache' },
  { name: 'artifacts/', relPath: 'artifacts',   desc: 'Hardhat build output' },
  { name: '.next/',     relPath: '.next',       desc: 'Next.js build cache' },
  { name: 'dist/',      relPath: 'dist',        desc: 'Vite / frontend build' },
  { name: 'typechain-types/', relPath: 'typechain-types', desc: 'Hardhat TypeChain output' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const items = await fs.readdir(dirPath);
    for (const item of items) {
      const full = path.join(dirPath, item);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat) continue;
      total += stat.isDirectory() ? await getDirSize(full) : stat.size;
    }
  } catch { /* ignore */ }
  return total;
}

export const cleanCommand = new Command('clean')
  .description('Wipe build artifacts (out/, cache/, artifacts/, .next/, dist/)')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('-d, --dir <path>', 'Project directory (defaults to cwd)')
  .action(async (opts) => {
    printBanner();
    p.intro(chalk.bold('🧹  Clean Build Artifacts'));

    const root = opts.dir ? path.resolve(opts.dir) : process.cwd();

    // Scan which targets exist + their sizes
    const found: Array<{ label: string; fullPath: string; size: number; desc: string }> = [];
    for (const target of CLEAN_TARGETS) {
      const fullPath = path.join(root, target.relPath);
      // Also check one level deeper (e.g. fullstack projects have contracts/ and frontend/)
      const deeperPath = path.join(root, 'contracts', target.relPath);
      const frontendPath = path.join(root, 'frontend', target.relPath);

      for (const p_ of [fullPath, deeperPath, frontendPath]) {
        if (await fs.pathExists(p_)) {
          const size = await getDirSize(p_);
          found.push({ label: path.relative(root, p_), fullPath: p_, size, desc: target.desc });
        }
      }
    }

    if (found.length === 0) {
      p.note('Nothing to clean — all build directories are already absent.', '✓ Already clean');
      p.outro(chalk.green('Done.'));
      return;
    }

    // Show what will be deleted
    console.log();
    console.log(chalk.dim('  Found the following build artifacts:\n'));
    let totalSize = 0;
    for (const item of found) {
      totalSize += item.size;
      console.log(
        `  ${chalk.red('✕')}  ${chalk.cyan(item.label.padEnd(28))} ${chalk.dim(formatBytes(item.size).padStart(8))}  ${chalk.dim(item.desc)}`,
      );
    }
    console.log();
    console.log(
      `  ${chalk.bold('Total:')} ${chalk.yellow(formatBytes(totalSize))} will be freed`,
    );
    console.log();

    // Confirm
    if (!opts.force) {
      const confirm = await p.confirm({
        message: `Delete ${found.length} director${found.length === 1 ? 'y' : 'ies'}?`,
        initialValue: false,
      });
      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Cancelled — nothing was deleted.');
        process.exit(0);
      }
    }

    const s = p.spinner();
    s.start('Cleaning...');

    let deleted = 0;
    for (const item of found) {
      try {
        await fs.remove(item.fullPath);
        deleted++;
      } catch (err: any) {
        s.stop(chalk.red(`Failed to remove ${item.label}: ${err.message}`));
      }
    }

    s.stop(chalk.green(`✓ Removed ${deleted}/${found.length} director${deleted === 1 ? 'y' : 'ies'}`));
    p.note(`Freed ${chalk.yellow(formatBytes(totalSize))}`, '🗑  Cleaned');
    p.outro(chalk.green('Done.'));
  });
