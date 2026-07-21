# bot-cli

<p align="center">
  <img src="https://raw.githubusercontent.com/Botchain-tooling/bot-cli/main/docs/logo.svg" alt="BOT Chain CLI" width="120" />
</p>

<p align="center">
  <strong>The fastest way to scaffold, connect, and ship dApps on BOT Chain.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/bot-cli"><img src="https://img.shields.io/npm/v/bot-cli?color=%2310A37F&style=flat-square" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" alt="License: Apache 2.0" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v-lts/bot-cli?style=flat-square" alt="Node.js version" /></a>
  <a href="https://github.com/Botchain-tooling/bot-cli"><img src="https://img.shields.io/github/stars/Botchain-tooling/bot-cli?style=flat-square" alt="GitHub Stars" /></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" /></a>
</p>

---

`bot-cli` is an interactive command-line tool that bootstraps **BOT Chain** projects in seconds. Choose your frontend framework, contract starter, and tooling preferences — the CLI scaffolds everything with best practices baked in.

> **Why BOT Chain?** BOT Chain is a fast, EVM-compatible L1 built for builders. Pre-configured networks, RPCs, and wallet connections out of the box.

---

## ✨ Features

- 🚀 **Interactive scaffolding** — answer a few prompts and get a full project
- 🔌 **Wallet ready** — wagmi + RainbowKit pre-configured for BOT Testnet & Mainnet
- 🧱 **Contract starters** — Counter & Guess the Number contracts with Foundry
- 🎨 **BOT-branded UI** — every frontend template ships with a polished neobrutalist landing page
- 🌗 **Dark/light mode** — theme toggle built in
- 🔧 **Contract playground** — read/write contract functions from the UI
- 📦 **Multiple frontends** — Next.js, Vite+React, Vite+Vue, Vite+Vanilla
- 🛠 **Package manager agnostic** — npm, pnpm, yarn, or bun

---

## 📦 Quick Install

```bash
npm install -g bot-cli
```

Requires **Node.js >= 18**.

---

## 🏁 Quick Start

```bash
# 1. Create a new project (interactive)
bot-cli init

# 2. Navigate into your project
cd my-bot-dapp

# 3. Start the frontend
npm run dev        # or: pnpm dev / yarn dev / bun run dev

# 4. (Optional) Run smart contract tests
cd contracts
forge test
```

### What you'll be prompted for

| Prompt | Options |
|--------|---------|
| Project name | Any valid package name |
| Project type | Fullstack dApp / Smart Contracts Only |
| Contract framework | Foundry |
| Contract starter | Counter / Guess the Number |
| Default network | BOT Testnet / BOT Mainnet |
| Frontend template | Next.js + React / Vite + React / Vite + Vue / Vite + Vanilla |
| Package manager | npm / pnpm / Yarn / Bun |
| TypeScript | Yes / No (frontend only) |
| Styling | Plain CSS / Tailwind CSS |
| Initialize git | Yes / No |
| Linting | None / Prettier / ESLint + Prettier |

---

## 📂 What gets scaffolded

```
my-bot-dapp/
├── contracts/           # Foundry project (Counter or GuessTheNumber)
│   ├── src/
│   ├── test/
│   ├── script/
│   └── foundry.toml
├── frontend/            # Your chosen frontend template
│   ├── src/
│   │   ├── botChain.ts          # Chain config (mainnet + testnet)
│   │   ├── App.tsx              # BOT-branded landing page
│   │   ├── components/
│   │   │   ├── ContractPlayground.tsx
│   │   │   └── ToastContainer.tsx
│   │   └── style.css            # Neobrutalist design system
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## 🛠 CLI Commands

| Command | Description |
|---------|-------------|
| `bot-cli init` | Scaffold a new BOT Chain project |
| `bot-cli add <feature>` | Add components or contracts (coming soon) |
| `bot-cli deploy` | Print deployment guidance for Foundry |
| `bot-cli testnet` | Show BOT Testnet faucet, RPC, and explorer links |
| `bot-cli info` | Display BOT Chain network details (mainnet + testnet) |
| `bot-cli --version` | Print the CLI version |
| `bot-cli --help` | Show all available commands |

---

## 🌐 Networks

### BOT Mainnet
- **Chain ID:** `677`
- **RPC URL:** `https://rpc.botchain.ai`
- **Explorer:** [https://botscan.ai](https://botscan.ai)

### BOT Testnet (Bohr)
- **Chain ID:** `968`
- **RPC URL:** `https://rpc.bohr.life`
- **Faucet:** [https://faucet.botchain.ai](https://faucet.botchain.ai)
- **Explorer:** [https://testnet.botscan.ai](https://testnet.botscan.ai)

---

## 🧑‍💻 Development

This is a **pnpm + Turborepo** monorepo.

```bash
# Clone
git clone https://github.com/Botchain-tooling/bot-cli.git
cd bot-cli

# Install
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run the CLI locally
pnpm botdev init
```

### Project structure

```
bot-cli/
├── packages/
│   └── cli/              # The bot-cli npm package
│       ├── src/
│       │   ├── commands/ # init, add, deploy, testnet, info
│       │   ├── utils/    # template, prompts, packageManager
│       │   ├── index.ts  # CLI entry point
│       │   └── constants.ts
│       ├── scripts/      # Build helpers
│       ├── test/         # Vitest tests
│       └── dist/         # Compiled output (+ templates)
├── templates/            # Template source files
│   ├── nextjs-react/
│   ├── vite-react/
│   ├── vite-vue/
│   ├── vite-vanilla/
│   ├── hardhat-basic/
│   └── contract-starters/
├── docs/                 # GitHub Pages landing page
├── plans/                # Internal planning docs
└── package.json          # Root workspace config
```

---

## 🤝 Contributing

We love contributions! See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for:

- Dev environment setup
- How to add new templates
- Commit conventions
- PR process

All contributions are licensed under Apache 2.0.

---

## 📄 License

This project is licensed under the **Apache License, Version 2.0**. See [`LICENSE`](./LICENSE) for the full text.

---

## 🔗 Links

- **GitHub Org:** [Botchain-tooling](https://github.com/Botchain-tooling)
- **Created by:** [Eldevode](https://github.com/Eldevode)
- **Twitter/X:** [@Eldevode_](https://x.com/Eldevode_)
- **npm:** [bot-cli on npm](https://www.npmjs.com/package/bot-cli)
- **BOT Chain:** [botchain.ai](https://botchain.ai)

---

<p align="center">
  <sub>Made with ⚡ by <a href="https://github.com/Eldevode">Eldevode</a> for the BOT Chain ecosystem</sub>
</p>
