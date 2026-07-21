import { writeContract, readContract, deployContract, waitForTransactionReceipt } from '@wagmi/core';
import type { Config } from '@wagmi/core';
import { addToast } from './lib/toast';

export interface AbiEntry {
  type: string;
  name?: string;
  inputs?: { name: string; type: string }[];
  stateMutability?: string;
  outputs?: { name?: string; type: string }[];
}

export interface ContractArtifact {
  contractName: string;
  deployScriptName: string;
  abi: AbiEntry[];
  bytecode: string;
}

// ── State ──────────────────────────────────────────────────
let contractAddress = '';
let deployTxHash: string | undefined;
let readResults: Record<string, string> = {};
let writeInputs: Record<string, string> = {};
let artifact: ContractArtifact | null = null;
let reloadContractSection: (() => void) | null = null;
let wagmiConfig: Config | null = null;
let activeTab: 'all' | 'read' | 'write' = 'all';

function getStorageKey(): string {
  const chainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || 968);
  return `botchain_contract_${artifact?.contractName || 'default'}_${chainId}`;
}

export function setConfig(c: Config) { wagmiConfig = c; }
export function setContractArtifact(a: ContractArtifact) {
  artifact = a;
  const saved = localStorage.getItem(getStorageKey());
  if (saved) contractAddress = saved;
}
export function getContractArtifact() { return artifact; }
export function getContractAddress() { return contractAddress; }
export function getDeployTxHash() { return deployTxHash; }
export function getReadResults() { return readResults; }
export function getWriteInputs() { return writeInputs; }
export function setReloadContract(fn: () => void) { reloadContractSection = fn; }
export function isWriteLoading(fnName: string) { return writeLoading[fnName] || false; }

export function setWriteInput(name: string, value: string) {
  writeInputs[name] = value;
}

export function parseAbi(abi: AbiEntry[]) {
  const reads: AbiEntry[] = [];
  const writes: AbiEntry[] = [];
  const ctor = abi.find((e) => e.type === 'constructor');
  for (const entry of abi) {
    if (entry.type !== 'function' || !entry.name) continue;
    if (entry.stateMutability === 'view' || entry.stateMutability === 'pure') {
      reads.push(entry);
    } else {
      writes.push(entry);
    }
  }
  return { ctor, reads, writes };
}

function parseArg(val: string): unknown {
  if (/^\d+$/.test(val)) return BigInt(val);
  if (/^0x[0-9a-fA-F]+$/.test(val)) return val as `0x${string}`;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return val;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'bigint') return val.toString();
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val)) return `[${val.map(formatValue).join(', ')}]`;
  return String(val);
}

export async function deployContractAction() {
  if (!wagmiConfig || !artifact || !artifact.bytecode) return;
  const { ctor } = parseAbi(artifact.abi);
  const args = ctor?.inputs
    ? ctor.inputs.map((_, i) => parseArg(writeInputs[`ctor-${i}`] || ''))
    : [];
  try {
    const formattedBytecode = artifact.bytecode.startsWith('0x') ? artifact.bytecode : `0x${artifact.bytecode}`;
    const hash = await deployContract(wagmiConfig, {
      abi: artifact.abi,
      bytecode: formattedBytecode as `0x${string}`,
      args,
      gas: 3_000_000n,
    });
    deployTxHash = hash;
    addToast('Deploy transaction submitted', 'pending', hash);
    if (reloadContractSection) reloadContractSection();

    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
    if (receipt.status === 'success' && receipt.contractAddress) {
      contractAddress = receipt.contractAddress;
      localStorage.setItem(getStorageKey(), receipt.contractAddress);
      deployTxHash = undefined;
      addToast(`Contract deployed at ${receipt.contractAddress}`, 'success');
      if (reloadContractSection) reloadContractSection();
      await refreshReads();
    } else if (receipt.status === 'reverted') {
      deployTxHash = undefined;
      addToast('Deployment transaction reverted on-chain', 'error');
      if (reloadContractSection) reloadContractSection();
    }
  } catch (err: any) {
    deployTxHash = undefined;
    addToast(err?.message || 'Deploy failed', 'error');
    if (reloadContractSection) reloadContractSection();
  }
}

export async function refreshReads() {
  if (!wagmiConfig || !artifact || !contractAddress) return;
  const { reads } = parseAbi(artifact.abi);
  const results: Record<string, string> = {};
  for (const fn of reads) {
    try {
      const rawInputs = fn.inputs?.map((_, i) => parseArg(writeInputs[`read-${fn.name}-${i}`] || '')) || [];
      const val = await readContract(wagmiConfig, {
        abi: artifact.abi,
        address: contractAddress as `0x${string}`,
        functionName: fn.name!,
        args: rawInputs,
      });
      results[fn.name!] = formatValue(val);
    } catch {
      results[fn.name!] = 'Error';
    }
  }
  readResults = results;
  if (reloadContractSection) reloadContractSection();
}

const writeLoading: Record<string, boolean> = {};

export async function writeFunction(fnName: string, inputs: string[], value?: string) {
  if (!wagmiConfig || !artifact || !contractAddress) return;
  writeLoading[fnName] = true;
  if (reloadContractSection) reloadContractSection();
  try {
    const hash = await writeContract(wagmiConfig, {
      abi: artifact.abi,
      address: contractAddress as `0x${string}`,
      functionName: fnName,
      args: inputs.map(parseArg),
      value: value ? BigInt(value) : undefined,
      gas: 300_000n,
    });
    addToast(`Write ${fnName} submitted`, 'pending', hash);
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
    if (receipt.status === 'success') {
      addToast(`Write ${fnName} confirmed`, 'success');
      await refreshReads();
      setTimeout(refreshReads, 1200);
    } else {
      addToast(`Write ${fnName} reverted`, 'error');
    }
  } catch (err: any) {
    const raw: string = err?.message || err?.shortMessage || '';
    const revertMatch = raw.match(/reverted with reason string '([^']+)'/i)
      || raw.match(/Error: ([^\n(]+)/i);
    const friendlyMsg = revertMatch ? `Reverted: ${revertMatch[1].trim()}` : raw || `Write ${fnName} failed`;
    addToast(friendlyMsg, 'error');
  } finally {
    writeLoading[fnName] = false;
    if (reloadContractSection) reloadContractSection();
  }
}

export function contractSectionHtml(): string {
  if (!artifact || !artifact.abi || artifact.abi.length === 0 || !artifact.bytecode) {
    return `
      <div class="contract-section">
        <div class="wallet-card" style="text-align:center;padding:2rem;">
          <h3 style="margin:0 0 0.5rem;font-size:1.1rem;font-weight:700;">No Compiled Contract Found</h3>
          <p style="color:var(--fg-muted);font-size:0.88rem;margin:0 0 1rem;">No compiled contract found. Compile contracts with <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">npx hardhat compile</code> or <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">forge build</code>.</p>
          <div style="background:var(--bg);padding:0.85rem 1rem;border-radius:6px;border:1px solid var(--border);text-align:left;display:inline-block;max-width:520px;width:100%;">
            <p style="margin:0 0 0.4rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Install Tooling:</p>
            <div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--fg);display:flex;flex-direction:column;gap:0.4rem;">
              <div>• <strong>Foundry:</strong> <code style="background:var(--bg-card);padding:2px 4px;border-radius:3px;">curl -L https://foundry.paradigm.xyz | bash && foundryup</code></div>
              <div>• <strong>Hardhat:</strong> <code style="background:var(--bg-card);padding:2px 4px;border-radius:3px;">npm install -D hardhat @nomicfoundation/hardhat-toolbox</code></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const { ctor: ctorDef, reads, writes } = parseAbi(artifact.abi);
  const hasBytecode = artifact.bytecode && artifact.bytecode.length > 20;
  const chainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || 968);
  const explorerBase = chainId === 677 ? 'https://scan.botchain.ai' : 'https://scan.bohr.life';

  let html = `<div class="contract-section" style="margin-top:2rem;">`;
  html += `
    <div style="display:flex;align-items:center;justify-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;">
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <span class="section-label" style="margin:0;">${artifact.contractName}</span>
        ${contractAddress ? `<span style="font-size:0.75rem;font-family:var(--font-mono);padding:0.2rem 0.5rem;background:rgba(16,163,127,0.15);color:var(--accent);border:1px solid var(--accent);border-radius:4px;font-weight:600;">DEPLOYED</span>` : ''}
      </div>
      ${contractAddress ? `
        <button id="clear-contract-btn" class="icon-btn" title="Reset or Deploy New"
          style="display:inline-flex;align-items:center;gap:0.4rem;background:var(--bg-card);border:var(--border-w) solid var(--border);padding:0.35rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:600;color:var(--fg);font-family:var(--font-sans);">
          Change Contract
        </button>
      ` : ''}
    </div>
  `;

  if (!contractAddress) {
    html += `
      <div class="wallet-card" style="margin-bottom:1.5rem;">
        <div class="wallet-card-header" style="gap:0.6rem;">
          <h2 style="margin:0;font-size:1.2rem;font-weight:700;">Deploy ${artifact.contractName}</h2>
        </div>
        <p style="color:var(--fg-muted);font-size:0.88rem;margin-top:0.3rem;margin-bottom:1.25rem;">Deploy the contract from your connected wallet.</p>

        ${ctorDef?.inputs?.length ? `<div style="margin-bottom:1rem;background:var(--bg);padding:1rem;border-radius:6px;border:1px solid var(--border);"><p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.75rem;">Constructor Parameters</p>${ctorDef.inputs.map((input: any, i: number) => `<div class="fn-input-row" style="margin-bottom:0.5rem;"><label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">${input.name} (${input.type})</label><input class="fn-input ctor-input" data-ctor-idx="${i}" placeholder="${input.type}" value="${writeInputs[`ctor-${i}`] || ''}" /></div>`).join('')}</div>` : ''}

        <button id="deploy-btn" class="cta" ${!hasBytecode ? 'disabled' : ''}>${!hasBytecode ? 'Compile with forge build first' : `Deploy ${artifact.contractName}`}</button>
      </div>`;
  }

  if (contractAddress) {
    html += `
      <div class="wallet-card" style="margin-bottom:1.5rem;background:var(--bg-card);border:var(--border-w) solid var(--border);">
        <div class="wallet-card-header" style="justify-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span class="wallet-status-dot" style="background:#10A37F;"></span>
            <h2 style="margin:0;font-size:1.1rem;font-weight:700;">Contract Status</h2>
          </div>
          <a class="cta cta-secondary" href="${explorerBase}/address/${contractAddress}" target="_blank" rel="noopener" style="padding:0.35rem 0.75rem;font-size:0.75rem;">
            Explorer
          </a>
        </div>
        <div class="wallet-detail" style="margin-top:0.75rem;display:flex;align-items:center;justify-between;background:var(--bg);padding:0.75rem 1rem;border:1px solid var(--border);border-radius:6px;">
          <div>
            <div class="wd-label" style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--fg-muted);margin-bottom:0.2rem;">Active Address</div>
            <div class="wd-value" style="font-family:var(--font-mono);font-size:0.85rem;font-weight:600;word-break:break-all;">
              ${contractAddress}
            </div>
          </div>
        </div>

        ${reads.length > 0 && Object.keys(readResults).length > 0 ? `
          <div style="margin-top:1rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:0.75rem 1rem;">
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--fg-muted);margin-bottom:0.5rem;font-weight:700;">Current Contract State</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
              ${reads.filter(fn => !fn.inputs?.length).map(fn => `
                <div style="display:flex;align-items:center;gap:0.4rem;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:0.3rem 0.6rem;font-size:0.8rem;font-family:var(--font-mono);">
                  <span style="color:var(--fg-muted);">${fn.name}:</span>
                  <span style="font-weight:700;color:${readResults[fn.name!] === 'true' ? '#10A37F' : readResults[fn.name!] === 'false' ? '#FF5FA6' : 'var(--fg)'};">${readResults[fn.name!] ?? '…'}</span>
                </div>
              `).join('')}
            </div>
            <div style="font-size:0.7rem;color:var(--fg-muted);margin-top:0.5rem;font-style:italic;">Write functions may require specific state conditions to succeed.</div>
          </div>
        ` : ''}
      </div>

      <div style="display:flex;align-items:center;justify-between;border-bottom:2px solid var(--border);padding-bottom:0.5rem;margin-bottom:1.5rem;">
        <div style="display:flex;gap:0.5rem;">
          <button id="tab-all-btn" style="padding:0.4rem 0.9rem;font-size:0.8rem;font-weight:700;border-radius:4px;cursor:pointer;border:none;background:${activeTab === 'all' ? 'var(--accent)' : 'transparent'};color:${activeTab === 'all' ? 'var(--accent-fg)' : 'var(--fg)'};">All Functions (${reads.length + writes.length})</button>
          <button id="tab-read-btn" style="padding:0.4rem 0.9rem;font-size:0.8rem;font-weight:700;border-radius:4px;cursor:pointer;border:none;background:${activeTab === 'read' ? 'var(--accent)' : 'transparent'};color:${activeTab === 'read' ? 'var(--accent-fg)' : 'var(--fg)'};">Read (${reads.length})</button>
          <button id="tab-write-btn" style="padding:0.4rem 0.9rem;font-size:0.8rem;font-weight:700;border-radius:4px;cursor:pointer;border:none;background:${activeTab === 'write' ? 'var(--accent)' : 'transparent'};color:${activeTab === 'write' ? 'var(--accent-fg)' : 'var(--fg)'};">Write (${writes.length})</button>
        </div>
        ${reads.length > 0 ? `<button id="refresh-reads-btn" style="font-size:0.75rem;font-weight:700;background:none;border:none;cursor:pointer;color:#1CD8B0;text-transform:uppercase;">Refresh Reads</button>` : ''}
      </div>
    `;

    if ((activeTab === 'all' || activeTab === 'read') && reads.length > 0) {
      html += `<div class="contract-functions" style="margin-bottom:2rem;"><h3 style="margin:0 0 1rem;font-size:0.9rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg-muted);">Read Functions</h3><div class="function-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:1rem;">`;
      for (const fn of reads) {
        const output = fn.outputs?.map(o => o.type).join(', ') || 'void';
        const value = readResults[fn.name!] !== undefined ? readResults[fn.name!] : '—';
        html += `<div class="function-card" style="background:var(--bg-card);border:var(--border-w) solid var(--border);border-radius:6px;padding:1rem;display:flex;flex-direction:column;justify-between;">`;
        html += `<div style="display:flex;justify-between;align-items:flex-start;margin-bottom:0.75rem;"><div class="fn-name" style="font-weight:700;font-size:0.95rem;font-family:var(--font-mono);">${fn.name}</div><span style="font-size:0.65rem;font-family:var(--font-mono);font-weight:700;background:rgba(77,124,255,0.15);color:#4D7CFF;padding:0.15rem 0.4rem;border-radius:3px;text-transform:uppercase;">read</span></div>`;
        if (fn.inputs && fn.inputs.length > 0) {
          for (let i = 0; i < fn.inputs.length; i++) {
            const input = fn.inputs[i];
            const key = `${fn.name}-${i}`;
            html += `<div class="fn-input-row" style="margin-bottom:0.5rem;"><label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">${input.name} (${input.type})</label><input class="fn-input read-input" data-read-key="${key}" placeholder="${input.type}" value="${writeInputs[`read-${key}`] || ''}" /></div>`;
          }
        }
        html += `<div style="margin-top:0.75rem;background:var(--bg);padding:0.6rem 0.8rem;border-radius:4px;border:1px solid var(--border);"><div style="font-size:0.68rem;text-transform:uppercase;color:var(--fg-muted);margin-bottom:0.25rem;font-weight:700;">Output Value</div><div class="fn-output" style="font-family:var(--font-mono);font-size:0.85rem;font-weight:600;"><span class="fn-value">${value}</span></div></div>`;
        html += `<div class="fn-type" style="font-size:0.7rem;color:var(--fg-muted);margin-top:0.75rem;font-family:var(--font-mono);">returns (${output})</div>`;
        html += `</div>`;
      }
      html += `</div></div>`;
    }

    if ((activeTab === 'all' || activeTab === 'write') && writes.length > 0) {
      html += `<div class="contract-functions"><h3 style="margin:0 0 1rem;font-size:0.9rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg-muted);">Write Functions</h3><div class="function-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:1rem;">`;
      for (const fn of writes) {
        const isPayable = fn.stateMutability === 'payable';
        html += `<div class="function-card" style="background:var(--bg-card);border:var(--border-w) solid var(--border);border-radius:6px;padding:1rem;display:flex;flex-direction:column;justify-between;"><div>`;
        html += `<div style="display:flex;justify-between;align-items:flex-start;margin-bottom:0.75rem;"><div class="fn-name" style="font-weight:700;font-size:0.95rem;font-family:var(--font-mono);">${fn.name}</div><span style="font-size:0.65rem;font-family:var(--font-mono);font-weight:700;background:${isPayable ? 'rgba(255,224,27,0.2)' : 'rgba(255,95,166,0.15)'};color:${isPayable ? 'var(--fg)' : '#FF5FA6'};padding:0.15rem 0.4rem;border-radius:3px;text-transform:uppercase;">${isPayable ? 'payable' : 'write'}</span></div>`;
        if (fn.inputs && fn.inputs.length > 0) {
          for (let i = 0; i < fn.inputs.length; i++) {
            const input = fn.inputs[i];
            const key = `${fn.name}-${i}`;
            html += `<div class="fn-input-row" style="margin-bottom:0.5rem;"><label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">${input.name} (${input.type})</label><input class="fn-input write-input" data-fn-key="${key}" placeholder="${input.type}" value="${writeInputs[key] || ''}" /></div>`;
          }
        } else {
          html += `<div class="fn-input-row" style="margin-bottom:0.5rem;"><span class="fn-no-params" style="font-size:0.75rem;color:var(--fg-muted);font-style:italic;">No input parameters</span></div>`;
        }
        if (isPayable) {
          html += `<div class="fn-input-row" style="margin-bottom:0.5rem;"><label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">Value (wei)</label><input class="fn-input write-value-input" data-fn-name="${fn.name}" placeholder="0" value="${writeInputs[`${fn.name}-value`] || ''}" /></div>`;
        }
        html += `</div><div>`;
        const output = fn.outputs?.map(o => o.type).join(', ') || 'void';
        html += `<button class="cta cta-secondary write-btn" data-fn-name="${fn.name}" style="margin-top:0.75rem;width:100%;" ${writeLoading[fn.name!] ? 'disabled' : ''}>${writeLoading[fn.name!] ? 'Sending…' : `Call ${fn.name}`}</button>`;
        html += `<div class="fn-type" style="font-size:0.7rem;color:var(--fg-muted);margin-top:0.5rem;font-family:var(--font-mono);">returns (${output})</div>`;
        html += `</div></div>`;
      }
      html += `</div></div>`;
    }
  }

  html += `</div>`;
  return html;
}

let readTimers: Record<string, any> = {};

function debounceRefreshReads(name: string) {
  clearTimeout(readTimers[name]);
  readTimers[name] = setTimeout(refreshReads, 500);
}

export function bindContractEvents() {
  const deployBtn = document.getElementById('deploy-btn');
  deployBtn?.addEventListener('click', deployContractAction);

  document.getElementById('clear-contract-btn')?.addEventListener('click', () => {
    contractAddress = '';
    localStorage.removeItem(getStorageKey());
    addToast('Contract address reset', 'info');
    if (reloadContractSection) reloadContractSection();
  });

  document.getElementById('tab-all-btn')?.addEventListener('click', () => { activeTab = 'all'; if (reloadContractSection) reloadContractSection(); });
  document.getElementById('tab-read-btn')?.addEventListener('click', () => { activeTab = 'read'; if (reloadContractSection) reloadContractSection(); });
  document.getElementById('tab-write-btn')?.addEventListener('click', () => { activeTab = 'write'; if (reloadContractSection) reloadContractSection(); });
  document.getElementById('refresh-reads-btn')?.addEventListener('click', () => refreshReads());

  document.querySelectorAll('.ctor-input').forEach((el) => {
    el.addEventListener('input', (e) => {
      const idx = (e.currentTarget as HTMLElement).dataset.ctorIdx;
      if (idx !== undefined) {
        writeInputs[`ctor-${idx}`] = (e.currentTarget as HTMLInputElement).value;
      }
    });
  });

  document.querySelectorAll('.read-input').forEach((el) => {
    el.addEventListener('input', (e) => {
      const key = (e.currentTarget as HTMLElement).dataset.readKey;
      if (key) {
        writeInputs[`read-${key}`] = (e.currentTarget as HTMLInputElement).value;
      }
      debounceRefreshReads('read');
    });
  });

  document.querySelectorAll('.write-input').forEach((el) => {
    el.addEventListener('input', (e) => {
      const key = (e.currentTarget as HTMLElement).dataset.fnKey;
      if (key) {
        writeInputs[key] = (e.currentTarget as HTMLInputElement).value;
      }
    });
  });

  document.querySelectorAll('.write-value-input').forEach((el) => {
    el.addEventListener('input', (e) => {
      const fnName = (e.currentTarget as HTMLElement).dataset.fnName;
      if (fnName) {
        writeInputs[`${fnName}-value`] = (e.currentTarget as HTMLInputElement).value;
      }
    });
  });

  document.querySelectorAll('.write-btn').forEach((el) => {
    el.addEventListener('click', async (e) => {
      const fnName = (e.currentTarget as HTMLElement).dataset.fnName;
      if (!fnName || !artifact) return;
      const fnDef = artifact.abi.find((entry: AbiEntry) => entry.name === fnName);
      const args = fnDef?.inputs?.map((_, i) => writeInputs[`${fnName}-${i}`] || '') || [];
      const value = writeInputs[`${fnName}-value`];
      await writeFunction(fnName, args, value);
    });
  });
}
