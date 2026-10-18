import { referenceIdentity } from './identity.ts';
import { referenceTrust } from './trust.ts';
import { referenceIntent } from './intent.ts';
import { referenceSoul } from './soul.ts';
import { referenceSession } from './session.ts';
import type { Chambers } from '../types.ts';

export function referenceChambers(secret: Buffer): Chambers {
  return { identity: referenceIdentity(), trust: referenceTrust, intent: referenceIntent, soul: referenceSoul(), session: referenceSession(secret) };
}
export { referenceIdentity, referenceTrust, referenceIntent, referenceSoul, referenceSession };
export { challengeText } from './identity.ts';
export { handshakeText, LAWS } from './soul.ts';
