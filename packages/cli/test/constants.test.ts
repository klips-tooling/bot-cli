import { describe, it, expect } from 'vitest';
import { BOT_MAINNET, BOT_TESTNET, NETWORKS } from '../src/constants.js';

describe('network constants', () => {
  it('exposes correct mainnet config', () => {
    expect(BOT_MAINNET.chainId).toBe(677);
    expect(BOT_MAINNET.rpcUrl).toBe('https://rpc.botchain.ai');
    expect(BOT_MAINNET.explorerUrl).toBe('https://scan.botchain.ai');
    expect(BOT_MAINNET.nativeCurrency.symbol).toBe('BOT');
    expect(BOT_MAINNET.nativeCurrency.decimals).toBe(18);
  });

  it('exposes correct testnet config', () => {
    expect(BOT_TESTNET.chainId).toBe(968);
    expect(BOT_TESTNET.rpcUrl).toBe('https://rpc.bohr.life');
    expect(BOT_TESTNET.explorerUrl).toBe('https://scan.bohr.life');
    expect(BOT_TESTNET.faucetUrl).toBe('https://faucet.botchain.ai/basic');
  });

  it('exports both networks', () => {
    expect(NETWORKS).toHaveLength(2);
    expect(NETWORKS.map((n) => n.chainId)).toContain(677);
    expect(NETWORKS.map((n) => n.chainId)).toContain(968);
  });
});
