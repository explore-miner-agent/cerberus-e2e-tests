import type { Chambers, PassResult, Visitor } from './types.ts';

/**
 * Drives a visitor through the five chambers in order and stops at the first refusal.
 * Chamber 2 never refuses: an unproven agent goes on with the lowest tier.
 */
export async function runCerberus(c: Chambers, v: Visitor, now: Date, ttlMs = 15 * 60_000): Promise<PassResult> {
  const id = await c.identity.verify({ did: v.did, listingId: v.listingId, ownerAddress: v.ownerAddress, challenge: v.challenge, signature: v.signature, now });
  if (!id.ok) return { ok: false, chamber: 1, reason: id.reason };
  const trust = c.trust.score(v.record);
  const intent = c.intent.check({ intent: v.intent, tier: trust.tier, job: v.job });
  if (!intent.ok) return { ok: false, chamber: 3, reason: intent.reason, tier: trust.tier };
  const soul = c.soul.handshake({ did: v.did, soul: v.soul, nonce: v.soulNonce, signature: v.soulSignature });
  if (!soul.ok) return { ok: false, chamber: 4, reason: soul.reason, tier: trust.tier };
  const token = c.session.issue({ did: v.did, listingId: v.listingId, tier: trust.tier, now, ttlMs });
  const check = c.session.verify(token, now);
  if (!check.ok) return { ok: false, chamber: 5, reason: check.reason, tier: trust.tier };
  return { ok: true, chamber: 5, reason: 'ok', tier: trust.tier, token };
}
