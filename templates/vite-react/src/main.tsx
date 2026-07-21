import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { WagmiProvider } from 'wagmi';
import {
  RainbowKitProvider,
  getDefaultWallets,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import App from './App';
import './style.css';
import { botMainnet, botTestnet } from './botChain';
import { ThemeContext } from './ThemeContext';

// ── Chain config ───────────────────────────────────────────
const testnetRpc = import.meta.env.VITE_BOT_RPC_URL || botTestnet.rpcUrls.default.http[0];
const mainnetRpc = import.meta.env.VITE_BOT_MAINNET_RPC_URL || botMainnet.rpcUrls.default.http[0];

const targetChainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || botTestnet.id);
const chains = targetChainId === botMainnet.id
  ? ([botMainnet, botTestnet] as const)
  : ([botTestnet, botMainnet] as const);

const { connectors } = getDefaultWallets({
  appName: 'BOT Chain Scaffold',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'bot-chain-scaffold',
});

const config = createConfig({
  chains,
  connectors,
  transports: {
    [botTestnet.id]: http(testnetRpc),
    [botMainnet.id]: http(mainnetRpc),
  },
});

const queryClient = new QueryClient();

// ── RainbowKit theme factory ───────────────────────────────
const rktLight = lightTheme({
  accentColor: '#10A37F',
  accentColorForeground: '#FFFFFF',
  borderRadius: 'none',
  fontStack: 'system',
});

const rktDark = darkTheme({
  accentColor: '#10A37F',
  accentColorForeground: '#FFFFFF',
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small',
});

// ── Root: owns dark state, syncs both RainbowKit + CSS ─────
function Root() {
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = useCallback(() => setDark(d => !d), []);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <RainbowKitProvider
        modalSize="compact"
        theme={dark ? rktDark : rktLight}
      >
        <App />
      </RainbowKitProvider>
    </ThemeContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
