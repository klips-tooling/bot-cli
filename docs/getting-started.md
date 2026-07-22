# Getting Started with BOT Chain

## Install the CLI

```bash
npm install -g @klips-tooling/bot-cli
```

## Create a project

```bash
bot-cli init
```

You will be prompted for:

1. Project name
2. Project type (Smart Contracts Only / Fullstack dApp)
3. Contract framework (Foundry / Hardhat)
4. Default network (BOT Testnet / BOT Mainnet)
5. Contract starter: Counter or Guess the Number
6. Frontend template (if fullstack): Next.js + React, Vite + React, Vite + Vue, or Vite + Vanilla
7. Linting / formatting: None, Prettier, or ESLint + Prettier
8. Package manager (npm, Yarn, Bun, pnpm)

## Smart contracts only

```bash
bot-cli init
# choose "Smart Contracts Only"

cd my-bot-project
bot-cli compile
bot-cli wallet
bot-cli deploy
```

## Fullstack dApp

```bash
bot-cli init
# choose "Fullstack dApp"

cd my-bot-project/frontend
npm run dev
```

Contracts live in `contracts/`. The frontend uses `viem` + `wagmi` and is pre-configured for BOT Testnet.

## Switch networks

Use the built-in configuration utility to edit the project's settings:

```bash
bot-cli config interactive
```

Alternatively, copy `.env.example` to `.env` in the frontend/root folder and set:

```env
NEXT_PUBLIC_BOT_CHAIN_ID=968
NEXT_PUBLIC_BOT_RPC_URL=https://rpc.bohr.life
```

For mainnet, use chain ID `677` and RPC `https://rpc.botchain.ai`.

## Useful commands

```bash
bot-cli templates            # List all available templates
bot-cli compile              # Compile smart contracts
bot-cli wallet               # Generate a throwaway dev keypair for testing
bot-cli deploy               # Deploy smart contracts to BOT Chain
bot-cli clean                # Wipe build artifacts
bot-cli config interactive   # Edit configuration values interactively
bot-cli testnet faucet       # Get free testnet tokens (opens browser)
bot-cli testnet metamask     # View MetaMask network settings
bot-cli info                 # Show network details
```
