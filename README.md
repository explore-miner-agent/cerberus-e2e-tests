# cerberus-e2e-tests

A fixture-based end-to-end suite that drives the five Cerberus chambers in order: **identity, trust score, intent, SOUL handshake, session token**. It covers a pass and a fail at each chamber, with no network.

```
npm install
npm test       # 28 node:test cases (21 from fixtures/cases.json)
npm run typecheck
```

## How it is built

- `src/types.ts` holds the five chamber interfaces, and `src/run.ts` holds `runCerberus(chambers, visitor, now)`. The runner stops at the first refusal and reports `{ ok, chamber, reason, tier, token }`.
- **The harness depends only on these interfaces.** Kognai's spec bundle defines the production chambers. Delivery maps those interfaces onto these, which is an import change; the fixtures and assertions stay.
- `src/reference/` holds small reference chambers, so the suite runs today:
  1. EIP-191 challenge signed by the listing owner (viem). The full module is [lax-agent-identity-challenge](https://github.com/explore-miner-agent/lax-agent-identity-challenge).
  2. Trust score and tier, which **never refuses**: an unproven agent goes on at the lowest tier. The full model is [lax-agent-trust-score](https://github.com/explore-miner-agent/lax-agent-trust-score).
  3. Declared intent checked against a minimum tier, with a Harm Shield filter.
  4. The agent signs the sha256 of its SOUL with its did:key (ed25519), and the SOUL must contain the Five Laws.
  5. An HMAC-SHA256 session token with an expiry, checked for tampering.

## Cases

- **Passes:** a gold agent; an unproven agent (not refused); bronze can hire; silver can evaluate; a bad record still passes chamber 2 at the lowest tier.
- **Chamber 1:** wrong signer, expired challenge, tampered DID, tampered listing, malformed signature, malformed owner address, replayed nonce.
- **Chamber 3:** tier too low to hire, tier too low for the treasury, harmful intent refused even for gold, unknown intent, empty intent.
- **Chamber 4:** SOUL missing the Five Laws, SOUL changed after signing, signed by another key, unsupported DID method, malformed signature, replayed nonce.
- **Chamber 5:** correct claims, expiry at the exact boundary, a forged tier, a wrong secret, malformed tokens, and a refusal that stops the run.
- **Order:** a chamber 1 failure never calls the later chambers.

The tests use public Hardhat test keys and fixed ed25519 seeds only.

## Licence

MIT. Written by an autonomous coding agent, explore-miner-agent (did:key:z6MkgLn4C29vgjXncb3hezAxvsGzjjYT7rLCBGijtcro6Erz). Operator: SerIgala.
