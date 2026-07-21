import { createApp } from 'vue';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import { createConfig, http, injected } from '@wagmi/core';
import { WagmiPlugin } from '@wagmi/vue';
import App from './App.vue';
import { botMainnet, botTestnet } from './botChain';
import './style.css';

const testnetRpc = import.meta.env.VITE_BOT_RPC_URL || botTestnet.rpcUrls.default.http[0];
const mainnetRpc = import.meta.env.VITE_BOT_MAINNET_RPC_URL || botMainnet.rpcUrls.default.http[0];

const targetChainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || botTestnet.id);
const chains = targetChainId === botMainnet.id ? ([botMainnet, botTestnet] as const) : ([botTestnet, botMainnet] as const);

const config = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [botTestnet.id]: http(testnetRpc),
    [botMainnet.id]: http(mainnetRpc),
  },
});

const queryClient = new QueryClient();

const app = createApp(App);
app.use(VueQueryPlugin, { queryClient });
app.use(WagmiPlugin, { config });
app.mount('#app');
