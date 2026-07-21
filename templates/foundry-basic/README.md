# {{projectName}} — Smart Contracts

A **Foundry** smart-contract project for **BOT Chain**, scaffolded by `bot-cli`.

## Prerequisites

- **Foundry** (forge, cast, anvil):
  ```bash
  curl -L https://foundry.paradigm.xyz | bash && foundryup
  ```

## Quick Start

```bash
# Install dependencies (forge-std)
forge install foundry-rs/forge-std

# Compile
forge build

# Run tests
forge test
forge test -vvvv  # verbose with traces
```

## Project Structure

```
contracts/
├── src/
│   └── {{contractFile}}.sol          # Main contract
├── test/
│   └── {{contractFile}}.t.sol        # Tests
├── script/
│   └── {{deployScriptName}}.s.sol    # Deploy script
├── lib/forge-std/                    # Forge standard library (git submodule)
├── foundry.toml                      # Foundry configuration
├── remappings.txt                    # Import aliases
└── .env.example                      # Environment variables template
```

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|---|---|
| `BOT_CHAIN_ID` | Target chain ID (default: `{{chainId}}`) |
| `BOT_RPC_URL` | RPC endpoint for the target network |
| `PRIVATE_KEY` | Wallet private key for deployment (keep secret!) |
| `BOT_MAINNET_EXPLORER_API_KEY` | API key for contract verification on Mainnet |
| `BOT_TESTNET_EXPLORER_API_KEY` | API key for contract verification on Testnet |

## Deploy

### Via terminal

```bash
# Load environment
source .env

# Deploy to BOT Testnet
forge script script/{{deployScriptName}}.s.sol \
  --rpc-url https://rpc.bohr.life \
  --broadcast \
  --private-key $PRIVATE_KEY \
  --sender 0xYourWalletAddress

# Deploy to BOT Mainnet
forge script script/{{deployScriptName}}.s.sol \
  --rpc-url https://rpc.botchain.ai \
  --broadcast \
  --private-key $PRIVATE_KEY \
  --sender 0xYourWalletAddress
```

### Via `botdev deploy`

```bash
botdev deploy \
  --script {{deployScriptName}} \
  --rpc https://rpc.bohr.life
```

You'll be prompted for your private key (hidden input).

### Via the Frontend UI

If you scaffolded a **fullstack** project (`botdev init` → "Fullstack dApp"), the frontend template includes a **Contract Playground** that lets you:

1. Connect your wallet
2. Click **Deploy Contract** — signs a deployment transaction via your wallet (no terminal needed)
3. After deployment, read/write contract functions directly from the UI

The compiled ABI + bytecode are automatically injected into the frontend during `botdev init` when Forge is detected.

## Verify on Explorer

After deployment, you can verify your contract source code on the block explorer:

```bash
forge verify-contract \
  --chain-id {{chainId}} \
  --verifier-url https://scan.bohr.life/api \
  --etherscan-api-key $BOT_TESTNET_EXPLORER_API_KEY \
  <DEPLOYED_ADDRESS> \
  src/{{contractFile}}.sol:{{contractName}}
```

## Network Details

| Network | Chain ID | RPC URL | Explorer |
|---|---|---|---|
| BOT Mainnet | 677 | `https://rpc.botchain.ai` | https://scan.botchain.ai |
| BOT Testnet | 968 | `https://rpc.bohr.life` | https://scan.bohr.life |

## Available Scripts

| Command | Description |
|---|---|
| `forge build` | Compile contracts |
| `forge test` | Run tests |
| `forge test -vvvv` | Run tests with full traces |
| `forge coverage` | Generate test coverage report |
| `forge snapshot` | Gas snapshot |
| `forge fmt` | Format Solidity source files |

## Learn More

- [Foundry Book](https://book.getfoundry.sh)
- [BOT Chain Documentation](https://docs.botchain.ai)
- [forge-std](https://github.com/foundry-rs/forge-std)
