import { defineChain } from 'viem';

export const botMainnet = defineChain({
  id: 677,
  name: 'BOT Mainnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'BOT Scan', url: 'https://scan.botchain.ai' },
  },
});

export const botTestnet = defineChain({
  id: 968,
  name: 'BOT Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.bohr.life'] },
  },
  blockExplorers: {
    default: { name: 'BOT Testnet Scan', url: 'https://scan.bohr.life' },
  },
});

export const botNetworks = {
  mainnet: {
    chainId: botMainnet.id,
    name: botMainnet.name,
    rpc: botMainnet.rpcUrls.default.http[0],
    explorer: botMainnet.blockExplorers.default.url,
  },
  testnet: {
    chainId: botTestnet.id,
    name: botTestnet.name,
    rpc: botTestnet.rpcUrls.default.http[0],
    explorer: botTestnet.blockExplorers.default.url,
  },
};

