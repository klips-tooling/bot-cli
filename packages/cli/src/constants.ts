import path from 'path';

export const VERSION = '0.1.2';

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  faucetUrl?: string;
}

export const BOT_MAINNET: NetworkConfig = {
  name: 'BOT Mainnet',
  chainId: 677,
  rpcUrl: 'https://rpc.botchain.ai',
  explorerUrl: 'https://scan.botchain.ai',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
};

export const BOT_TESTNET: NetworkConfig = {
  name: 'BOT Testnet',
  chainId: 968,
  rpcUrl: 'https://rpc.bohr.life',
  explorerUrl: 'https://scan.bohr.life',
  faucetUrl: 'https://faucet.botchain.ai/basic',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
};

export const NETWORKS: NetworkConfig[] = [BOT_MAINNET, BOT_TESTNET];

export function getTemplatesRoot(): string {
  if (process.env.BOT_CLI_TEMPLATES) {
    return process.env.BOT_CLI_TEMPLATES;
  }
  return path.resolve(__dirname, 'templates');
}
