# Plan: Contract Deploy & Interact from UI

## Overview
Make the entire flow zero-stress:
1. `botdev init` auto-installs forge deps, compiles contracts, injects artifacts into frontend
2. Frontend lets user deploy contract via connected wallet (no terminal needed)
3. After deploy, user can read/write contract functions from the UI
4. Better READMEs for every template

## Changes

### 1. CLI `init.ts` — Auto-build contracts & inject artifacts
- After scaffolding + git init, check if `forge` is installed via `forge --version`
- If yes: run `forge install foundry-rs/forge-std --no-git` inside contracts dir
- Run `forge build` to compile
- Parse `out/{ContractFile}.sol/{ContractName}.json` → extract `abi` + `bytecode.object`
- Write to `frontend/src/lib/contract.json`
- Also pass chainId, rpcUrl, explorerUrl to the frontend via env

### 2. CLI `deploy.ts` — Improved terminal deploy
- Check forge installed first
- Prompt for private key (masked input via @clack/prompts)
- Run forge script --broadcast with --private-key flag automatically
- Show explorer link after success

### 3. React template — ContractPlayground component
- New `src/components/ContractPlayground.tsx`
- Reads `../../src/lib/contract.json` for abi + bytecode
- **Deploy phase**: Button "Deploy Contract" → `writeContract({ abi, bytecode, args: [] })`
  - Uses `useWriteContract` from wagmi
  - Shows pending state, tx hash
  - Uses `useWaitForTransactionReceipt` to get `receipt.contractAddress`
- **After deploy**: Shows contract address with copy + explorer link
- **Interact phase**:
  - For each ABI entry:
    - Read functions (`stateMutability: 'view'`): auto-fetch on mount and show value
    - Write functions: input fields + "Send" button calling `writeContract({ abi, address, functionName, args })`
- Import in `App.tsx` after wallet-card, only visible when wallet connected
- CSS styles in `style.tailwind.css`

### 4. Vue template — ContractPlayground
- Add a new component or inline in App.vue
- Uses `@wagmi/vue` composables: `useWriteContract`, `useWaitForTransactionReceipt`
- Same logic as React

### 5. Vanilla template — ContractPlayground
- Inline in `main.ts` after the wallet card
- Uses `@wagmi/core` actions: `writeContract`, `getTransactionReceipt`
- Wait for receipt via polling or `waitForTransactionReceipt`

### 6. READMEs
- Each frontend template gets a comprehensive README with:
  - Prerequisites (Node, Foundry)
  - Quick start with full setup
  - Project structure
  - How to deploy contracts from the UI
  - How to interact with the contract
  - Available scripts
- Root README for fullstack projects links to both sub-READMEs

## Files to modify
- `packages/cli/src/commands/init.ts`
- `packages/cli/src/commands/deploy.ts`
- `templates/vite-react/src/App.tsx`
- `templates/vite-react/src/components/ContractPlayground.tsx` (new)
- `templates/vite-react/src/main.tsx` (add queryClient passing? already has it)
- `templates/vite-react/src/style.tailwind.css`
- `templates/vite-vue/src/App.vue`
- `templates/vite-vue/src/style.tailwind.css`
- `templates/vite-vanilla/src/main.ts`
- `templates/vite-vanilla/src/style.tailwind.css`
- `templates/vite-react/README.md`
- `templates/vite-vue/README.md`
- `templates/vite-vanilla/README.md`
- `templates/foundry-basic/README.md`
