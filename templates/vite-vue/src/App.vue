<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAccount, useConnect, useDisconnect, useBalance, useConfig } from '@wagmi/vue';
import { switchChain } from '@wagmi/core';
import { botMainnet, botTestnet, botNetworks } from './botChain';
import ContractPlayground from './components/ContractPlayground.vue';
import ToastContainer from './components/ToastContainer.vue';
import { addToast } from './lib/toast';

const { address, chain } = useAccount();
const { connect } = useConnect();
const { disconnect } = useDisconnect();
const { data: balance } = useBalance({ address });
const wagmiConfig = useConfig();



const dark = ref(false);
const showChainMenu = ref(false);

const targetChainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || botTestnet.id);
const targetNetworkName = targetChainId === botMainnet.id ? botMainnet.name : botTestnet.name;

const explorerUrl = computed(() => {
  const key = chain?.value?.id === botMainnet.id ? 'mainnet' : 'testnet';
  return address?.value
    ? `${botNetworks[key].explorer}/address/${address.value}`
    : botNetworks[key].explorer;
});

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function onConnect() {
  connect({ connector: wagmiConfig.connectors[0] });
}

function onDisconnect() {
  disconnect();
}

function toggleTheme() {
  dark.value = !dark.value;
}

function toggleChainMenu() {
  showChainMenu.value = !showChainMenu.value;
}

async function switchTo(chainId: number) {
  showChainMenu.value = false;
  try {
    await switchChain(wagmiConfig, { chainId: chainId as 677 | 968 });
  } catch {
    // user rejected or wallet doesn't support switching
  }
}

function copyAddress() {
  if (address.value) {
    navigator.clipboard.writeText(address.value);
    addToast('Address copied to clipboard', 'info');
  }
}

onMounted(() => {
  dark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.chain-switcher-wrap')) {
      showChainMenu.value = false;
    }
  });
});

watch(dark, (isDark) => {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
});
</script>

<template>
  <div>
    <!-- Navbar -->
    <nav class="navbar">
      <div class="brand">
        <svg class="w-11 h-11 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="44" height="44" rx="4" fill="#FFE01B" stroke="#0A0A0A" stroke-width="3"/>
          <rect x="8" y="10" width="32" height="24" rx="4" fill="#0A0A0A"/>
          <circle cx="18" cy="22" r="3" fill="#FFE01B"/>
          <circle cx="30" cy="22" r="3" fill="#FFE01B"/>
          <path d="M17 28 Q24 33 31 28" stroke="#FFE01B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>
        <span class="brand-title">BOT Chain</span>
      </div>

      <div class="nav-right">
        <span class="network-badge">{{ targetNetworkName }}</span>

        <button class="theme-toggle" @click="toggleTheme" :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg v-if="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        <button v-if="!address" class="nav-wallet-btn nav-wallet-btn--connect" @click="onConnect">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <circle cx="16" cy="12" r="1" fill="currentColor"/>
          </svg>
          Connect Wallet
        </button>
        <template v-else>
          <div class="chain-switcher-wrap">
            <button class="nav-wallet-btn nav-wallet-btn--address" @click.stop="toggleChainMenu">
              {{ chain?.name ?? 'Unknown' }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;margin-left:4px;">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div v-if="showChainMenu" class="chain-menu-wrap chain-menu-wrap--open">
              <ul class="chain-menu">
                <li
                  class="chain-menu-item"
                  :class="{ 'chain-menu-item--active': chain?.id === botMainnet.id }"
                  @click="switchTo(botMainnet.id)"
                >
                  {{ botMainnet.name }}
                </li>
                <li
                  class="chain-menu-item"
                  :class="{ 'chain-menu-item--active': chain?.id === botTestnet.id }"
                  @click="switchTo(botTestnet.id)"
                >
                  {{ botTestnet.name }}
                </li>
              </ul>
            </div>
          </div>
          <button class="nav-wallet-btn nav-wallet-btn--address">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <circle cx="16" cy="12" r="1" fill="currentColor"/>
            </svg>
            {{ truncateAddress(address) }}
            <span v-if="balance" class="nav-balance-pill">
              {{ parseFloat(balance.formatted).toFixed(4) }}&nbsp;{{ balance.symbol }}
            </span>
          </button>
        </template>
      </div>
    </nav>

    <!-- Hero -->
    <header class="hero">
      <h1>Build on <em>BOT Chain</em></h1>
      <p class="subtitle">
        The fast, EVM-compatible chain made for builders. Scaffold, connect, and ship in minutes.
      </p>
    </header>

    <!-- Connected wallet card -->
    <div v-if="address" class="wallet-card">
      <div class="wallet-card-header">
        <span class="wallet-status-dot"/>
        <h2>Wallet Connected</h2>
      </div>
      <div class="wallet-detail">
        <span class="wd-label">Address</span>
        <span class="wd-value" :title="address">{{ address }}</span>
      </div>
      <div class="wallet-detail">
        <span class="wd-label">Network</span>
        <span class="wd-value">{{ chain?.name ?? 'Unknown' }}</span>
      </div>
      <div class="wallet-detail">
        <span class="wd-label">Chain ID</span>
        <span class="wd-value">{{ chain?.id }}</span>
      </div>
      <div class="wallet-detail">
        <span class="wd-label">Balance</span>
        <span class="wd-value">
          {{ balance ? `${parseFloat(balance.formatted).toFixed(6)} ${balance.symbol}` : '—' }}
        </span>
      </div>
      <div class="wallet-actions">
        <a class="cta" :href="explorerUrl" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          View on Explorer
        </a>
        <button class="cta cta-danger" @click="onDisconnect">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
            <line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
          Disconnect
        </button>
      </div>
    </div>

    <!-- Faucet Prompt -->
    <div v-if="address" class="faucet-card">
      <div>
        <h4>Need Test Tokens?</h4>
        <p>Get free BOT from the faucet to deploy and test contracts.</p>
      </div>
      <div class="faucet-actions">
        <button class="cta cta-secondary" @click="copyAddress" style="display:inline-flex;align-items:center;gap:0.4rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Address
        </button>
        <a class="cta" href="https://faucet.botchain.ai/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.4rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open Faucet
        </a>
      </div>
    </div>

    <!-- Contract Playground -->
    <ContractPlayground v-if="address" />

    <!-- Features -->
    <div class="mb-3">
      <span class="section-label">Why BOT Chain</span>
    </div>
    <section class="features">
      <div class="card">
        <div class="card-accent"/>
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <h3>Fast Finality</h3>
        <p>Near-instant transaction finality designed for responsive dApps.</p>
      </div>
      <div class="card">
        <div class="card-accent"/>
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h3>EVM Compatible</h3>
        <p>Use familiar Solidity tooling, wallets, and deployment scripts.</p>
      </div>
      <div class="card">
        <div class="card-accent"/>
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <h3>Builder Ready</h3>
        <p>Pre-configured networks, RPCs, and wallet connection out of the box.</p>
      </div>
    </section>

    <!-- Network Details -->
    <div class="mb-16">
      <span class="section-label">Network Details</span>
      <p style="font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin: 0.25rem 0 1.25rem; color: var(--fg);">
        Available Networks
      </p>
      <div class="network-grid">
        <div class="network-card">
          <div class="network-card-stripe"/>
          <h3>{{ botNetworks.mainnet.name }}</h3>
          <div class="network-row">
            <span class="label">Chain ID</span>
            <span class="value">{{ botNetworks.mainnet.chainId }}</span>
          </div>
          <div class="network-row">
            <span class="label">RPC URL</span>
            <span class="value">{{ botNetworks.mainnet.rpc }}</span>
          </div>
          <a class="cta" :href="botNetworks.mainnet.explorer" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open Explorer
          </a>
        </div>

        <div class="network-card">
          <div class="network-card-stripe"/>
          <h3>{{ botNetworks.testnet.name }}</h3>
          <div class="network-row">
            <span class="label">Chain ID</span>
            <span class="value">{{ botNetworks.testnet.chainId }}</span>
          </div>
          <div class="network-row">
            <span class="label">RPC URL</span>
            <span class="value">{{ botNetworks.testnet.rpc }}</span>
          </div>
          <a class="cta cta-secondary" :href="botNetworks.testnet.explorer" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open Explorer
          </a>
        </div>
      </div>
    </div>

    <ToastContainer />

    <!-- Footer -->
    <footer class="footer">
      <span class="footer-tag">scaffold</span>
      <span>
        Generated by
        <a href="https://www.npmjs.com/package/bot-cli" target="_blank" rel="noopener">bot-cli</a>
      </span>
      <span class="footer-tag">EVM</span>
    </footer>
  </div>
</template>
