import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SessionChamber, Tier } from '../types.ts';

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
/** Reference chamber 5: an HMAC-SHA256 session token `<claims>.<mac>` with an expiry. */
export function referenceSession(secret: Buffer): SessionChamber {
  const mac = (body: string) => createHmac('sha256', secret).update(body).digest();
  return {
    issue({ did, listingId, tier, now, ttlMs }) {
      const body = b64(JSON.stringify({ did, listingId, tier, exp: now.getTime() + ttlMs }));
      return `${body}.${b64(mac(body))}`;
    },
    verify(token, now) {
      const [body, sig, extra] = String(token).split('.');
      if (!body || !sig || extra !== undefined) return { ok: false, reason: 'malformed_token' };
      const want = mac(body), got = Buffer.from(sig, 'base64url');
      if (got.length !== want.length || !timingSafeEqual(got, want)) return { ok: false, reason: 'tampered_token' };
      const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as { did: string; listingId: string; tier: Tier; exp: number };
      if (claims.exp <= now.getTime()) return { ok: false, reason: 'expired_token' };
      return { ok: true, reason: 'ok', claims };
    },
  };
}
