import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import execa from 'execa';
import { printBanner } from '../utils/prompts.js';

// Detect project root + framework
async function detectProject(cwd: string) {
  const dirs = [cwd, path.join(cwd, 'contracts')];

  for (const dir of dirs) {
    if (await fs.pathExists(path.join(dir, 'foundry.toml'))) {
      return { dir, framework: 'foundry' as const };
    }
    for (const cfg of ['hardhat.config.ts', 'hardhat.config.js', 'hardhat.config.cjs']) {
      if (await fs.pathExists(path.join(dir, cfg))) {
        return { dir, framework: 'hardhat' as const };
      }
    }
  }
  return null;
}

export const compileCommand = new Command('compile')
  .description('Compile smart contracts (auto-detects Foundry or Hardhat)')
  .option('--force', 'Force recompile (Foundry: passes --force flag)')
  .option('-d, --dir <path>', 'Contract directory (defaults to auto-detect)')
  .action(async (opts) => {
    printBanner();
    p.intro(chalk.bold('🔨  Compile Contracts'));

    const cwd = opts.dir ? path.resolve(opts.dir) : process.cwd();
    const detected = await detectProject(cwd);

    if (!detected) {
      p.cancel(
        'No foundry.toml or hardhat.config found.\n' +
          'Run this from your project or contracts directory.',
      );
      process.exit(1);
    }

    const { dir, framework } = detected;
    const label = framework === 'foundry' ? 'Foundry' : 'Hardhat';
    const s = p.spinner();

    if (framework === 'foundry') {
      // ── Foundry ──────────────────────────────────────────────────────
      try {
        await execa('forge', ['--version'], { stdio: 'pipe' });
      } catch {
        p.cancel(
          'forge not found. Install Foundry:\n  curl -L https://foundry.paradigm.xyz | bash && foundryup',
        );
        process.exit(1);
      }

      const args = ['build'];
      if (opts.force) args.push('--force');

      s.start(`Compiling with ${chalk.cyan('forge build')}${opts.force ? ' --force' : ''}...`);
      try {
        const result = await execa('forge', args, { cwd: dir, stderr: 'pipe', stdout: 'pipe' });
        s.stop(chalk.green(`✓ Compiled successfully (${label})`));

        // Extract stats from forge output
        const output = result.stdout + result.stderr;
        const compiled = (output.match(/Compiling \d+ files?/i) || [])[0];
        const cached = (output.match(/No files changed, compilation skipped/i) || [])[0];

        if (cached) {
          p.note('No files changed — skipped recompilation.', 'Cache hit');
        } else if (compiled) {
          p.note(compiled, 'Build stats');
        }
      } catch (err: any) {
        s.stop(chalk.red('✗ Compilation failed'));
        console.log();
        console.log(err.stderr || err.message);
        p.cancel('Fix the errors above and try again.');
        process.exit(1);
      }
    } else {
      // ── Hardhat ──────────────────────────────────────────────────────
      const pkgPath = path.join(dir, 'package.json');
      const useNpx = !(await fs.pathExists(path.join(dir, 'node_modules', '.bin', 'hardhat')));
      const cmd = useNpx ? 'npx' : path.join(dir, 'node_modules', '.bin', 'hardhat');
      const args = useNpx ? ['hardhat', 'compile'] : ['compile'];

      s.start(`Compiling with ${chalk.cyan('hardhat compile')}...`);
      try {
        await execa(cmd, args, { cwd: dir, stdio: 'inherit' });
        s.stop(chalk.green(`✓ Compiled successfully (${label})`));
      } catch {
        s.stop(chalk.red('✗ Compilation failed'));
        p.cancel('Fix the errors above and try again.');
        process.exit(1);
      }
    }

    // Show output dir
    const outDir = framework === 'foundry' ? path.join(dir, 'out') : path.join(dir, 'artifacts');
    p.note(chalk.dim(outDir), '📦 Artifacts written to');
    p.outro(chalk.green('Compilation complete.'));
  });
