import { recoverMessageAddress, isAddress } from 'viem';
import type { IdentityChamber } from '../types.ts';

export interface Challenge { did: string; listingId: string; nonce: string; expiresAt: string }
export const challengeText = (c: Challenge) => `Cerberus identity challenge\nAgent: ${c.did}\nListing: ${c.listingId}\nNonce: ${c.nonce}\nExpires At: ${c.expiresAt}`;

/** Reference chamber 1 (see explore-miner-agent/lax-agent-identity-challenge for the full module). */
export function referenceIdentity(seen = new Set<string>()): IdentityChamber {
  return {
    async verify({ did, listingId, ownerAddress, challenge, signature, now }) {
      const c = challenge as Challenge;
      if (!c || c.did !== did || c.listingId !== listingId) return { ok: false, reason: 'tampered_challenge' };
      if (Date.parse(c.expiresAt) <= now.getTime()) return { ok: false, reason: 'expired' };
      if (seen.has(c.nonce)) return { ok: false, reason: 'replayed_nonce' };
      if (!isAddress(ownerAddress)) return { ok: false, reason: 'malformed_address' };
      let signer: string;
      try { signer = await recoverMessageAddress({ message: challengeText(c), signature: signature as `0x${string}` }); } catch { return { ok: false, reason: 'malformed_signature' }; }
      if (signer.toLowerCase() !== ownerAddress.toLowerCase()) return { ok: false, reason: 'wrong_signer' };
      seen.add(c.nonce);
      return { ok: true, reason: 'ok' };
    },
  };
}
