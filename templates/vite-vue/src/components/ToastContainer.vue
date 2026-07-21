<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { subscribe, dismissToast, type Toast } from '../lib/toast';

const toasts = ref<Toast[]>([]);
let unsub: (() => void) | null = null;

onMounted(() => {
  unsub = subscribe((list) => { toasts.value = list; });
});

onUnmounted(() => {
  unsub?.();
});

const iconMap: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  pending: '○',
};

function explorerUrl(txHash: string): string {
  const chainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || 968);
  const base = chainId === 677 ? 'https://scan.botchain.ai' : 'https://scan.bohr.life';
  return `${base}/tx/${txHash}`;
}
</script>

<template>
  <div v-if="toasts.length > 0" class="toast-container">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast--${t.type}`">
      <span class="toast-icon">{{ iconMap[t.type] }}</span>
      <span class="toast-msg">
        {{ t.message }}
        <a v-if="t.txHash" :href="explorerUrl(t.txHash)" target="_blank" rel="noopener" class="toast-link">View</a>
      </span>
      <button class="toast-close" @click="dismissToast(t.id)">✕</button>
    </div>
  </div>
</template>
