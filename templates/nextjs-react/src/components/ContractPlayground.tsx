'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConfig } from 'wagmi';
import { readContract, deployContract, waitForTransactionReceipt } from '@wagmi/core';
import { addToast } from '../lib/toast';
import contractArtifact from '../lib/contract.json';

/* ── Types ───────────────────────────────────────────────── */
interface AbiEntry {
  type: string;
  name?: string;
  inputs?: { name: string; type: string }[];
  stateMutability?: string;
  outputs?: { name?: string; type: string }[];
}

/* ── Icons ───────────────────────────────────────────────── */
const Icons = {
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M21.5 2v6h-6M2.5 22v-6h6" />
      <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  ),
  loader: (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
};

/* ── Helpers ─────────────────────────────────────────────── */
function parseAbi(abi: AbiEntry[]) {
  const reads: AbiEntry[] = [];
  const writes: AbiEntry[] = [];
  for (const entry of abi) {
    if (entry.type !== 'function') continue;
    if (!entry.name) continue;
    if (entry.stateMutability === 'view' || entry.stateMutability === 'pure') {
      reads.push(entry);
    } else {
      writes.push(entry);
    }
  }
  const ctor = abi.find((e) => e.type === 'constructor');
  return { ctor, reads, writes };
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'bigint') return val.toString();
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val)) return `[${val.map(formatValue).join(', ')}]`;
  return String(val);
}

function parseArg(val: string): unknown {
  if (/^\d+$/.test(val)) return BigInt(val);
  if (/^0x[0-9a-fA-F]+$/.test(val)) return val as `0x${string}`;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return val;
}

/* ── Component ───────────────────────────────────────────── */
export default function ContractPlayground() {
  const { address } = useAccount();
  const config = useConfig();

  const { abi, bytecode, contractName } = contractArtifact as {
    contractName: string;
    abi: AbiEntry[];
    bytecode: string;
  };

  const chainId = Number(process.env.NEXT_PUBLIC_BOT_CHAIN_ID || 968);
  const storageKey = `botchain_contract_${contractName || 'default'}_${chainId}`;

  const [contractAddress, setContractAddress] = useState<string>(() => {
    return localStorage.getItem(storageKey) || '';
  });
  const [manualAddressInput, setManualAddressInput] = useState<string>('');
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'read' | 'write'>('all');
  const [deployTxHash, setDeployTxHash] = useState<`0x${string}` | undefined>();
  const [deploying, setDeploying] = useState(false);
  const [deployArgs, setDeployArgs] = useState<Record<string, string>>({});
  const [readResults, setReadResults] = useState<Record<string, string>>({});
  const [readInputs, setReadInputs] = useState<Record<string, string>>({});
  const [writeInputs, setWriteInputs] = useState<Record<string, string>>({});
  const [writeLoading, setWriteLoading] = useState<Record<string, boolean>>({});

  const { writeContractAsync } = useWriteContract();

  const { data: deployReceipt, isLoading: isWaitingDeploy, isError: isDeployReceiptError, error: deployReceiptError } = useWaitForTransactionReceipt({
    hash: deployTxHash,
    query: { enabled: !!deployTxHash },
  });

  useEffect(() => {
    if (!deployReceipt) return;
    if (deployReceipt.status === 'success' && deployReceipt.contractAddress) {
      const newAddr = deployReceipt.contractAddress;
      setContractAddress(newAddr);
      localStorage.setItem(storageKey, newAddr);
      setDeployTxHash(undefined);
      setDeploying(false);
      addToast(`Contract deployed at ${newAddr}`, 'success');
    } else if (deployReceipt.status === 'reverted') {
      setDeployTxHash(undefined);
      setDeploying(false);
      addToast('Deployment transaction reverted on-chain', 'error');
    }
  }, [deployReceipt, storageKey]);

  useEffect(() => {
    if (isDeployReceiptError) {
      setDeployTxHash(undefined);
      setDeploying(false);
      addToast(deployReceiptError?.message || 'Deployment transaction failed', 'error');
    }
  }, [isDeployReceiptError, deployReceiptError]);

  const { ctor: ctorDef, reads, writes } = parseAbi(abi || []);

  const refreshReads = useCallback(async () => {
    if (!contractAddress || !address) return;
    for (const fn of reads) {
      try {
        const rawInputs = fn.inputs?.map((_, i) => parseArg(readInputs[`${fn.name}-${i}`] || '')) || [];
        const val = await readContract(config, {
          abi,
          address: contractAddress as `0x${string}`,
          functionName: fn.name!,
          args: rawInputs,
        });
        setReadResults((p) => ({ ...p, [fn.name!]: formatValue(val) }));
      } catch {
        setReadResults((p) => ({ ...p, [fn.name!]: 'Error' }));
      }
    }
  }, [contractAddress, address, abi, reads, config, readInputs]);

  useEffect(() => {
    refreshReads();
  }, [refreshReads]);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const args = ctorDef?.inputs
        ? ctorDef.inputs.map((_, i) => parseArg(deployArgs[`ctor-${i}`] || ''))
        : [];
      const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
      const hash = await deployContract(config, {
        abi,
        bytecode: formattedBytecode as `0x${string}`,
        args,
        gas: 3_000_000n,
      });
      setDeployTxHash(hash);
      addToast('Deploy transaction submitted', 'pending', hash);
    } catch (err: any) {
      addToast(err?.message || 'Deploy failed', 'error');
      setDeploying(false);
    }
  };

  const handleWrite = async (fnName: string, args: string[], value?: string) => {
    setWriteLoading((p) => ({ ...p, [fnName]: true }));
    try {
      const hash = await writeContractAsync({
        abi,
        address: contractAddress as `0x${string}`,
        functionName: fnName,
        args: args.map(parseArg),
        value: value ? BigInt(value) : undefined,
        gas: 300_000n,
      });
      if (hash) {
        addToast(`Write ${fnName} submitted`, 'pending', hash);
        try {
          await waitForTransactionReceipt(config, { hash: hash as `0x${string}` });
          addToast(`Write ${fnName} confirmed`, 'success');
          await refreshReads();
          setTimeout(refreshReads, 1200);
        } catch {
          addToast(`Write ${fnName} failed`, 'error');
        }
      }
    } catch (err: any) {
      // Try to extract a clean revert reason from the error
      const raw: string = err?.message || err?.shortMessage || '';
      const revertMatch = raw.match(/reverted with reason string '([^']+)'/i)
        || raw.match(/Error: ([^\n(]+)/i);
      const friendlyMsg = revertMatch ? `Reverted: ${revertMatch[1].trim()}` : raw || `Write ${fnName} failed`;
      addToast(friendlyMsg, 'error');
    } finally {
      setWriteLoading((p) => ({ ...p, [fnName]: false }));
    }
  };

  const clearContractAddress = () => {
    setContractAddress('');
    localStorage.removeItem(storageKey);
    addToast('Contract address reset', 'info');
  };

  const saveManualAddress = () => {
    if (!manualAddressInput.startsWith('0x') || manualAddressInput.length !== 42) {
      addToast('Invalid contract address format', 'error');
      return;
    }
    setContractAddress(manualAddressInput);
    localStorage.setItem(storageKey, manualAddressInput);
    setIsCustomAddress(false);
    addToast('Contract address set manually', 'success');
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard', 'info');
  };

  const explorerBase = chainId === 677 ? 'https://scan.botchain.ai' : 'https://scan.bohr.life';
  const hasBytecode = bytecode && bytecode.length > 20;

  if (!abi || abi.length === 0 || !bytecode) {
    return (
      <div className="contract-section">
        <div className="wallet-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>No Compiled Contract Found</h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.88rem', margin: '0 0 1rem' }}>
            Compile contracts with <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>npx hardhat compile</code> or <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>forge build</code>, or attach an existing contract address.
          </p>
          <div style={{ background: 'var(--bg)', padding: '0.85rem 1rem', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'left', display: 'inline-block', maxWidth: '520px', width: '100%' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Install Tooling:</p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>• <strong>Foundry:</strong> <code style={{ background: 'var(--bg-card)', padding: '2px 4px', borderRadius: 3 }}>curl -L https://foundry.paradigm.xyz | bash && foundryup</code></div>
              <div>• <strong>Hardhat:</strong> <code style={{ background: 'var(--bg-card)', padding: '2px 4px', borderRadius: 3 }}>npm install -D hardhat @nomicfoundation/hardhat-toolbox</code></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contract-section" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="section-label" style={{ margin: 0 }}>{contractName}</span>
          {contractAddress && (
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '0.2rem 0.5rem', background: 'rgba(16,163,127,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '4px', fontWeight: 600 }}>
              DEPLOYED
            </span>
          )}
        </div>

        {contractAddress && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="icon-btn" onClick={clearContractAddress} title="Reset or Deploy New"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', border: 'var(--border-w) solid var(--border)', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
              {Icons.trash} Change Contract
            </button>
          </div>
        )}
      </div>

      {/* ── DEPLOY / SET ADDRESS CARD ───────────────────────────────────── */}
      {!contractAddress && (
        <div className="wallet-card" style={{ marginBottom: '1.5rem' }}>
          <div className="wallet-card-header" style={{ gap: '0.6rem' }}>
            {Icons.rocket}
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Deploy or Attach {contractName}</h2>
          </div>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.88rem', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
            Deploy a new instance of your smart contract or provide an existing contract address to interact with it.
          </p>

          {!isCustomAddress ? (
            <>
              {ctorDef?.inputs && ctorDef.inputs.length > 0 && (
                <div style={{ marginBottom: '1rem', background: 'var(--bg)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>Constructor Parameters</p>
                  {ctorDef.inputs.map((input, i) => (
                    <div key={i} className="fn-input-row" style={{ marginBottom: '0.5rem' }}>
                      <label className="fn-input-label">{input.name} <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono)' }}>({input.type})</span></label>
                      <input className="fn-input" placeholder={input.type} value={deployArgs[`ctor-${i}`] ?? ''}
                        onChange={(e) => setDeployArgs((p) => ({ ...p, [`ctor-${i}`]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="cta" onClick={handleDeploy}
                  disabled={!hasBytecode || deploying || isWaitingDeploy}
                  title={!hasBytecode ? 'Compile contract first with npx hardhat compile or forge build' : ''}>
                  {!hasBytecode ? 'Compile contract first'
                    : deploying || isWaitingDeploy ? 'Deploying…'
                    : `Deploy ${contractName}`}
                </button>
                <button className="cta cta-secondary" onClick={() => setIsCustomAddress(true)} style={{ background: 'transparent' }}>
                  Attach Existing Address
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="fn-input-row">
                <label className="fn-input-label">Contract Address (0x...)</label>
                <input className="fn-input" placeholder="0x..." value={manualAddressInput} onChange={(e) => setManualAddressInput(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="cta" onClick={saveManualAddress}>Save Address</button>
                <button className="cta cta-secondary" onClick={() => setIsCustomAddress(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONTRACT DETAILS & INTERACTION PANEL ─────────────────────────── */}
      {contractAddress && (
        <>
          <div className="wallet-card" style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', border: 'var(--border-w) solid var(--border)' }}>
            <div className="wallet-card-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="wallet-status-dot" style={{ background: '#10A37F' }} />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Contract Status</h2>
              </div>
              <a className="cta cta-secondary" href={`${explorerBase}/address/${contractAddress}`} target="_blank" rel="noopener"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {Icons.external} Explorer
              </a>
            </div>

            <div className="wallet-detail" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <div>
                <div className="wd-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)', marginBottom: '0.2rem' }}>Active Address</div>
                <div className="wd-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all' }}>
                  {contractAddress}
                </div>
              </div>
              <button className="icon-btn" onClick={() => copy(contractAddress)} title="Copy Address"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.4rem', cursor: 'pointer', color: 'var(--fg)', display: 'inline-flex' }}>
                {Icons.copy}
              </button>
            </div>

            {/* ── CONTRACT STATE SUMMARY ─────────────────────────────────── */}
            {reads.length > 0 && Object.keys(readResults).length > 0 && (
              <div style={{ marginTop: '1rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Current Contract State
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {reads.filter(fn => !fn.inputs?.length).map(fn => (
                    <div key={fn.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--fg-muted)' }}>{fn.name}:</span>
                      <span style={{ fontWeight: 700, color: readResults[fn.name!] === 'true' ? '#10A37F' : readResults[fn.name!] === 'false' ? '#FF5FA6' : 'var(--fg)' }}>
                        {readResults[fn.name!] ?? '…'}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Write functions may require specific state conditions to succeed.
                </div>
              </div>
            )}
          </div>

          {/* ── NAVIGATION FILTER TABS ─────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setActiveTab('all')}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: 'none', background: activeTab === 'all' ? 'var(--accent)' : 'transparent', color: activeTab === 'all' ? 'var(--accent-fg)' : 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
                All Functions ({reads.length + writes.length})
              </button>
              <button onClick={() => setActiveTab('read')}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: 'none', background: activeTab === 'read' ? 'var(--accent)' : 'transparent', color: activeTab === 'read' ? 'var(--accent-fg)' : 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
                Read ({reads.length})
              </button>
              <button onClick={() => setActiveTab('write')}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: 'none', background: activeTab === 'write' ? 'var(--accent)' : 'transparent', color: activeTab === 'write' ? 'var(--accent-fg)' : 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
                Write ({writes.length})
              </button>
            </div>

            {reads.length > 0 && (
              <button className="toast-link" onClick={refreshReads}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: '#1CD8B0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {Icons.refresh} Refresh Reads
              </button>
            )}
          </div>

          {/* ── READ FUNCTIONS SECTION ─────────────────────────────────── */}
          {(activeTab === 'all' || activeTab === 'read') && reads.length > 0 && (
            <div className="contract-functions" style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4D7CFF', display: 'inline-block' }} /> Read (View) Functions
              </h3>
              <div className="function-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {reads.map((fn) => (
                  <div key={fn.name} className="function-card" style={{ background: 'var(--bg-card)', border: 'var(--border-w) solid var(--border)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'var(--sh-sm)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div className="fn-name" style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                          {fn.name}
                        </div>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, background: 'rgba(77,124,255,0.15)', color: '#4D7CFF', padding: '0.15rem 0.4rem', borderRadius: '3px', textTransform: 'uppercase' }}>
                          read
                        </span>
                      </div>

                      {fn.inputs && fn.inputs.length > 0 && fn.inputs.map((input, i) => (
                        <div key={i} className="fn-input-row" style={{ marginBottom: '0.5rem' }}>
                          <label className="fn-input-label" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                            {input.name} <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono)' }}>({input.type})</span>
                          </label>
                          <input className="fn-input" placeholder={input.type}
                            value={readInputs[`${fn.name}-${i}`] ?? ''}
                            onChange={(e) => {
                              setReadInputs((p) => ({ ...p, [`${fn.name}-${i}`]: e.target.value }));
                              clearTimeout((window as any)[`_read_${fn.name}`]);
                              (window as any)[`_read_${fn.name}`] = setTimeout(() => refreshReads(), 500);
                            }} />
                        </div>
                      ))}

                      <div style={{ marginTop: '0.75rem', background: 'var(--bg)', padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)', marginBottom: '0.25rem', fontWeight: 700 }}>Output Value</div>
                        <div className="fn-output" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all' }}>
                          {readResults[fn.name!] !== undefined ? (
                            <span className="fn-value" style={{ color: 'var(--fg)' }}>{readResults[fn.name!]}</span>
                          ) : (
                            <span className="fn-loading">{Icons.loader}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="fn-type" style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      returns ({fn.outputs?.map((o) => o.type).join(', ') || 'void'})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── WRITE FUNCTIONS SECTION ─────────────────────────────────── */}
          {(activeTab === 'all' || activeTab === 'write') && writes.length > 0 && (
            <div className="contract-functions">
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5FA6', display: 'inline-block' }} /> Write (State Change) Functions
              </h3>
              <div className="function-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {writes.map((fn) => {
                  const isPayable = fn.stateMutability === 'payable';
                  return (
                    <div key={fn.name} className="function-card" style={{ background: 'var(--bg-card)', border: 'var(--border-w) solid var(--border)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'var(--sh-sm)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div className="fn-name" style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>{fn.name}</div>
                          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, background: isPayable ? 'rgba(255,224,27,0.2)' : 'rgba(255,95,166,0.15)', color: isPayable ? 'var(--fg)' : '#FF5FA6', padding: '0.15rem 0.4rem', borderRadius: '3px', textTransform: 'uppercase' }}>
                            {isPayable ? 'payable' : 'write'}
                          </span>
                        </div>

                        {fn.inputs && fn.inputs.length > 0 ? (
                          fn.inputs.map((input, i) => (
                            <div key={i} className="fn-input-row" style={{ marginBottom: '0.5rem' }}>
                              <label className="fn-input-label" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                                {input.name} <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono)' }}>({input.type})</span>
                              </label>
                              <input className="fn-input" placeholder={input.type}
                                value={writeInputs[`${fn.name}-${i}`] ?? ''}
                                onChange={(e) => setWriteInputs((p) => ({ ...p, [`${fn.name}-${i}`]: e.target.value }))} />
                            </div>
                          ))
                        ) : (
                          <div className="fn-input-row" style={{ marginBottom: '0.5rem' }}>
                            <span className="fn-no-params" style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', fontStyle: 'italic' }}>No input parameters</span>
                          </div>
                        )}

                        {isPayable && (
                          <div className="fn-input-row" style={{ marginBottom: '0.5rem' }}>
                            <label className="fn-input-label" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Value (wei)</label>
                            <input className="fn-input" placeholder="0"
                              value={writeInputs[`${fn.name}-value`] ?? ''}
                              onChange={(e) => setWriteInputs((p) => ({ ...p, [`${fn.name}-value`]: e.target.value }))} />
                          </div>
                        )}
                      </div>

                      <div>
                        <button className="cta cta-secondary" style={{ marginTop: '0.75rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                          onClick={() => {
                            const args = fn.inputs ? fn.inputs.map((_, i) => writeInputs[`${fn.name}-${i}`] || '') : [];
                            handleWrite(fn.name!, args, writeInputs[`${fn.name}-value`]);
                          }}
                          disabled={writeLoading[fn.name!]}>
                          {writeLoading[fn.name!] ? Icons.loader : null}
                          {writeLoading[fn.name!] ? 'Sending…' : `Call ${fn.name}`}
                        </button>
                        <div className="fn-type" style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                          returns ({fn.outputs?.map((o) => o.type).join(', ') || 'void'})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

