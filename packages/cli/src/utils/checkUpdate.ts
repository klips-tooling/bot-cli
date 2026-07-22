import updateNotifier from 'update-notifier';
import chalk from 'chalk';

const pkg = require('../../package.json') as { name: string; version: string };

/**
 * Checks npm for a newer version of bot-cli.
 *
 * - Non-blocking: the actual network hit runs in a detached child process.
 * - Cached: re-checks at most once every 24 hours.
 * - Silent on failure: a bad network never crashes the CLI.
 */
export function checkForUpdates(): void {
  try {
    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: process.env.BOT_CLI_FORCE_UPDATE ? 0 : 1000 * 60 * 60 * 24, // 24 h
    });

    if (process.env.BOT_CLI_FORCE_UPDATE) {
      notifier.update = {
        latest: '9.9.9',
        current: pkg.version,
        type: 'major',
        name: pkg.name,
      };
    }

    if (notifier.update) {
      const { latest, current, type } = notifier.update;

      const typeLabel =
        type === 'major'
          ? chalk.red.bold(type)
          : type === 'minor'
            ? chalk.yellow.bold(type)
            : chalk.green.bold(type);

      // Detect the package manager the user likely used to install bot-cli
      const ua = process.env.npm_config_user_agent ?? '';
      const pmCmd = ua.startsWith('bun')
        ? `bun add -g ${pkg.name}`
        : ua.startsWith('pnpm')
          ? `pnpm add -g ${pkg.name}`
          : `npm install -g ${pkg.name}`;

      const inner = 52;
      const line = (text: string) => {
        const stripped = text.replace(/\u001b\[[0-9;]*m/gi, ''); // strip ANSI for length
        const pad = Math.max(0, inner - stripped.length);
        return chalk.yellow('│') + text + ' '.repeat(pad) + chalk.yellow('│');
      };

      console.log('\n' + chalk.yellow('╭' + '─'.repeat(inner) + '╮'));
      console.log(line(chalk.bold('  🤖  Update available for bot-cli')));
      console.log(line(''));
      console.log(
        line(
          `  ${chalk.dim(current)}  →  ${chalk.green.bold(latest)}   ` +
            chalk.dim(`(${typeLabel} update)`),
        ),
      );
      console.log(line(''));
      console.log(line(`  Run: ${chalk.cyan(pmCmd)}`));
      console.log(chalk.yellow('╰' + '─'.repeat(inner) + '╯') + '\n');
    }
  } catch {
    // Never crash the CLI over an update check — silently ignored
  }
}
