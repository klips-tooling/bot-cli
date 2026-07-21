<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConfig } from '@wagmi/vue';
import { readContract, deployContract, waitForTransactionReceipt } from '@wagmi/core';
import { addToast } from '../lib/toast';
import contractArtifact from '../lib/contract.json';

const { address } = useAccount();
const wagmiConfig = useConfig();
const { writeContract, isPending: isDeploying } = useWriteContract();

const artifact = contractArtifact as {
  contractName: string;
  abi: any[];
  bytecode: string;
};
const { abi, bytecode, contractName } = artifact;

const chainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || 968);
const storageKey = `botchain_contract_${contractName || 'default'}_${chainId}`;

const contractAddress = ref(localStorage.getItem(storageKey) || '');
const manualAddressInput = ref('');
const isCustomAddress = ref(false);
const activeTab = ref<'all' | 'read' | 'write'>('all');
const deployTxHash = ref<`0x${string}` | undefined>();
const deployArgs = reactive<Record<string, string>>({});
const readResults = reactive<Record<string, string>>({});
const readInputs = reactive<Record<string, string>>({});
const writeInputs = reactive<Record<string, string>>({});
const writeLoading = reactive<Record<string, boolean>>({});

const { data: deployReceipt, isLoading: isWaitingDeploy } = useWaitForTransactionReceipt({
  hash: deployTxHash,
  query: computed(() => ({ enabled: !!deployTxHash.value })),
});

// Parse ABI
const ctorDef = computed(() => abi?.find((e: any) => e.type === 'constructor'));
const reads = computed(() => {
  if (!abi) return [];
  return abi.filter((e: any) => e.type === 'function' && (e.stateMutability === 'view' || e.stateMutability === 'pure') && e.name !== 'constructor');
});
const writes = computed(() => {
  if (!abi) return [];
  return abi.filter((e: any) => e.type === 'function' && e.stateMutability !== 'view' && e.stateMutability !== 'pure' && e.name !== 'constructor');
});

const explorerBase = chainId === 677 ? 'https://scan.botchain.ai' : 'https://scan.bohr.life';
const hasBytecode = computed(() => bytecode && bytecode.length > 20);
const noContract = computed(() => !abi || abi.length === 0 || !bytecode);

function formatValue(val: any): string {
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

watch(deployReceipt, (receipt) => {
  if (!receipt) return;
  if (receipt.status === 'success' && receipt.contractAddress) {
    contractAddress.value = receipt.contractAddress;
    localStorage.setItem(storageKey, receipt.contractAddress);
    deployTxHash.value = undefined;
    addToast(`Contract deployed at ${receipt.contractAddress}`, 'success');
  } else if (receipt.status === 'reverted') {
    deployTxHash.value = undefined;
    addToast('Deployment transaction reverted on-chain', 'error');
  }
});

const readTimers: Record<string, any> = {};
async function refreshReads() {
  if (!contractAddress.value || !address.value) return;
  for (const fn of reads.value) {
    try {
      const rawInputs = fn.inputs?.map((_: any, i: number) => parseArg(readInputs[`${fn.name}-${i}`] || '')) || [];
      const val = await readContract(wagmiConfig, {
        abi,
        address: contractAddress.value as `0x${string}`,
        functionName: fn.name,
        args: rawInputs,
      });
      readResults[fn.name] = formatValue(val);
    } catch {
      readResults[fn.name] = 'Error';
    }
  }
}

watch([contractAddress, address], () => { refreshReads(); });
onMounted(() => { refreshReads(); });

async function handleDeploy() {
  try {
    const args = ctorDef.value?.inputs
      ? ctorDef.value.inputs.map((_: any, i: number) => parseArg(deployArgs[`ctor-${i}`] || ''))
      : [];
    const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
    const hash = await deployContract(wagmiConfig, {
      abi,
      bytecode: formattedBytecode as `0x${string}`,
      args,
      gas: 3_000_000n,
    });
    deployTxHash.value = hash;
    addToast('Deploy transaction submitted', 'pending', hash);
  } catch (err: any) {
    addToast(err?.message || 'Deploy failed', 'error');
  }
}

async function handleWrite(fnName: string) {
  writeLoading[fnName] = true;
  try {
    const fnDef = writes.value.find((fn: any) => fn.name === fnName);
    const args = fnDef?.inputs?.map((_: any, i: number) => parseArg(writeInputs[`${fnName}-${i}`] || '')) || [];
    const value = fnDef?.stateMutability === 'payable' ? parseArg(writeInputs[`${fnName}-value`] || '') : undefined;
    const hash = await writeContract({
      abi,
      address: contractAddress.value as `0x${string}`,
      functionName: fnName,
      args,
      value: value as any,
      gas: 300_000n,
    });
    if (hash) {
      addToast(`Write ${fnName} submitted`, 'pending', hash as string);
      try {
        await waitForTransactionReceipt(wagmiConfig, { hash: hash as `0x${string}` });
        addToast(`Write ${fnName} confirmed`, 'success');
        await refreshReads();
        setTimeout(refreshReads, 1200);
      } catch {
        addToast(`Write ${fnName} failed`, 'error');
      }
    }
  } catch (err: any) {
    const raw: string = err?.message || err?.shortMessage || '';
    const revertMatch = raw.match(/reverted with reason string '([^']+)'/i)
      || raw.match(/Error: ([^\n(]+)/i);
    const friendlyMsg = revertMatch ? `Reverted: ${revertMatch[1].trim()}` : raw || `Write ${fnName} failed`;
    addToast(friendlyMsg, 'error');
  } finally {
    writeLoading[fnName] = false;
  }
}

function clearContractAddress() {
  contractAddress.value = '';
  localStorage.removeItem(storageKey);
  addToast('Contract address reset', 'info');
}

function saveManualAddress() {
  if (!manualAddressInput.value.startsWith('0x') || manualAddressInput.value.length !== 42) {
    addToast('Invalid contract address format', 'error');
    return;
  }
  contractAddress.value = manualAddressInput.value;
  localStorage.setItem(storageKey, manualAddressInput.value);
  isCustomAddress.value = false;
  addToast('Contract address set manually', 'success');
}

function onReadInput(name: string) {
  clearTimeout(readTimers[name]);
  readTimers[name] = setTimeout(refreshReads, 500);
}

function copyClip(text: string) {
  navigator.clipboard.writeText(text);
  addToast('Copied to clipboard', 'info');
}
</script>

<template>
  <div class="contract-section" style="margin-top: 2rem;">
    <div style="display:flex;align-items:center;justify-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;">
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <span class="section-label" style="margin:0;">{{ contractName }}</span>
        <span v-if="contractAddress" style="font-size:0.75rem;font-family:var(--font-mono);padding:0.2rem 0.5rem;background:rgba(16,163,127,0.15);color:var(--accent);border:1px solid var(--accent);border-radius:4px;font-weight:600;">
          DEPLOYED
        </span>
      </div>
      <div v-if="contractAddress" style="display:flex;gap:0.5rem;">
        <button class="icon-btn" @click="clearContractAddress" title="Reset or Deploy New"
          style="display:inline-flex;align-items:center;gap:0.4rem;background:var(--bg-card);border:var(--border-w) solid var(--border);padding:0.35rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:600;color:var(--fg);font-family:var(--font-sans);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Change Contract
        </button>
      </div>
    </div>

    <div v-if="noContract" class="wallet-card" style="text-align:center;padding:2rem;">
      <h3 style="margin:0 0 0.5rem;font-size:1.1rem;font-weight:700;">No Compiled Contract Found</h3>
      <p style="color:var(--fg-muted);font-size:0.88rem;margin:0 0 1rem;">
        Compile contracts with <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">npx hardhat compile</code> or <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">forge build</code>.
      </p>
      <div style="background:var(--bg);padding:0.85rem 1rem;border-radius:6px;border:1px solid var(--border);text-align:left;display:inline-block;max-width:520px;width:100%;">
        <p style="margin:0 0 0.4rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Install Tooling:</p>
        <div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--fg);display:flex;flex-direction:column;gap:0.4rem;">
          <div>• <strong>Foundry:</strong> <code style="background:var(--bg-card);padding:2px 4px;border-radius:3px;">curl -L https://foundry.paradigm.xyz | bash && foundryup</code></div>
          <div>• <strong>Hardhat:</strong> <code style="background:var(--bg-card);padding:2px 4px;border-radius:3px;">npm install -D hardhat @nomicfoundation/hardhat-toolbox</code></div>
        </div>
      </div>
    </div>

    <!-- Deploy / Attach -->
    <div v-else-if="!contractAddress" class="wallet-card" style="margin-bottom:1.5rem;">
      <div class="wallet-card-header" style="gap:0.6rem;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;flex-shrink:0;">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        </svg>
        <h2 style="margin:0;font-size:1.2rem;font-weight:700;">Deploy or Attach {{ contractName }}</h2>
      </div>
      <p style="color:var(--fg-muted);font-size:0.88rem;margin-top:0.3rem;margin-bottom:1.25rem;">Deploy a new instance of your contract or provide an existing address.</p>

      <div v-if="!isCustomAddress">
        <div v-if="ctorDef?.inputs?.length" style="margin-bottom:1rem;background:var(--bg);padding:1rem;border-radius:6px;border:1px solid var(--border);">
          <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.75rem;">Constructor Parameters</p>
          <div v-for="(input, i) in ctorDef.inputs" :key="i" class="fn-input-row" style="margin-bottom:0.5rem;">
            <label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">
              {{ input.name }} <span style="opacity:0.6;font-family:var(--font-mono);">({{ input.type }})</span>
            </label>
            <input class="fn-input" :placeholder="input.type" :value="deployArgs[`ctor-${i}`] || ''" @input="deployArgs[`ctor-${i}`] = ($event.target as HTMLInputElement).value" />
          </div>
        </div>

        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button class="cta" @click="handleDeploy" :disabled="!hasBytecode || isDeploying || isWaitingDeploy"
            :title="!hasBytecode ? 'Compile contract first with forge build' : ''">
            {{ !hasBytecode ? 'Compile with forge build first' : isDeploying || isWaitingDeploy ? 'Deploying…' : `Deploy ${contractName}` }}
          </button>
          <button class="cta cta-secondary" @click="isCustomAddress = true" style="background:transparent;">
            Attach Existing Address
          </button>
        </div>
      </div>

      <div v-else style="display:flex;flex-direction:column;gap:0.75rem;">
        <div class="fn-input-row">
          <label class="fn-input-label">Contract Address (0x...)</label>
          <input class="fn-input" placeholder="0x..." v-model="manualAddressInput" />
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button class="cta" @click="saveManualAddress">Save Address</button>
          <button class="cta cta-secondary" @click="isCustomAddress = false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Contract Details & Tabs -->
    <template v-if="contractAddress">
      <div class="wallet-card" style="margin-bottom:1.5rem;background:var(--bg-card);border:var(--border-w) solid var(--border);">
        <div class="wallet-card-header" style="justify-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span class="wallet-status-dot" style="background:#10A37F;" />
            <h2 style="margin:0;font-size:1.1rem;font-weight:700;">Contract Status</h2>
          </div>
          <a class="cta cta-secondary" :href="`${explorerBase}/address/${contractAddress}`" target="_blank" rel="noopener"
            style="padding:0.35rem 0.75rem;font-size:0.75rem;display:inline-flex;align-items:center;gap:0.35rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Explorer
          </a>
        </div>

        <div class="wallet-detail" style="margin-top:0.75rem;display:flex;align-items:center;justify-between;background:var(--bg);padding:0.75rem 1rem;border:1px solid var(--border);border-radius:6px;">
          <div>
            <div class="wd-label" style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--fg-muted);margin-bottom:0.2rem;">Active Address</div>
            <div class="wd-value" style="font-family:var(--font-mono);font-size:0.85rem;font-weight:600;word-break:break-all;">
              {{ contractAddress }}
            </div>
          </div>
          <button class="icon-btn" @click="copyClip(contractAddress)" title="Copy Address"
            style="background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:0.4rem;cursor:pointer;color:var(--fg);display:inline-flex;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>

        <!-- Contract State Summary -->
        <div v-if="reads.length && Object.keys(readResults).length" style="margin-top:1rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:0.75rem 1rem;">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--fg-muted);margin-bottom:0.5rem;font-weight:700;">
            Current Contract State
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
            <template v-for="fn in reads" :key="fn.name">
              <div v-if="!fn.inputs?.length" style="display:flex;align-items:center;gap:0.4rem;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:0.3rem 0.6rem;font-size:0.8rem;font-family:var(--font-mono);">
                <span style="color:var(--fg-muted);">{{ fn.name }}:</span>
                <span :style="{ fontWeight: 700, color: readResults[fn.name] === 'true' ? '#10A37F' : readResults[fn.name] === 'false' ? '#FF5FA6' : 'var(--fg)' }">
                  {{ readResults[fn.name] ?? '…' }}
                </span>
              </div>
            </template>
          </div>
          <div style="font-size:0.7rem;color:var(--fg-muted);margin-top:0.5rem;font-style:italic;">
            Write functions may require specific state conditions to succeed.
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display:flex;align-items:center;justify-between;border-bottom:2px solid var(--border);padding-bottom:0.5rem;margin-bottom:1.5rem;">
        <div style="display:flex;gap:0.5rem;">
          <button @click="activeTab = 'all'"
            :style="{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: 'none', background: activeTab === 'all' ? 'var(--accent)' : 'transparent', color: activeTab === 'all' ? 'var(--accent-fg)' : 'var(--fg)', fontFamily: 'var(--font-sans)' }">
            All Functions ({{ reads.length + writes.length }})
          </button>
          <button @click="activeTab = 'read'"
            :style="{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: 'none', background: activeTab === 'read' ? 'var(--accent)' : 'transparent', color: activeTab === 'read' ? 'var(--accent-fg)' : 'var(--fg)', fontFamily: 'var(--font-sans)' }">
            Read ({{ reads.length }})
          </button>
          <button @click="activeTab = 'write'"
            :style="{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: 'none', background: activeTab === 'write' ? 'var(--accent)' : 'transparent', color: activeTab === 'write' ? 'var(--accent-fg)' : 'var(--fg)', fontFamily: 'var(--font-sans)' }">
            Write ({{ writes.length }})
          </button>
        </div>

        <button v-if="reads.length > 0" class="toast-link" @click="refreshReads"
          style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.75rem;font-weight:700;background:none;border:none;cursor:pointer;color:#1CD8B0;text-transform:uppercase;letter-spacing:0.05em;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
            <path d="M21.5 2v6h-6M2.5 22v-6h6" />
            <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          Refresh Reads
        </button>
      </div>

      <!-- Read Functions -->
      <div v-if="(activeTab === 'all' || activeTab === 'read') && reads.length > 0" class="contract-functions" style="margin-bottom:2rem;">
        <h3 style="margin:0 0 1rem;font-size:0.9rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg-muted);display:flex;align-items:center;gap:0.5rem;">
          <span style="width:8px;height:8px;border-radius:50%;background:#4D7CFF;display:inline-block;" /> Read (View) Functions
        </h3>
        <div class="function-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:1rem;">
          <div v-for="fn in reads" :key="fn.name" class="function-card" style="background:var(--bg-card);border:var(--border-w) solid var(--border);border-radius:6px;padding:1rem;display:flex;flex-direction:column;justify-between;box-shadow:var(--sh-sm);">
            <div>
              <div style="display:flex;justify-between;align-items:flex-start;margin-bottom:0.75rem;">
                <div class="fn-name" style="font-weight:700;font-size:0.95rem;font-family:var(--font-mono);">{{ fn.name }}</div>
                <span style="font-size:0.65rem;font-family:var(--font-mono);font-weight:700;background:rgba(77,124,255,0.15);color:#4D7CFF;padding:0.15rem 0.4rem;border-radius:3px;text-transform:uppercase;">read</span>
              </div>
              <div v-for="(input, i) in fn.inputs" :key="i" class="fn-input-row" style="margin-bottom:0.5rem;">
                <label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">
                  {{ input.name }} <span style="opacity:0.6;font-family:var(--font-mono);">({{ input.type }})</span>
                </label>
                <input class="fn-input" :placeholder="input.type" :value="readInputs[`${fn.name}-${i}`] || ''"
                  @input="readInputs[`${fn.name}-${i}`] = ($event.target as HTMLInputElement).value; onReadInput(fn.name)" />
              </div>
              <div style="margin-top:0.75rem;background:var(--bg);padding:0.6rem 0.8rem;border-radius:4px;border:1px solid var(--border);">
                <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--fg-muted);margin-bottom:0.25rem;font-weight:700;">Output Value</div>
                <div class="fn-output" style="font-family:var(--font-mono);font-size:0.85rem;font-weight:600;word-break:break-all;">
                  <span v-if="readResults[fn.name] !== undefined" className="fn-value">{{ readResults[fn.name] }}</span>
                  <span v-else class="fn-loading">
                    <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;">
                      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <div class="fn-type" style="font-size:0.7rem;color:var(--fg-muted);margin-top:0.75rem;font-family:var(--font-mono);">
              returns ({{ fn.outputs?.map((o: any) => o.type).join(', ') || 'void' }})
            </div>
          </div>
        </div>
      </div>

      <!-- Write Functions -->
      <div v-if="(activeTab === 'all' || activeTab === 'write') && writes.length > 0" class="contract-functions">
        <h3 style="margin:0 0 1rem;font-size:0.9rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg-muted);display:flex;align-items:center;gap:0.5rem;">
          <span style="width:8px;height:8px;border-radius:50%;background:#FF5FA6;display:inline-block;" /> Write (State Change) Functions
        </h3>
        <div class="function-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:1rem;">
          <div v-for="fn in writes" :key="fn.name" class="function-card" style="background:var(--bg-card);border:var(--border-w) solid var(--border);border-radius:6px;padding:1rem;display:flex;flex-direction:column;justify-between;box-shadow:var(--sh-sm);">
            <div>
              <div style="display:flex;justify-between;align-items:flex-start;margin-bottom:0.75rem;">
                <div class="fn-name" style="font-weight:700;font-size:0.95rem;font-family:var(--font-mono);">{{ fn.name }}</div>
                <span :style="{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, background: fn.stateMutability === 'payable' ? 'rgba(255,224,27,0.2)' : 'rgba(255,95,166,0.15)', color: fn.stateMutability === 'payable' ? 'var(--fg)' : '#FF5FA6', padding: '0.15rem 0.4rem', borderRadius: '3px', textTransform: 'uppercase' }">
                  {{ fn.stateMutability === 'payable' ? 'payable' : 'write' }}
                </span>
              </div>
              <div v-for="(input, i) in fn.inputs" :key="i" class="fn-input-row" style="margin-bottom:0.5rem;">
                <label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">
                  {{ input.name }} <span style="opacity:0.6;font-family:var(--font-mono);">({{ input.type }})</span>
                </label>
                <input class="fn-input" :placeholder="input.type" :value="writeInputs[`${fn.name}-${i}`] || ''" @input="writeInputs[`${fn.name}-${i}`] = ($event.target as HTMLInputElement).value" />
              </div>
              <div v-if="!fn.inputs || fn.inputs.length === 0" class="fn-input-row" style="margin-bottom:0.5rem;">
                <span class="fn-no-params" style="font-size:0.75rem;color:var(--fg-muted);font-style:italic;">No input parameters</span>
              </div>
              <div v-if="fn.stateMutability === 'payable'" class="fn-input-row" style="margin-bottom:0.5rem;">
                <label class="fn-input-label" style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.2rem;">Value (wei)</label>
                <input class="fn-input" placeholder="0" :value="writeInputs[`${fn.name}-value`] || ''" @input="writeInputs[`${fn.name}-value`] = ($event.target as HTMLInputElement).value" />
              </div>
            </div>
            <div>
              <button class="cta cta-secondary" style="margin-top:0.75rem;width:100%;display:flex;justify-content:center;align-items:center;gap:0.4rem;" @click="handleWrite(fn.name)" :disabled="writeLoading[fn.name]">
                {{ writeLoading[fn.name] ? 'Sending…' : `Call ${fn.name}` }}
              </button>
              <div class="fn-type" style="font-size:0.7rem;color:var(--fg-muted);margin-top:0.5rem;font-family:var(--font-mono);">
                returns ({{ fn.outputs?.map((o: any) => o.type).join(', ') || 'void' }})
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

