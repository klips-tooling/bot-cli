import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { randomBytes } from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { printBanner, isCancel } from '../utils/prompts.js';

// ── Crypto helpers (using @noble/curves + @noble/hashes) ──────────────────────

function generatePrivateKey(): Buffer {
  // Keep generating until we get a valid secp256k1 private key
  // Valid range: 1 <= key < curve order (n)
  // n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
  const n = Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141', 'hex');
  while (true) {
    const key = randomBytes(32);
    // key must be > 0 and < n
    if (key.compare(Buffer.alloc(32)) > 0 && key.compare(n) < 0) return key;
  }
}

function privateKeyToAddress(privateKeyHex: string): string {
  // Dynamically require @noble/curves (bundled by tsup)

  const { secp256k1 } = require('@noble/curves/secp256k1.js');

  const { keccak_256 } = require('@noble/hashes/sha3.js');

  const privateKeyBytes = Buffer.from(privateKeyHex.replace('0x', ''), 'hex');
  // Uncompressed public key (65 bytes: 0x04 + x + y)
  const publicKey = secp256k1.getPublicKey(privateKeyBytes, false);
  // Drop the 0x04 prefix, hash the remaining 64 bytes
  const pubKeyHash = keccak_256(publicKey.slice(1));
  // Take last 20 bytes as the address
  const addressBytes = pubKeyHash.slice(-20);
  const rawAddress = Buffer.from(addressBytes).toString('hex');
  return toChecksumAddress(rawAddress);
}

function toChecksumAddress(address: string): string {
  const { keccak_256 } = require('@noble/hashes/sha3.js');
  const addr = address.toLowerCase();
  const hash = Buffer.from(keccak_256(Buffer.from(addr, 'utf8'))).toString('hex');
  let result = '0x';
  for (let i = 0; i < addr.length; i++) {
    result += parseInt(hash[i], 16) >= 8 ? addr[i].toUpperCase() : addr[i];
  }
  return result;
}

// ── Command ───────────────────────────────────────────────────────────────────

export const walletCommand = new Command('wallet')
  .description('Generate a throwaway dev keypair for testing')
  .option('-s, --save', 'Save the private key to .env as PRIVATE_KEY')
  .option('--count <n>', 'Number of wallets to generate', '1')
  .action(async (opts) => {
    printBanner();
    p.intro(chalk.bold('🔑  Generate Dev Wallet'));

    const count = Math.min(Math.max(parseInt(opts.count) || 1, 1), 10);

    const wallets: { address: string; privateKey: string }[] = [];

    for (let i = 0; i < count; i++) {
      const privKey = generatePrivateKey();
      const privateKey = '0x' + privKey.toString('hex');
      const address = privateKeyToAddress(privateKey);
      wallets.push({ address, privateKey });
    }

    // Display wallets
    console.log();
    const w = 68;
    const border = chalk.yellow('─'.repeat(w));

    wallets.forEach((wallet, i) => {
      if (count > 1) console.log(chalk.dim(`  Wallet ${i + 1}`));
      console.log(chalk.yellow('  ┌' + '─'.repeat(w - 2) + '┐'));
      console.log(
        chalk.yellow('  │') +
          chalk.bold('  Address     ') +
          chalk.green(wallet.address) +
          ' '.repeat(Math.max(0, w - 16 - wallet.address.length)) +
          chalk.yellow('│'),
      );
      console.log(
        chalk.yellow('  │') +
          chalk.bold('  Private Key ') +
          chalk.red(wallet.privateKey) +
          chalk.yellow('│'),
      );
      console.log(chalk.yellow('  └' + '─'.repeat(w - 2) + '┘'));
      console.log();
    });

    console.log(
      chalk.yellow('  ⚠  ') +
        chalk.bold('NEVER use these keys with real funds — dev/testing only!'),
    );
    console.log();

    // Optionally save to .env
    let shouldSave = opts.save;
    if (!shouldSave && wallets.length === 1) {
      const confirm = await p.confirm({
        message: 'Save PRIVATE_KEY to .env?',
        initialValue: false,
      });
      if (!p.isCancel(confirm)) shouldSave = confirm;
    }

    if (shouldSave) {
      const envPath = path.join(process.cwd(), '.env');
      const key = wallets[0].privateKey;

      if (await fs.pathExists(envPath)) {
        let content = await fs.readFile(envPath, 'utf-8');
        if (/^PRIVATE_KEY=/m.test(content)) {
          content = content.replace(/^PRIVATE_KEY=.*/m, `PRIVATE_KEY=${key}`);
        } else {
          content += `\nPRIVATE_KEY=${key}\n`;
        }
        await fs.writeFile(envPath, content);
      } else {
        await fs.writeFile(envPath, `PRIVATE_KEY=${key}\n`);
      }
      p.note(chalk.green(`Saved to .env → PRIVATE_KEY`), '✓ Saved');
    }

    p.outro(chalk.green('Done.'));
  });
