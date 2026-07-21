import './style.css';
import {
  createConfig,
  http,
  reconnect,
  connect,
  disconnect,
  getAccount,
  watchAccount,
  getBalance,
  switchChain,
  injected,
} from '@wagmi/core';
import { botMainnet, botTestnet, botNetworks } from './botChain';
import {
  setConfig,
  setContractArtifact,
  contractSectionHtml,
  bindContractEvents,
  setReloadContract,
} from './contract';
import { subscribe, dismissToast, addToast, type Toast } from './lib/toast';

const testnetRpc = import.meta.env.VITE_BOT_RPC_URL || botTestnet.rpcUrls.default.http[0];
const mainnetRpc = import.meta.env.VITE_BOT_MAINNET_RPC_URL || botMainnet.rpcUrls.default.http[0];

const targetChainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || botTestnet.id);
const targetNetworkName = targetChainId === botMainnet.id ? botMainnet.name : botTestnet.name;
const chains = targetChainId === botMainnet.id ? ([botMainnet, botTestnet] as const) : ([botTestnet, botMainnet] as const);

export const config = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [botTestnet.id]: http(testnetRpc),
    [botMainnet.id]: http(mainnetRpc),
  },
});

setConfig(config);

// Load compiled contract artifact (injected by botdev CLI)
import contractJson from './lib/contract.json';
setContractArtifact(contractJson as any);

reconnect(config);

const app = document.querySelector<HTMLDivElement>('#app')!;

let dark = false;
let showChainMenu = false;

// ── Toast state ────────────────────────────────────
let toastList: Toast[] = [];
subscribe((list) => {
  toastList = list;
  render();
});

function setTheme(isDark: boolean) {
  dark = isDark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

if (typeof window !== 'undefined') {
  setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
}

const icon = {
  wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="16" cy="12" r="1" fill="currentColor"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

const logo = `<svg class="w-11 h-11 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="44" height="44" rx="4" fill="#FFE01B" stroke="#0A0A0A" stroke-width="3"/><rect x="8" y="10" width="32" height="24" rx="4" fill="#0A0A0A"/><circle cx="18" cy="22" r="3" fill="#FFE01B"/><circle cx="30" cy="22" r="3" fill="#FFE01B"/><path d="M17 28 Q24 33 31 28" stroke="#FFE01B" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function networkCard(net: (typeof botNetworks)[keyof typeof botNetworks], variant: 'primary' | 'secondary') {
  const ctaClass = variant === 'primary' ? 'cta' : 'cta cta-secondary';
  return `
    <div class="network-card">
      <div class="network-card-stripe"></div>
      <h3>${net.name}</h3>
      <div class="network-row"><span class="label">Chain ID</span><span class="value">${net.chainId}</span></div>
      <div class="network-row"><span class="label">RPC URL</span><span class="value">${net.rpc}</span></div>
      <a class="${ctaClass}" href="${net.explorer}" target="_blank" rel="noopener">${icon.external} Open Explorer</a>
    </div>
  `;
}

function chainMenuHtml(currentChainId: number) {
  const items = [
    { id: botMainnet.id, name: botMainnet.name },
    { id: botTestnet.id, name: botTestnet.name },
  ];
  const lis = items
    .map(
      (item) => `
      <li class="chain-menu-item${item.id === currentChainId ? ' chain-menu-item--active' : ''}" data-chain-id="${item.id}">
        ${item.name}
      </li>`,
    )
    .join('');
  return `<ul class="chain-menu">${lis}</ul>`;
}

async function render() {
  const account = getAccount(config);
  const connectedNetworkKey = account.chainId === botMainnet.id ? 'mainnet' : 'testnet';
  const explorerBase = targetChainId === 677 ? 'https://scan.botchain.ai' : 'https://scan.bohr.life';
  const explorerUrl = account.address
    ? `${botNetworks[connectedNetworkKey].explorer}/address/${account.address}`
    : botNetworks[connectedNetworkKey].explorer;

  let balanceHtml = '—';
  if (account.address) {
    try {
      const balance = await getBalance(config, { address: account.address });
      balanceHtml = `${parseFloat(balance.formatted).toFixed(6)} ${balance.symbol}`;
    } catch {
      balanceHtml = '—';
    }
  }

  const themeIcon = dark ? icon.sun : icon.moon;
  const themeLabel = dark ? 'Switch to light mode' : 'Switch to dark mode';

  const walletButton = account.isConnected && account.address
    ? `
      <div class="chain-switcher-wrap">
        <button id="chain-toggle" class="nav-wallet-btn nav-wallet-btn--address">
          ${account.chain?.name ?? 'Unknown'}
          ${icon.chevron}
        </button>
        <div id="chain-menu" class="chain-menu-wrap${showChainMenu ? ' chain-menu-wrap--open' : ''}">
          ${chainMenuHtml(account.chainId ?? 0)}
        </div>
      </div>
      <button class="nav-wallet-btn nav-wallet-btn--address">
        ${icon.wallet} ${truncateAddress(account.address)}
        <span class="nav-balance-pill">${balanceHtml}</span>
      </button>
    `
    : `<button id="connect" class="nav-wallet-btn nav-wallet-btn--connect">${icon.wallet} Connect Wallet</button>`;

  const walletCard = account.isConnected && account.address
    ? `
      <div class="wallet-card">
        <div class="wallet-card-header"><span class="wallet-status-dot"></span><h2>Wallet Connected</h2></div>
        <div class="wallet-detail"><span class="wd-label">Address</span><span class="wd-value" title="${account.address}">${account.address}</span></div>
        <div class="wallet-detail"><span class="wd-label">Network</span><span class="wd-value">${account.chain?.name ?? 'Unknown'}</span></div>
        <div class="wallet-detail"><span class="wd-label">Chain ID</span><span class="wd-value">${account.chainId}</span></div>
        <div class="wallet-detail"><span class="wd-label">Balance</span><span class="wd-value">${balanceHtml}</span></div>
        <div class="wallet-actions">
          <a class="cta" href="${explorerUrl}" target="_blank" rel="noopener">${icon.external} View on Explorer</a>
          <button id="disconnect" class="cta cta-danger">${icon.power} Disconnect</button>
        </div>
      </div>
    `
    : '';

  const toastsHtml = toastList.length > 0
    ? `<div class="toast-container">${toastList.map((t) => `
      <div class="toast toast--${t.type}">
        <span class="toast-icon">${t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'info' ? 'ℹ' : '○'}</span>
        <span class="toast-msg">${t.message}${t.txHash ? `<a href="${explorerBase}/tx/${t.txHash}" target="_blank" rel="noopener" class="toast-link">View</a>` : ''}</span>
        <button class="toast-close" data-toast-id="${t.id}">✕</button>
      </div>`).join('')}</div>`
    : '';

  const faucetHtml = account.isConnected && account.address
    ? `
      <div class="faucet-card">
        <div>
          <h4>Need Test Tokens?</h4>
          <p>Get free BOT from the faucet to deploy and test contracts.</p>
        </div>
        <div class="faucet-actions">
          <button class="cta cta-secondary copy-address-btn" style="display:inline-flex;align-items:center;gap:0.4rem;">${icon.copy} Copy Address</button>
          <a class="cta" href="https://faucet.botchain.ai/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.4rem;">${icon.external} Open Faucet</a>
        </div>
      </div>`
    : '';

  const contractHtml = account.isConnected && account.address ? contractSectionHtml() : '';
  app.innerHTML = `
    <nav class="navbar">
      <div class="brand">${logo}<span class="brand-title">BOT Chain</span></div>
      <div class="nav-right">
        <span class="network-badge">${targetNetworkName}</span>
        <button id="theme-toggle" class="theme-toggle" aria-label="${themeLabel}">${themeIcon}</button>
        ${walletButton}
      </div>
    </nav>

    <header class="hero">
      <h1>Build on <em>BOT Chain</em></h1>
      <p class="subtitle">The fast, EVM-compatible chain made for builders. Scaffold, connect, and ship in minutes.</p>
    </header>

    ${walletCard}

    ${faucetHtml}

    ${contractHtml}

    <div class="mb-3"><span class="section-label">Why BOT Chain</span></div>
    <section class="features">
      <div class="card"><div class="card-accent"></div><div class="card-icon">${icon.bolt}</div><h3>Fast Finality</h3><p>Near-instant transaction finality designed for responsive dApps.</p></div>
      <div class="card"><div class="card-accent"></div><div class="card-icon">${icon.shield}</div><h3>EVM Compatible</h3><p>Use familiar Solidity tooling, wallets, and deployment scripts.</p></div>
      <div class="card"><div class="card-accent"></div><div class="card-icon">${icon.wrench}</div><h3>Builder Ready</h3><p>Pre-configured networks, RPCs, and wallet connection out of the box.</p></div>
    </section>

    <div class="mb-16">
      <span class="section-label">Network Details</span>
      <p style="font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin: 0.25rem 0 1.25rem; color: var(--fg);">Available Networks</p>
      <div class="network-grid">
        ${networkCard(botNetworks.mainnet, 'primary')}
        ${networkCard(botNetworks.testnet, 'secondary')}
      </div>
    </div>

    <footer class="footer">
      <span class="footer-tag">scaffold</span>
      <span>Generated by <a href="https://www.npmjs.com/package/bot-cli" target="_blank" rel="noopener">bot-cli</a></span>
      <span class="footer-tag">EVM</span>
    </footer>

    ${toastsHtml}
  `;

  const connectBtn = document.getElementById('connect');
  const disconnectBtn = document.getElementById('disconnect');
  const themeBtn = document.getElementById('theme-toggle');
  const chainToggle = document.getElementById('chain-toggle');
  const chainMenuEl = document.getElementById('chain-menu');

  connectBtn?.addEventListener('click', async () => {
    try {
      if (config.connectors && config.connectors[0]) {
        await connect(config, { connector: config.connectors[0] });
      } else if (typeof window !== 'undefined' && (window as any).ethereum) {
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      }
    } catch (err: any) {
      addToast(err?.message || 'Failed to connect wallet', 'error');
    }
  });

  disconnectBtn?.addEventListener('click', () => disconnect(config));
  themeBtn?.addEventListener('click', () => setTheme(!dark));

  chainToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    showChainMenu = !showChainMenu;
    render();
  });

  chainMenuEl?.querySelectorAll('.chain-menu-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      const id = Number((e.currentTarget as HTMLElement).dataset.chainId);
      showChainMenu = false;
      switchChain(config, { chainId: id as 677 | 968 }).catch(() => {});
    });
  });

  if (showChainMenu) {
    const close = () => {
      showChainMenu = false;
      document.removeEventListener('click', close);
      render();
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  document.querySelectorAll('.toast-close').forEach((el) => {
    el.addEventListener('click', (e) => {
      const id = Number((e.currentTarget as HTMLElement).dataset.toastId);
      dismissToast(id);
    });
  });

  document.querySelectorAll('.copy-address-btn').forEach((el) => {
    el.addEventListener('click', () => {
      if (account.address) {
        navigator.clipboard.writeText(account.address);
        addToast('Address copied to clipboard', 'info');
      }
    });
  });

  if (account.isConnected && account.address) {
    bindContractEvents();
  }
}

// When contract address changes, re-render
setReloadContract(() => render());

watchAccount(config, { onChange: () => render() });
render();
