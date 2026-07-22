import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { printBanner, isCancel, cancelAndExit } from '../utils/prompts.js';
import { getTemplatesRoot } from '../constants.js';

// ── Contract starters available via bot add ───────────────────────────────────
const CONTRACT_FEATURES = [
  {
    value: 'token',
    label: 'ERC-20 Token',
    hint: 'Mintable, burnable, Ownable',
    file: 'Token.sol',
    template: 'token',
  },
  {
    value: 'nft',
    label: 'ERC-721 NFT',
    hint: 'With URI storage, Ownable',
    file: 'NFT.sol',
    template: 'nft',
  },
] as const;

type ContractFeature = (typeof CONTRACT_FEATURES)[number]['value'];

function detectContractDir(cwd: string): string | null {
  // Prefer an explicit src/ or contracts/ sub-directory
  const candidates = [
    path.join(cwd, 'src'),
    path.join(cwd, 'contracts', 'src'),
    cwd,
    path.join(cwd, 'contracts'),
  ];
  return candidates.find((d) => fs.pathExistsSync(d)) ?? null;
}

export const addCommand = new Command('add')
  .description('Add a contract starter to an existing BOT Chain project')
  .argument('[feature]', 'Feature to add: token, nft')
  .action(async (featureArg?: string) => {
    printBanner();
    p.intro(chalk.bold('➕  Add to Project'));

    let feature = featureArg as ContractFeature | undefined;

    if (!feature) {
      const choice = await p.select({
        message: 'What would you like to add?',
        options: CONTRACT_FEATURES.map((f) => ({
          value: f.value,
          label: `${chalk.cyan(f.label)}`,
          hint: f.hint,
        })),
      });
      if (isCancel(choice)) cancelAndExit();
      feature = choice as ContractFeature;
    }

    const featureMeta = CONTRACT_FEATURES.find((f) => f.value === feature);
    if (!featureMeta) {
      p.cancel(
        `Unknown feature "${feature}". Available: ${CONTRACT_FEATURES.map((f) => f.value).join(', ')}`,
      );
      process.exit(1);
    }

    // Ask for a custom contract name
    const contractName = await p.text({
      message: `Contract name`,
      initialValue:
        feature === 'token' ? 'MyToken' : 'MyNFT',
      validate: (v) => {
        if (!v || v.trim().length === 0) return 'Required';
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(v))
          return 'Must start with uppercase and contain only letters/numbers (e.g. MyToken)';
      },
    });
    if (isCancel(contractName)) cancelAndExit();

    let symbol = '';
    if (feature === 'token') {
      const s = await p.text({
        message: 'Token symbol (e.g. MTK)',
        initialValue: 'MTK',
        validate: (v) => {
          if (!v || v.trim().length === 0) return 'Required';
          if (v.length > 11) return 'Symbol should be 11 chars or fewer';
        },
      });
      if (isCancel(s)) cancelAndExit();
      symbol = s as string;
    } else {
      const s = await p.text({
        message: 'NFT symbol (e.g. MNFT)',
        initialValue: 'MNFT',
        validate: (v) => (!v || v.trim().length === 0 ? 'Required' : undefined),
      });
      if (isCancel(s)) cancelAndExit();
      symbol = s as string;
    }

    // Locate destination
    const cwd = process.cwd();
    const destDir = detectContractDir(cwd);
    if (!destDir) {
      p.cancel('Could not find a src/ directory. Run this from your contracts folder.');
      process.exit(1);
    }

    const destFile = path.join(destDir, `${contractName as string}.sol`);

    if (await fs.pathExists(destFile)) {
      const overwrite = await p.confirm({
        message: `${path.relative(cwd, destFile)} already exists. Overwrite?`,
        initialValue: false,
      });
      if (isCancel(overwrite) || !overwrite) cancelAndExit();
    }

    // Read and fill template
    const templateFile = path.join(
      getTemplatesRoot(),
      'contract-starters',
      featureMeta.template,
      featureMeta.file,
    );

    if (!(await fs.pathExists(templateFile))) {
      p.cancel(`Template not found: ${templateFile}`);
      process.exit(1);
    }

    let content = await fs.readFile(templateFile, 'utf-8');
    const cn = contractName as string;
    if (feature === 'token') {
      content = content.replace(/\{\{TOKEN_NAME\}\}/g, cn).replace(/\{\{TOKEN_SYMBOL\}\}/g, symbol);
    } else {
      content = content.replace(/\{\{NFT_NAME\}\}/g, cn).replace(/\{\{NFT_SYMBOL\}\}/g, symbol);
    }

    await fs.writeFile(destFile, content, 'utf-8');

    p.note(
      [
        `${chalk.green('✓')} ${path.relative(cwd, destFile)}`,
        '',
        chalk.dim('Next steps:'),
        chalk.dim(`  • Run ${chalk.cyan('bot compile')} to build`),
        chalk.dim(`  • Run ${chalk.cyan('bot deploy')} to deploy to BOT Chain`),
        feature === 'token'
          ? chalk.dim('  • Requires @openzeppelin/contracts (add via forge install or npm)')
          : chalk.dim('  • Requires @openzeppelin/contracts (add via forge install or npm)'),
      ].join('\n'),
      `✓ Added ${featureMeta.label}`,
    );

    p.outro(chalk.green('Done.'));
  });
