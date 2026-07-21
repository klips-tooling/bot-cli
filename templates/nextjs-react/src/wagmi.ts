import { createConfig, http } from 'wagmi';
import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { botMainnet, botTestnet } from './botChain';

const testnetRpc = process.env.NEXT_PUBLIC_BOT_RPC_URL || botTestnet.rpcUrls.default.http[0];
const mainnetRpc = process.env.NEXT_PUBLIC_BOT_MAINNET_RPC_URL || botMainnet.rpcUrls.default.http[0];

const targetChainId = Number(process.env.NEXT_PUBLIC_BOT_CHAIN_ID || botTestnet.id);
const chains = targetChainId === botMainnet.id
  ? ([botMainnet, botTestnet] as const)
  : ([botTestnet, botMainnet] as const);

const { connectors } = getDefaultWallets({
  appName: 'BOT Chain Scaffold',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bot-chain-scaffold',
});

export const config = createConfig({
  chains,
  connectors,
  transports: {
    [botTestnet.id]: http(testnetRpc),
    [botMainnet.id]: http(mainnetRpc),
  },
  ssr: true,
});
