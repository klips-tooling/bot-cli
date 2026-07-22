<p align="center">
  <img src="https://raw.githubusercontent.com/klips-tooling/bot-cli/main/docs/logo.svg" alt="BOT Chain CLI" width="100" />
</p>

<h1 align="center">@klips-tooling/bot-cli</h1>

<p align="center">
  <strong>Interactive CLI for scaffolding fullstack dApps on BOT Chain</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@klips-tooling/bot-cli"><img src="https://img.shields.io/npm/v/@klips-tooling/bot-cli?color=%2310A37F&style=flat-square" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" alt="License" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v-lts/@klips-tooling/bot-cli?style=flat-square" alt="Node.js" /></a>
</p>

---

## Install

```bash
npm install -g @klips-tooling/bot-cli
```

Requires **Node.js ≥ 18**.

## Quick Start

```bash
bot-cli init
```

Answer the prompts — the CLI scaffolds a full project with your choices of:

- **Frontend:** Next.js, Vite+React, Vite+Vue, or Vanilla TS
- **Contracts:** Counter or Guess the Number (Foundry)
- **Styling:** Tailwind CSS or Plain CSS
- **Tooling:** npm / pnpm / yarn / bun, git init, linting

## Commands

| Command             | Description                               |
| ------------------- | ----------------------------------------- |
| `bot-cli init`      | Scaffold a new BOT Chain project          |
| `bot-cli add`       | Add components or contracts (coming soon) |
| `bot-cli deploy`    | Print Foundry deployment guidance         |
| `bot-cli testnet`   | Show BOT Testnet faucet, RPC & explorer   |
| `bot-cli info`      | Display BOT Chain network details         |
| `bot-cli --version` | Print CLI version                         |

## What you get

```
my-dapp/
├── contracts/       # Foundry project (Counter or GuessTheNumber)
├── frontend/        # Full BOT-branded dApp with wallet + contract UI
└── README.md
```

Every frontend template ships with:

- **Wallet connection** — wagmi + RainbowKit pre-configured
- **Contract playground** — read/write functions from the UI
- **Dark/light mode** — theme toggle built in
- **Neobrutalist design** — bold, BOT-branded UI

## Networks

| Network            | Chain ID | RPC                       |
| ------------------ | -------- | ------------------------- |
| BOT Mainnet        | 677      | `https://rpc.botchain.ai` |
| BOT Testnet (Bohr) | 968      | `https://rpc.bohr.life`   |

## Links

- **GitHub:** [klips-tooling/bot-cli](https://github.com/klips-tooling/bot-cli)
- **Homepage:** [klips-tooling.github.io/bot-cli](https://klips-tooling.github.io/bot-cli)
- **Created by:** [Eldevode](https://github.com/Eldevode) · [@Eldevode_](https://x.com/Eldevode_)

## License

Apache-2.0 © [Eldevode](https://github.com/Eldevode)
