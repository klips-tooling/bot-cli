# Contributing to bot-cli

Thanks for your interest in contributing! This document covers how to set up your dev environment, make changes, and submit a pull request.

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## Getting started

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Foundry** (for contract template testing) — [install guide](https://book.getfoundry.sh/getting-started/installation)

### Dev setup

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/bot-cli.git
cd bot-cli

# 2. Install dependencies
pnpm install

# 3. Build the CLI
pnpm build

# 4. Run the CLI locally
pnpm botdev init

# 5. Run tests
pnpm test
```

### Watcher (auto-rebuild on changes)

```bash
cd packages/cli
pnpm dev   # tsup --watch
```

---

## Monorepo structure

```
bot-cli/
├── packages/cli/              # The npm package — bot-cli
│   ├── src/
│   │   ├── index.ts           # CLI entry point (commander)
│   │   ├── constants.ts       # Version, network config
│   │   ├── commands/          # init, add, deploy, testnet, info
│   │   └── utils/             # template, prompts, packageManager
│   ├── scripts/
│   │   └── copy-templates.js  # Copies templates/ → dist/ on build
│   ├── test/                  # Vitest tests
│   └── dist/                  # Compiled output (gitignored)
├── templates/                 # Template source files
│   ├── nextjs-react/
│   ├── vite-react/
│   ├── vite-vue/
│   ├── vite-vanilla/
│   ├── hardhat-basic/
│   └── contract-starters/
│       ├── counter/
│       └── guess-the-number/
└── package.json               # Root workspace config (pnpm + turbo)
```

---

## How to contribute

### 1. Report a bug

Open an issue using the [Bug Report template](https://github.com/klips-tooling/bot-cli/issues/new?template=bug_report.md). Include:

- CLI version (`bot-cli --version`)
- Node.js version (`node --version`)
- Steps to reproduce
- Expected vs actual behavior

### 2. Request a feature

Open an issue using the [Feature Request template](https://github.com/klips-tooling/bot-cli/issues/new?template=feature_request.md).

### 3. Submit a pull request

```bash
# 1. Create a branch
git checkout -b feat/my-feature

# 2. Make your changes

# 3. Build & test
pnpm build
pnpm test

# 4. Commit (follow conventional commits)
git commit -m "feat: add support for XYZ templates"

# 5. Push & open a PR
git push -u origin feat/my-feature
```

---

## Adding a new template

1. Create a new directory under `templates/` (e.g., `templates/vite-svelte/`).
2. Add all source files, plus a `template.json`:

```json
{
  "name": "vite-svelte",
  "label": "Vite + Svelte",
  "type": "frontend",
  "framework": "svelte",
  "description": "Svelte dApp template with viem & wagmi",
  "supportsTailwind": true
}
```

3. Add the template to the prompt choices in `packages/cli/src/commands/init.ts`.
4. Rebuild: `pnpm build`.
5. Test end-to-end: `pnpm botdev init` → select the new template.

---

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:       A new feature
fix:        A bug fix
docs:       Documentation changes
style:      Formatting, CSS changes
refactor:   Code restructuring (no behavior change)
test:       Adding or updating tests
chore:      Build, CI, tooling changes
```

---

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).

---

## Questions?

Open a [Discussion](https://github.com/klips-tooling/bot-cli/discussions) or reach out on [X/Twitter](https://x.com/Eldevode_).
