import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { botMainnet, botTestnet, botNetworks } from './botChain';
import { useTheme } from './ThemeContext';
import ContractPlayground from './components/ContractPlayground';
import ToastContainer from './components/ToastContainer';
import { addToast } from './lib/toast';

// ── Icons ──────────────────────────────────────────────────
const Icons = {
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

// ── Logo ───────────────────────────────────────────────────
const Logo = () => (
  <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="44" height="44" rx="4" fill="#FFE01B" stroke="#0A0A0A" strokeWidth="3" />
    <rect x="8" y="10" width="32" height="24" rx="4" fill="#0A0A0A" />
    <circle cx="18" cy="22" r="3" fill="#FFE01B" />
    <circle cx="30" cy="22" r="3" fill="#FFE01B" />
    <path d="M17 28 Q24 33 31 28" stroke="#FFE01B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

// ── App ────────────────────────────────────────────────────
function App() {
  const { address, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { dark, toggle: toggleDark } = useTheme();

  const targetChainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || botTestnet.id);
  const targetNetworkName = targetChainId === botMainnet.id ? botMainnet.name : botTestnet.name;

  const connectedNetworkKey = chain?.id === botMainnet.id ? 'mainnet' : 'testnet';
  const explorerUrl = address
    ? `${botNetworks[connectedNetworkKey].explorer}/address/${address}`
    : botNetworks[connectedNetworkKey].explorer;

  return (
    <div>
      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="brand">
          <Logo />
          <span className="brand-title">BOT Chain</span>
        </div>

        <div className="nav-right">
          <span className="network-badge">{targetNetworkName}</span>

          {/* Dark / Light toggle */}
          <button
            className="theme-toggle"
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? Icons.sun : Icons.moon}
          </button>

          {/* ── RainbowKit ConnectButton (custom styled) ───── */}
          <ConnectButton.Custom>
            {({
              account,
              chain: rChain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && rChain;

              if (!ready) return null;

              if (!connected) {
                return (
                  <button
                    className="nav-wallet-btn nav-wallet-btn--connect"
                    onClick={openConnectModal}
                  >
                    {Icons.wallet}
                    Connect Wallet
                  </button>
                );
              }

              // Wrong network
              if (rChain.unsupported) {
                return (
                  <button
                    className="nav-wallet-btn nav-wallet-btn--disconnect"
                    onClick={openChainModal}
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="nav-right" style={{ gap: '0.45rem' }}>
                  {/* Chain switcher */}
                  <button
                    className="nav-wallet-btn nav-wallet-btn--address"
                    onClick={openChainModal}
                    style={{ gap: '0.35rem' }}
                  >
                    {rChain.hasIcon && rChain.iconUrl && (
                      <img
                        src={rChain.iconUrl}
                        alt={rChain.name}
                        style={{ width: 14, height: 14, borderRadius: '50%' }}
                      />
                    )}
                    {rChain.name}
                    <span style={{ opacity: 0.5, display: 'flex' }}>{Icons.chevronDown}</span>
                  </button>

                  {/* Account button */}
                  <button
                    className="nav-wallet-btn nav-wallet-btn--address"
                    onClick={openAccountModal}
                  >
                    {Icons.wallet}
                    {account.displayName ?? truncateAddress(account.address)}
                    {balance && (
                      <span className="nav-balance-pill">
                        {parseFloat(balance.formatted).toFixed(4)}&nbsp;{balance.symbol}
                      </span>
                    )}
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <header className="hero">
        <h1>
          Build on <em>BOT Chain</em>
        </h1>
        <p className="subtitle">
          The fast, EVM-compatible chain made for builders.
          Scaffold, connect, and ship in minutes.
        </p>
      </header>

      {/* ── CONNECTED: wallet detail card ──────────────────── */}
      {address && (
        <div className="wallet-card">
          <div className="wallet-card-header">
            <span className="wallet-status-dot" />
            <h2>Wallet Connected</h2>
          </div>
          <div className="wallet-detail">
            <span className="wd-label">Address</span>
            <span className="wd-value" title={address}>{address}</span>
          </div>
          <div className="wallet-detail">
            <span className="wd-label">Network</span>
            <span className="wd-value">{chain?.name ?? 'Unknown'}</span>
          </div>
          <div className="wallet-detail">
            <span className="wd-label">Chain ID</span>
            <span className="wd-value">{chain?.id}</span>
          </div>
          <div className="wallet-detail">
            <span className="wd-label">Balance</span>
            <span className="wd-value">
              {balance
                ? `${parseFloat(balance.formatted).toFixed(6)} ${balance.symbol}`
                : '—'}
            </span>
          </div>
          <div className="wallet-actions">
            <a className="cta" href={explorerUrl} target="_blank" rel="noopener">
              {Icons.external}
              View on Explorer
            </a>
            <button className="cta cta-danger" onClick={() => disconnect()}>
              {Icons.power}
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* ── FAUCET PROMPT ─────────────────────────────────── */}
      {address && (
        <div className="faucet-card">
          <div>
            <h4>Need Test Tokens?</h4>
            <p>Get free BOT from the faucet to deploy and test contracts.</p>
          </div>
          <div className="faucet-actions">
            <button
              className="cta cta-secondary"
              onClick={() => {
                navigator.clipboard.writeText(address);
                addToast('Address copied to clipboard', 'info');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Address
            </button>
            <a
              className="cta"
              href="https://faucet.botchain.ai/"
              target="_blank"
              rel="noopener"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {Icons.external}
              Open Faucet
            </a>
          </div>
        </div>
      )}

      {/* ── CONTRACT PLAYGROUND ───────────────────────────── */}
      {address && <ContractPlayground />}

      {/* ── FEATURES ───────────────────────────────────────── */}
      <div className="mb-3">
        <span className="section-label">Why BOT Chain</span>
      </div>
      <section className="features">
        <div className="card">
          <div className="card-accent" />
          <div className="card-icon">{Icons.bolt}</div>
          <h3>Fast Finality</h3>
          <p>Near-instant transaction finality designed for responsive dApps.</p>
        </div>
        <div className="card">
          <div className="card-accent" />
          <div className="card-icon">{Icons.shield}</div>
          <h3>EVM Compatible</h3>
          <p>Use familiar Solidity tooling, wallets, and deployment scripts.</p>
        </div>
        <div className="card">
          <div className="card-accent" />
          <div className="card-icon">{Icons.wrench}</div>
          <h3>Builder Ready</h3>
          <p>Pre-configured networks, RPCs, and wallet connection out of the box.</p>
        </div>
      </section>

      {/* ── NETWORK DETAILS ────────────────────────────────── */}
      <div className="mb-16">
        <span className="section-label">Network Details</span>
        <p
          style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0.25rem 0 1.25rem',
            color: 'var(--fg)',
          }}
        >
          Available Networks
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="network-card">
            <div className="network-card-stripe" />
            <h3>{botNetworks.mainnet.name}</h3>
            <div className="network-row">
              <span className="label">Chain ID</span>
              <span className="value">{botNetworks.mainnet.chainId}</span>
            </div>
            <div className="network-row">
              <span className="label">RPC URL</span>
              <span className="value">{botNetworks.mainnet.rpc}</span>
            </div>
            <a className="cta" style={{ flex: 'none' }} href={botNetworks.mainnet.explorer} target="_blank" rel="noopener">
              {Icons.external}
              Open Explorer
            </a>
          </div>

          <div className="network-card">
            <div className="network-card-stripe" />
            <h3>{botNetworks.testnet.name}</h3>
            <div className="network-row">
              <span className="label">Chain ID</span>
              <span className="value">{botNetworks.testnet.chainId}</span>
            </div>
            <div className="network-row">
              <span className="label">RPC URL</span>
              <span className="value">{botNetworks.testnet.rpc}</span>
            </div>
            <a className="cta cta-secondary" style={{ flex: 'none' }} href={botNetworks.testnet.explorer} target="_blank" rel="noopener">
              {Icons.external}
              Open Explorer
            </a>
          </div>
        </div>
      </div>

      {/* ── TOASTS ─────────────────────────────────────────── */}
      <ToastContainer />

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="footer">
        <span className="footer-tag">scaffold</span>
        <span>
          Generated by{' '}
          <a href="https://www.npmjs.com/package/bot-cli" target="_blank" rel="noopener">
            bot-cli
          </a>
        </span>
        <span className="footer-tag">EVM</span>
      </footer>
    </div>
  );
}

export default App;
