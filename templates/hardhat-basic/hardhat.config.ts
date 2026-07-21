import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    "bot-testnet": {
      url: "{{rpcUrl}}",
      chainId: {{chainId}},
      accounts: [PRIVATE_KEY],
    },
    testnet: {
      url: "{{rpcUrl}}",
      chainId: {{chainId}},
      accounts: [PRIVATE_KEY],
    },
    "bot-mainnet": {
      url: "https://rpc.botchain.ai",
      chainId: 677,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: "https://rpc.botchain.ai",
      chainId: 677,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
