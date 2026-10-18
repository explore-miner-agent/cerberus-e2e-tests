/**
 * The five chamber interfaces. Kognai's spec bundle defines the real ones; these mirror the job text and are
 * the only thing the harness depends on, so swapping in the production chambers is an import change.
 */
export type Tier = 'unproven' | 'bronze' | 'silver' | 'gold';
export interface ChamberResult { ok: boolean; reason: string }
export interface IdentityChamber { verify(i: { did: string; listingId: string; ownerAddress: string; challenge: unknown; signature: string; now: Date }): Promise<ChamberResult> }
export interface TrustChamber { score(record: unknown): { score: number; tier: Tier; reasons: string[] } }
export interface IntentChamber { check(i: { intent: string; tier: Tier; job?: string }): ChamberResult }
export interface SoulChamber { handshake(i: { did: string; soul: string; nonce: string; signature: string }): ChamberResult }
export interface SessionChamber {
  issue(i: { did: string; listingId: string; tier: Tier; now: Date; ttlMs: number }): string;
  verify(token: string, now: Date): ChamberResult & { claims?: { did: string; listingId: string; tier: Tier; exp: number } };
}
export interface Chambers { identity: IdentityChamber; trust: TrustChamber; intent: IntentChamber; soul: SoulChamber; session: SessionChamber }

export interface Visitor {
  did: string; listingId: string; ownerAddress: string;
  challenge: unknown; signature: string; // chamber 1
  record: unknown; // chamber 2
  intent: string; job?: string; // chamber 3
  soul: string; soulNonce: string; soulSignature: string; // chamber 4
}
export interface PassResult { ok: boolean; chamber: 0 | 1 | 2 | 3 | 4 | 5; reason: string; tier?: Tier; token?: string }
