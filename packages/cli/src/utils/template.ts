import fs from 'fs-extra';
import path from 'path';
import { getTemplatesRoot } from '../constants.js';
import { getAddCommand, runPackageManager, type PackageManager } from './packageManager.js';

export interface TemplateDescriptor {
  name: string;
  label: string;
  type: 'contracts' | 'frontend';
  framework?: string;
  description?: string;
  supportsTailwind?: boolean;
}

export async function listTemplates(): Promise<TemplateDescriptor[]> {
  const root = getTemplatesRoot();
  const entries = await fs.readdir(root, { withFileTypes: true });
  const templates: TemplateDescriptor[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const descriptorPath = path.join(root, entry.name, 'template.json');
    if (!(await fs.pathExists(descriptorPath))) continue;
    const descriptor = (await fs.readJson(descriptorPath)) as TemplateDescriptor;
    templates.push({ ...descriptor, name: entry.name });
  }

  return templates;
}

export async function getTemplate(name: string): Promise<TemplateDescriptor | undefined> {
  const templates = await listTemplates();
  return templates.find((t) => t.name === name);
}

export async function copyTemplate(
  templateName: string,
  targetDir: string,
  variables: Record<string, string> = {},
): Promise<void> {
  const root = getTemplatesRoot();
  const sourceDir = path.join(root, templateName);

  if (!(await fs.pathExists(sourceDir))) {
    throw new Error(`Template not found: ${templateName}`);
  }

  await fs.copy(sourceDir, targetDir, {
    filter: (srcPath) => {
      const base = path.basename(srcPath);
      return base !== 'node_modules' && base !== 'template.json' && base !== '.git';
    },
  });

  await replaceTokens(targetDir, variables);
  await renameGitignore(targetDir);
}

async function renameGitignore(targetDir: string): Promise<void> {
  const gitignorePath = path.join(targetDir, 'gitignore');
  if (await fs.pathExists(gitignorePath)) {
    await fs.move(gitignorePath, path.join(targetDir, '.gitignore'), { overwrite: true });
  }
}

export async function replaceTokens(dir: string, variables: Record<string, string>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await replaceTokens(fullPath, variables);
    } else if (entry.isFile()) {
      const content = await fs.readFile(fullPath, 'utf-8');
      let replaced = content;
      for (const [key, value] of Object.entries(variables)) {
        replaced = replaced.split(`{{${key}}}`).join(value);
      }
      if (replaced !== content) {
        await fs.writeFile(fullPath, replaced, 'utf-8');
      }
    }
  }
}

export async function copyContractStarter(
  starterName: string,
  targetDir: string,
  variables: Record<string, string> = {},
): Promise<void> {
  const root = getTemplatesRoot();
  const sourceDir = path.join(root, 'contract-starters', starterName);

  if (!(await fs.pathExists(sourceDir))) {
    throw new Error(`Contract starter not found: ${starterName}`);
  }

  await fs.copy(sourceDir, targetDir, {
    filter: (srcPath) => {
      const base = path.basename(srcPath);
      return base !== 'node_modules' && base !== '.git';
    },
  });

  // Hardhat expects contracts in contracts/ directory rather than src/
  const srcDir = path.join(targetDir, 'src');
  const contractsDir = path.join(targetDir, 'contracts');
  if (await fs.pathExists(srcDir)) {
    await fs.ensureDir(contractsDir);
    await fs.copy(srcDir, contractsDir);
  }

  await replaceTokens(targetDir, variables);
  await renameGitignore(targetDir);
}

export async function applyLinting(
  targetDir: string,
  pm: PackageManager,
  option: 'none' | 'prettier' | 'eslint-prettier',
  isTypeScript: boolean,
): Promise<void> {
  if (option === 'none') return;

  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = (await fs.pathExists(pkgPath))
    ? await fs.readJson(pkgPath)
    : { name: path.basename(targetDir), private: true, version: '0.0.0', type: 'module' };

  pkg.scripts = pkg.scripts || {};
  pkg.devDependencies = pkg.devDependencies || {};

  const deps: string[] = [];

  if (option === 'prettier' || option === 'eslint-prettier') {
    pkg.devDependencies.prettier = '^3.0.0';
    pkg.scripts.format = 'prettier --write .';
    deps.push('prettier');
  }

  if (option === 'eslint-prettier') {
    pkg.devDependencies.eslint = '^9.0.0';
    pkg.devDependencies['eslint-config-prettier'] = '^9.0.0';
    pkg.devDependencies['eslint-plugin-prettier'] = '^5.0.0';
    pkg.devDependencies['@eslint/js'] = '^9.0.0';
    pkg.scripts.lint = 'eslint .';
    deps.push('eslint', 'eslint-config-prettier', 'eslint-plugin-prettier', '@eslint/js');

    if (isTypeScript) {
      pkg.devDependencies['typescript-eslint'] = '^7.0.0';
      deps.push('typescript-eslint');
    }
  }

  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  await fs.writeFile(
    path.join(targetDir, '.prettierrc'),
    JSON.stringify(
      { semi: true, singleQuote: true, trailingComma: 'all', printWidth: 100 },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  await fs.writeFile(
    path.join(targetDir, '.prettierignore'),
    ['node_modules', 'dist', '.next', 'out', 'cache'].join('\n') + '\n',
    'utf-8',
  );

  if (option === 'eslint-prettier') {
    const configContent = isTypeScript
      ? `import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  eslintPluginPrettierRecommended,
  { ignores: ['dist/', 'node_modules/', '.turbo/', 'cache/', 'out/'] },
];
`
      : `import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  js.configs.recommended,
  eslintPluginPrettierRecommended,
  { ignores: ['dist/', 'node_modules/', '.turbo/', 'cache/', 'out/'] },
];
`;
    await fs.writeFile(path.join(targetDir, 'eslint.config.mjs'), configContent, 'utf-8');
  }

  await runPackageManager(pm, getAddCommand(pm, deps, true), targetDir);
}

export async function applyTailwind(targetDir: string, pm: PackageManager): Promise<void> {
  // Swap in Tailwind CSS file if present
  const stylePath = path.join(targetDir, 'src/style.css');
  const tailwindStylePath = path.join(targetDir, 'src/style.tailwind.css');

  if (await fs.pathExists(tailwindStylePath)) {
    await fs.move(tailwindStylePath, stylePath, { overwrite: true });
  }

  const pkgPath = path.join(targetDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    if (pkg.devDependencies?.tailwindcss || pkg.dependencies?.tailwindcss) {
      // Tailwind dependencies already present in template package.json
      return;
    }
  }

  // Tailwind CSS v4 uses the @tailwindcss/postcss plugin and a CSS @import.
  const deps = ['tailwindcss', '@tailwindcss/postcss', 'postcss'];
  await runPackageManager(pm, getAddCommand(pm, deps, true), targetDir);

  await fs.writeFile(
    path.join(targetDir, 'postcss.config.js'),
    `module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
`,
    'utf-8',
  );
}
