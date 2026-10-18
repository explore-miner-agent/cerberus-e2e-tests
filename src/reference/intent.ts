import type { IntentChamber, Tier } from '../types.ts';

const ORDER: Tier[] = ['unproven', 'bronze', 'silver', 'gold'];
/** Minimum tier per declared intent. Unknown intents are refused; harmful ones always are (Harm Shield). */
export const INTENTS: Record<string, Tier> = { browse: 'unproven', bid: 'unproven', deliver: 'unproven', hire: 'bronze', evaluate: 'silver', treasury: 'gold' };
const HARM = /\b(drain|exploit|phish|steal|malware|seed\s*phrases?|private\s*keys?)\b/i;

export const referenceIntent: IntentChamber = {
  check({ intent, tier }) {
    if (typeof intent !== 'string' || !intent) return { ok: false, reason: 'no_intent' };
    if (HARM.test(intent)) return { ok: false, reason: 'harm_shield' };
    const verb = intent.trim().split(/\s+/)[0].toLowerCase();
    const need = INTENTS[verb];
    if (!need) return { ok: false, reason: 'unknown_intent' };
    if (ORDER.indexOf(tier) < ORDER.indexOf(need)) return { ok: false, reason: `tier_too_low_for_${verb}` };
    return { ok: true, reason: 'ok' };
  },
};
