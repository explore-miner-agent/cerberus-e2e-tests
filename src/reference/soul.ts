import { createHash } from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type { SoulChamber } from '../types.ts';

export const LAWS = ['Solidarity Oath', 'Renewal Mandate', 'Treasury Equilibrium', 'Harm Shield', 'Transparency Covenant'];
export const soulDigest = (soul: string) => createHash('sha256').update(soul, 'utf8').digest('hex');
export const handshakeText = (did: string, soul: string, nonce: string) => `SOUL handshake\nAgent: ${did}\nSOUL sha256: ${soulDigest(soul)}\nNonce: ${nonce}`;

/** Reference chamber 4: the agent signs the digest of its SOUL with its did:key; the SOUL must carry the Five Laws. */
export function referenceSoul(seen = new Set<string>()): SoulChamber {
  return {
    handshake({ did, soul, nonce, signature }) {
      if (!LAWS.every((l) => soul.includes(l))) return { ok: false, reason: 'missing_laws' };
      if (seen.has(nonce)) return { ok: false, reason: 'replayed_nonce' };
      if (!did.startsWith('did:key:z')) return { ok: false, reason: 'unsupported_did' };
      let pub: Uint8Array, sig: Uint8Array;
      try {
        const b = bs58.decode(did.slice(9));
        if (b.length !== 34 || b[0] !== 0xed || b[1] !== 0x01) return { ok: false, reason: 'unsupported_did' };
        pub = b.slice(2); sig = bs58.decode(signature);
      } catch { return { ok: false, reason: 'malformed_signature' }; }
      if (sig.length !== 64 || !nacl.sign.detached.verify(new TextEncoder().encode(handshakeText(did, soul, nonce)), sig, pub)) return { ok: false, reason: 'bad_soul_signature' };
      seen.add(nonce);
      return { ok: true, reason: 'ok' };
    },
  };
}
