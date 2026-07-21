import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { listTemplates, getTemplate, copyTemplate } from '../src/utils/template.js';

describe('template utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bot-cli-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('lists expected templates', async () => {
    const templates = await listTemplates();
    const names = templates.map((t) => t.name);
    expect(names).toContain('foundry-basic');
    expect(names).toContain('vite-vanilla');
    expect(names).toContain('vite-vue');
  });

  it('distinguishes contract and frontend templates', async () => {
    const foundry = await getTemplate('foundry-basic');
    expect(foundry?.type).toBe('contracts');

    const vanilla = await getTemplate('vite-vanilla');
    expect(vanilla?.type).toBe('frontend');
    expect(vanilla?.supportsTailwind).toBe(true);
  });

  it('copies a template and replaces tokens', async () => {
    const target = path.join(tempDir, 'output');
    await copyTemplate('foundry-basic', target, { projectName: 'hello-bot' });

    const readme = await fs.readFile(path.join(target, 'README.md'), 'utf-8');
    expect(readme).toContain('# hello-bot');

    const templateJson = path.join(target, 'template.json');
    expect(await fs.pathExists(templateJson)).toBe(false);
  });

  it('replaces package-manager tokens in frontend README', async () => {
    const target = path.join(tempDir, 'frontend');
    await copyTemplate('vite-vanilla', target, {
      projectName: 'hello-bot',
      installCommand: 'bun install',
      devCommand: 'bun dev',
    });

    const readme = await fs.readFile(path.join(target, 'README.md'), 'utf-8');
    expect(readme).toContain('bun install');
    expect(readme).toContain('bun dev');
    expect(readme).not.toContain('npm install');
    expect(readme).not.toContain('npm run dev');
  });

  it('renames template gitignore to .gitignore in generated project', async () => {
    const target = path.join(tempDir, 'with-gitignore');
    await copyTemplate('vite-vanilla', target, { projectName: 'hello-bot' });

    expect(await fs.pathExists(path.join(target, '.gitignore'))).toBe(true);
    expect(await fs.pathExists(path.join(target, 'gitignore'))).toBe(false);

    const gitignore = await fs.readFile(path.join(target, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.env');
  });
});
