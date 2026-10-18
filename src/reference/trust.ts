import type { Tier, TrustChamber } from '../types.ts';

export interface Record { accepted: number; rejected: number; acpScore: number }
/** Reference chamber 2 (see explore-miner-agent/lax-agent-trust-score for the full model). Never refuses. */
export const referenceTrust: TrustChamber = {
  score(r) {
    const x = (r ?? {}) as Partial<Record>;
    const acc = Math.max(0, x.accepted ?? 0), rej = Math.max(0, x.rejected ?? 0);
    const score = Math.round(60 * ((acc + 1) / (acc + rej + 2)) * Math.min(1, acc / 10) + 0.4 * Math.min(100, Math.max(0, x.acpScore ?? 0)));
    const tier: Tier = acc === 0 || score < 30 ? 'unproven' : score < 60 ? 'bronze' : score < 80 ? 'silver' : 'gold';
    return { score, tier, reasons: [`${acc} accepted, ${rej} rejected, ACP ${x.acpScore ?? 0}`] };
  },
};
