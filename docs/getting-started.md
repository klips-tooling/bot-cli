# Getting Started with BOT Chain

## Install the CLI

```bash
npm install -g bot-cli
```

## Create a project

```bash
botdev init
```

You will be prompted for:

1. Project name
2. Project type (Smart Contracts Only / Fullstack dApp)
3. Contract framework (Foundry)
4. Contract starter: Counter or Guess the Number
5. Default network (BOT Testnet / BOT Mainnet)
6. Frontend template (if fullstack): Vite + Vanilla, Vite + Vue, or Vite + React
7. Package manager (npm, Yarn, Bun)
8. TypeScript (frontend)
9. Styling (Plain CSS / Tailwind CSS)
10. Initialize a git repository
11. Linting / formatting: None, Prettier, or ESLint + Prettier

## Smart contracts only

```bash
botdev init
# choose "Smart Contracts Only"

cd my-bot-project
forge test
forge script script/DeployCounter.s.sol --rpc-url https://rpc.bohr.life --broadcast
```

## Fullstack dApp

```bash
botdev init
# choose "Fullstack dApp"

cd my-bot-project/frontend
npm run dev
```

Contracts live in `contracts/`. The frontend uses `viem` + `wagmi` and is pre-configured for BOT Testnet.

## Switch networks

Copy `.env.example` to `.env` in the frontend and set:

```env
VITE_BOT_CHAIN_ID=968
VITE_BOT_RPC_URL=https://rpc.bohr.life
```

For mainnet, use chain ID `677` and RPC `https://rpc.botchain.ai`.

## Useful commands

```bash
botdev info      # Show network info
botdev testnet   # Show testnet faucet + RPC
botdev deploy    # Deploy guidance
```
