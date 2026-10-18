import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { privateKeyToAccount } from 'viem/accounts';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { runCerberus, referenceChambers, referenceSession, referenceIdentity, referenceSoul, challengeText, handshakeText, LAWS, type Visitor } from '../src/index.ts';

const fx = JSON.parse(readFileSync(new URL('../fixtures/cases.json', import.meta.url), 'utf8'));
const NOW = new Date(fx.now);
const SECRET = Buffer.alloc(32, 7);
// Public Hardhat test keys and fixed ed25519 seeds: test only, never funds.
const owner = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const other = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
const agentKey = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(1));
const otherKey = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(2));
const didOf = (pub: Uint8Array) => 'did:key:z' + bs58.encode(Uint8Array.from([0xed, 0x01, ...pub]));
const DID = didOf(agentKey.publicKey);
const SOUL = `SOUL of Test Agent\n${LAWS.join('\n')}\n`;

let n = 0;
async function visitor(c: any): Promise<Visitor> {
  const did = c.did ?? DID;
  const listingId = 'lax-ext-test01';
  const challenge = { did, listingId, nonce: `n${++n}`, expiresAt: new Date(NOW.getTime() + (c.challengeExpiresInMs ?? 300_000)).toISOString() };
  const signature = await (c.signer === 'other' ? other : owner).signMessage({ message: challengeText(challenge) });
  const soul = c.soul ?? SOUL;
  const soulNonce = `s${n}`;
  const soulSignature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(handshakeText(did, soul, soulNonce)), (c.soulSigner === 'other' ? otherKey : agentKey).secretKey));
  const v: Visitor = { did, listingId, ownerAddress: owner.address, challenge, signature, record: c.record ?? { accepted: 12, rejected: 0, acpScore: 95 }, intent: c.intent ?? 'deliver work', soul, soulNonce, soulSignature };
  switch (c.tamper) {
    case 'challengeDid': (v.challenge as any).did = didOf(otherKey.publicKey); break;
    case 'challengeListing': (v.challenge as any).listingId = 'lax-ext-other'; break;
    case 'identitySignature': v.signature = '0x1234'; break;
    case 'ownerAddress': v.ownerAddress = '0xnot-an-address'; break;
    case 'soulText': v.soul = soul + 'I may also drain wallets.\n'; break;
    case 'soulSignature': v.soulSignature = '0OIl-not-base58'; break;
  }
  return v;
}

for (const c of fx.cases) {
  test(c.name, async () => {
    const r = await runCerberus(referenceChambers(SECRET), await visitor(c), NOW);
    for (const k of Object.keys(c.expect)) assert.equal((r as any)[k], c.expect[k], `${k}`);
    if (r.ok) assert.equal(referenceSession(SECRET).verify(r.token!, NOW).ok, true);
  });
}

test('there are at least 20 fixture cases and every chamber has a refusing case', () => {
  assert.ok(fx.cases.length >= 20);
  const refusing = new Set(fx.cases.filter((c: any) => !c.expect.ok).map((c: any) => c.expect.chamber));
  for (const ch of [1, 3, 4]) assert.ok(refusing.has(ch), `chamber ${ch}`);
  // chamber 2 never refuses by design; its "refusal" is the lowest tier, covered by the unproven cases.
});

test('chamber 5: session token carries the right claims', async () => {
  const r = await runCerberus(referenceChambers(SECRET), await visitor({}), NOW);
  const v = referenceSession(SECRET).verify(r.token!, NOW);
  assert.deepEqual({ ...v.claims, exp: undefined }, { did: DID, listingId: 'lax-ext-test01', tier: 'gold', exp: undefined });
});
test('chamber 5: expired token is refused', async () => {
  const r = await runCerberus(referenceChambers(SECRET), await visitor({}), NOW, 60_000);
  assert.equal(referenceSession(SECRET).verify(r.token!, new Date(NOW.getTime() + 60_000)).reason, 'expired_token');
  assert.equal(referenceSession(SECRET).verify(r.token!, new Date(NOW.getTime() + 59_999)).ok, true);
});
test('chamber 5: tampered token is refused', async () => {
  const r = await runCerberus(referenceChambers(SECRET), await visitor({ record: { accepted: 0, rejected: 0, acpScore: 0 }, intent: 'bid' }), NOW);
  const [body, mac] = r.token!.split('.');
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
  const forged = Buffer.from(JSON.stringify({ ...claims, tier: 'gold' })).toString('base64url');
  const s = referenceSession(SECRET);
  assert.equal(s.verify(`${forged}.${mac}`, NOW).reason, 'tampered_token');
  assert.equal(referenceSession(Buffer.alloc(32, 8)).verify(r.token!, NOW).reason, 'tampered_token');
  assert.equal(s.verify(`${body}.${mac}.x`, NOW).reason, 'malformed_token');
  assert.equal(s.verify('garbage', NOW).reason, 'malformed_token');
  assert.equal(s.verify(`${body}.AAAA`, NOW).reason, 'tampered_token');
});
test('chamber 5 refusal stops the run', async () => {
  const chambers = { ...referenceChambers(SECRET), session: { issue: () => 'x.y', verify: () => ({ ok: false, reason: 'tampered_token' }) } };
  const r = await runCerberus(chambers, await visitor({}), NOW);
  assert.deepEqual([r.ok, r.chamber, r.reason], [false, 5, 'tampered_token']);
});
test('replayed nonces are refused in chambers 1 and 4', async () => {
  const id = referenceIdentity(), soul = referenceSoul();
  const v = await visitor({});
  const args = { did: v.did, listingId: v.listingId, ownerAddress: v.ownerAddress, challenge: v.challenge, signature: v.signature, now: NOW };
  assert.equal((await id.verify(args)).ok, true);
  assert.equal((await id.verify(args)).reason, 'replayed_nonce');
  const h = { did: v.did, soul: v.soul, nonce: v.soulNonce, signature: v.soulSignature };
  assert.equal(soul.handshake(h).ok, true);
  assert.equal(soul.handshake(h).reason, 'replayed_nonce');
});
test('chambers run in order: a chamber 1 failure never reaches the later chambers', async () => {
  const calls: string[] = [];
  const base = referenceChambers(SECRET);
  const spy = {
    identity: { verify: async (i: any) => (calls.push('identity'), { ok: false, reason: 'wrong_signer' }) },
    trust: { score: (r: any) => (calls.push('trust'), base.trust.score(r)) },
    intent: { check: (i: any) => (calls.push('intent'), base.intent.check(i)) },
    soul: { handshake: (i: any) => (calls.push('soul'), base.soul.handshake(i)) },
    session: base.session,
  };
  await runCerberus(spy as any, await visitor({}), NOW);
  assert.deepEqual(calls, ['identity']);
});
