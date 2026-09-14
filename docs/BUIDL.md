# AniWere — Liquidation Cover That Proves Itself

![AniWere](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/00-cover.jpg)

**One line:** AniWere sells liquidation cover for Aave positions on Ethereum and pays it out on Creditcoin the moment the liquidation is cryptographically proven through Attestcoin, with no claims process, no oracle, no bridge, and no admin key that could stop or redirect a payout.

---

## 1. PROBLEM

![Cover always costs you trust](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/01-problem.jpg)

A leveraged Aave position can be liquidated in a single block. When it is, the borrower absorbs the liquidation penalty and has no recourse.

Cover for this risk exists, but every design on the market asks you to trust something new:

- **A claims committee** decides whether your liquidation "counts," on its own schedule.
- **A centralized oracle** reports that the liquidation happened, and you have to believe it.
- **A bridge** moves your assets to wherever the cover lives, which adds a whole new attack surface.

Each of these trades one trust assumption for another. Protection that depends on someone's approval is not really protection.

**The gap:** a liquidation is already a public, verifiable event on Ethereum. Nobody has made cover pay out from that event alone.

---

## 2. SOLUTION

![The claim proves itself](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/02-solution.jpg)

AniWere removes the claim entirely.

- **Buy cover on Creditcoin.** Your Aave position stays on Ethereum. It is never bridged, wrapped, or mirrored.
- **Priced against a proven snapshot.** Your health factor is proven cross-chain before you can buy, so nobody can insure a position that is already about to liquidate.
- **Paid by proof.** When Aave's own `LiquidationCall` event fires on Ethereum, that event is proven on Creditcoin through the Attestcoin Protocol. The payout is released inside the same transaction that verifies the proof: either both happen or neither does.

The rule in one sentence: **nobody approves your claim, because the claim proves itself.**

---

## 3. INNOVATION

![Emitter and topic0. Both, or nothing.](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/06-emitter-check.jpg)

What separates AniWere from "an insurance contract with an oracle bolted on":

- **The prober pattern.** Attestcoin proves events in receipt logs. It cannot prove storage. Aave keeps position health in storage, so AniWere doesn't read it. Instead, a prober contract on Ethereum calls Aave and emits the answer as an event, and that event is what gets proven. The health factor that reaches Creditcoin is Aave's own number, never recomputed from a price feed of ours.
- **Emitter + topic0, not topic0 alone.** A technically valid proof is not a trustworthy one. Matching the event signature alone would let anyone deploy a look-alike contract on Sepolia, emit a fake liquidation, and drain the vault. AniWere matches both the emitting contract and the topic, which is stricter than Attestcoin's official example. `test_RejectsLiquidationFromWrongEmitter` guards it.
- **Anti-replay that binds the block.** `proofId` hashes chain key + block height + merkle root + transaction contents, so one liquidation can never be paid twice, even when replayed through a different block.
- **No privileged access, by construction.** `CoverVault` is deployed *inside* the ASC's constructor, so its controller address is immutable. There is no owner, no pause, no upgrade path, and no withdrawal function for the team.

![What cannot happen](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/07-no-admin.jpg)

---

## 4. ARCHITECTURE

![The constraint that shaped everything](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/03-constraint.jpg)

**Pipeline (Ethereum Sepolia → proof worker → Creditcoin):**

```
Probe ──▶ Attest ──▶ Prove ──▶ Verify + Pay
Sepolia   Creditcoin  worker    AniWereASC (one transaction)
```

![The prober pattern](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/04-prober.jpg)

**Stages:**

- **Probe:** `AniWereProbe` calls Aave V3 on Sepolia and emits `PositionProbedForCover` with Aave's own numbers.
- **Attest:** Creditcoin attests the Sepolia block, about 8 minutes after it lands.
- **Prove:** the off-chain worker fetches a continuity proof and a merkle proof from the Attestcoin Proof Builder. The worker is a courier, trusted with nothing, and submission is permissionless.
- **Verify + Pay:** `AniWereASC` verifies both proofs synchronously through the Block Prover Precompile at `0x…0FD2`, decodes the receipt, checks emitter and topic0, validates the policy, and pays out from `CoverVault`, all in a single Creditcoin transaction.

![Six links carry it home](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/05-proof-chain.jpg)

![Architecture](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/09-architecture.png)

**Stack:**

- **Contracts:** Solidity 0.8.24, two separate Foundry projects (Sepolia source chain, Creditcoin control plane), `@gluwa/usc-contracts` `EvmV1Decoder`
- **Proof worker:** Node + TypeScript + viem, REST to the Attestcoin Proof Builder
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, wagmi + viem on two chains
- **Demo video:** Remotion with macOS TTS; scene timing is derived from measured audio length

---

## 5. LIVE ON / WHERE TO RUN IT

![Dashboard](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/ui-dashboard.jpg)

- **Web app (live demo):** https://aniwere.vercel.app
- **Contracts:** deployed and verified on-chain on Sepolia and Creditcoin CC3 Testnet (addresses below)
- **Always live, even without a wallet:** Sepolia head, finalized, and attested block heights, plus the attestation lag panel in the Proof Explorer. These are read from Sepolia and the Proof Builder on every request.
- **Permissionless fallback:** if our worker is down, a policy holder can submit their own liquidation proof from the Proof Explorer page. The payout always goes to the holder, never to the sender.

![Proof Explorer](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/ui-proof-explorer.jpg)

---

## 6. WHERE WE ARE NOW

**Shipped and working today:**

- `AniWereProbe` on Sepolia; `AniWereASC`, `AttestcoinAdapter`, and `CoverVault` on Creditcoin. The wiring was checked on-chain after deployment, and the vault is seeded with 500 CTC.
- 16/16 tests green (12 Creditcoin, 4 Sepolia), covering wrong emitter, replayed proofs, overselling cover, stale snapshots, and withdrawal of locked capital.
- Attestcoin verification path proven live: a proof built from a real Sepolia transaction was accepted by the precompile, and four corrupted variants all reverted.
- Off-chain worker running against real endpoints: probe, submit position, watch liquidations.
- Frontend with three pages (position & cover, proof explorer, buy cover) wired to both chains.

**Not proven yet (labeled honestly, not hidden):** a full probe → proof → snapshot cycle submitted against the deployed ASC. The receipt-decoding path inside the adapter only runs against the real precompile, and local tests stop at a mock. A real liquidation → payout on testnet has also not been exercised yet. That requires pushing a Sepolia Aave position below health factor 1.

---

## 7. THE AMBITION

![About eight minutes, end to end](https://raw.githubusercontent.com/artomily/aniwere/main/docs/buidl/08-latency.jpg)

The bet: protection should settle from evidence, not from permission.

- **Near term:** first full on-chain probe → snapshot → cover → liquidation → payout cycle on testnet; risk-priced premiums instead of a flat 2%.
- **Mid term:** multiple source chains (Arbitrum, Base, Polygon) underwritten by one capital pool on Creditcoin, and conservative yield on idle underwriter capital to lower premiums.
- **Long term:** prevention instead of reimbursement through Attestcoin Writability, topping up a position *before* it liquidates.

Your position lives anywhere. Your protection lives here.

---

## DISCLAIMER

The live web app runs in a labelled sample mode for position and policy figures until a wallet with a proven snapshot connects. Block heights and attestation status are always real. Contracts are deployed on testnet, but a complete proof → payout cycle has not been exercised end-to-end on-chain yet (see "Where we are now").

Attestation measurably runs 20–54 blocks *ahead of* Ethereum's finalized checkpoint, so a proof can pass for a block that is theoretically still reorgable. End to end the path takes about 8 minutes, and we never describe it as instant.

*(If the form has a character cap, trim Architecture or Ambition first. Problem, Solution, and Where We Are Now are the load-bearing sections.)*

---

## Testnet Contract Addresses

| Contract | Chain | Address |
|---|---|---|
| AniWereProbe | Ethereum Sepolia | [`0xa4a3eB202d89066909c5FDdEAdfDf79Fa3da025a`](https://sepolia.etherscan.io/address/0xa4a3eB202d89066909c5FDdEAdfDf79Fa3da025a) |
| AniWereASC | Creditcoin CC3 Testnet | [`0x1A5D249A8e711E2288AdD7c01e31Eb7FFB05D97E`](https://creditcoin-testnet.blockscout.com/address/0x1A5D249A8e711E2288AdD7c01e31Eb7FFB05D97E) |
| CoverVault | Creditcoin CC3 Testnet | [`0xBBCCd15B6bf49d7df3F9b7685455c25a2b4e085e`](https://creditcoin-testnet.blockscout.com/address/0xBBCCd15B6bf49d7df3F9b7685455c25a2b4e085e) |
| AttestcoinAdapter | Creditcoin CC3 Testnet | [`0x45dd5B746490f93c90Ea5c21212c25C72160BEe5`](https://creditcoin-testnet.blockscout.com/address/0x45dd5B746490f93c90Ea5c21212c25C72160BEe5) |

- Probe deploy tx: [`0xcc83…a0e9`](https://sepolia.etherscan.io/tx/0xcc83fcc2216561c3329a0bca6779d033340bb75e1d23c2f48b6c344164cca0e9)
- ASC deploy tx (also creates the vault): [`0x8f79…c16e`](https://creditcoin-testnet.blockscout.com/tx/0x8f7926e198a596cabe4acebadda457d9e615ddc46812f8779f6d88d40653c16e)
- Vault funded with 500 CTC: [`0x2e43…04c1`](https://creditcoin-testnet.blockscout.com/tx/0x2e43e26e06d48b2b488d931f20b78951c1237f6b4b9e583755b06eb4736104c1)
- Chain IDs: Sepolia `11155111` · Creditcoin CC3 Testnet `102031` · Attestcoin chain key for Sepolia: `1`

## Links

- **GitHub:** https://github.com/artomily/aniwere
- **Live demo:** https://aniwere.vercel.app
- **Whitepaper (PDF):** https://github.com/artomily/aniwere/blob/main/docs/pdf/AniWere-whitepaper.pdf
- **Demo video:** *(YouTube URL — to be added after upload)*
- **Docs:** [README](https://github.com/artomily/aniwere#readme) (overview) · [ATTESTCOIN.md](https://github.com/artomily/aniwere/blob/main/docs/ATTESTCOIN.md) (live protocol validation notes) · [DEMO.md](https://github.com/artomily/aniwere/blob/main/docs/DEMO.md) (deploy + demo runbook) · [PRD.md](https://github.com/artomily/aniwere/blob/main/docs/PRD.md) (product spec)

## Team

Solo developer — Rakyavara Artomily (Fullstack Developer)
