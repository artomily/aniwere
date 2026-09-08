# Skrip Video Demo — AniWere

**Target 4:30.** Narasi bahasa Inggris karena juri Creditcoin dan Credit Labs
berbahasa Inggris dan UI-nya sudah Inggris. Arahan panggung bahasa Indonesia.

Unggah ke YouTube **public atau unlisted**. Jangan private.

Kecepatan baca ±150 kata/menit. Total narasi di bawah ±680 kata. Kalau kamu
membaca lebih cepat dari itu, tambahkan jeda di pergantian segmen, jangan
menambah kalimat.

---

## Sebelum merekam

**Siapkan di tab terpisah, urut kiri ke kanan.** Berpindah tab jauh lebih rapi
daripada mengetik URL saat rekaman.

1. `localhost:3000` — Position & cover
2. `localhost:3000/proof` — Proof explorer
3. `localhost:3000/cover` — Buy cover
4. Etherscan Sepolia — tx probe
5. Creditcoin explorer — tx submit
6. Terminal, sudah di `worker/`, font diperbesar

**Cek sebelum tombol rekam:**

- [ ] Zoom browser 110–125%. Angka kecil tidak terbaca setelah kompresi YouTube
- [ ] Notifikasi OS dimatikan
- [ ] Bookmark bar disembunyikan
- [ ] Terminal: `clear`, dan siapkan perintah di history supaya cukup ↑
- [ ] Kalau merekam mode contoh: **jangan sembunyikan banner "Sample data"**.
      Juri yang menemukan sendiri bahwa angkanya karangan jauh lebih merusak
      daripada kamu yang menyebutkannya lebih dulu

**Jangan pernah ucapkan "real-time".** Yang benar: *about eight minutes after
the source block is attested.*

---

## Segmen 1 — Masalah · 0:00–0:35

**Layar:** halaman Position, health ring 1.42 terlihat penuh.

> Your lending position lives on Ethereum. If it gets liquidated, you eat the
> penalty, and there is no recourse.
>
> Cover exists, but it always costs you something. A claims committee that decides
> whether you get paid. A centralized oracle you have to trust. Or bridging your
> assets to wherever the cover lives.
>
> AniWere removes all three. You buy cover on Creditcoin. Your position never
> leaves Ethereum. And when a liquidation happens, nobody approves the claim —
> because the claim proves itself.

---

## Segmen 2 — Apa yang dibuktikan · 0:35–1:25

**Layar:** `docs/diagrams/1-arsitektur.png` full screen.

> Here is the constraint that shaped this entire design.
>
> Attestcoin proves that a transaction happened in a source-chain block. It proves
> events in receipt logs. It cannot prove storage slots.
>
> That matters, because Aave exposes position health through getUserAccountData —
> a view call against storage. It leaves no trace in any receipt log, so it cannot
> be proven directly.
>
> We could have recomputed health factor from our own price feed. We deliberately
> did not, because that puts an oracle right back in the middle of the thing we
> built to remove one.

**Arahan:** sorot kotak `AniWereProbe` di diagram.

> Instead: a prober contract on Sepolia calls Aave and emits the result as an
> event. That event is what we prove. The number that reaches Creditcoin is Aave's
> own accounting, unmodified.
>
> Liquidations need no prober. Aave's LiquidationCall is already an event, so we
> prove Aave's emission directly.

---

## Segmen 3 — Probe dan snapshot · 1:25–2:15

**Layar:** halaman Position → klik **Probe my position** → Etherscan.

> Let me probe a real Aave position on Sepolia.

**Arahan:** tunggu konfirmasi, lalu pindah ke tab Etherscan, sorot event
`PositionProbedForCover`.

> There is the event on Ethereum, with the real position numbers in it.
>
> Now the worker takes over. It waits for that block to be attested on Creditcoin,
> then asks the Proof Builder for two proofs: a continuity proof, that the block
> really is part of the attested Ethereum chain, and a merkle proof, that this
> transaction really is inside that block.

**Arahan:** terminal, `npm run worker -- submit-position <TX>`.

> This wait is about eight minutes. I am cutting it here — nothing is skipped, only
> the waiting.

**Arahan:** potong ke hasil sukses, pindah ke Creditcoin explorer.

> An Aave position from Ethereum is now stored on Creditcoin, proven
> cryptographically. No bridge. No oracle.

---

## Segmen 4 — Beli cover · 2:15–2:45

**Layar:** halaman `/cover`.

> Cover is priced against that verified snapshot. Two percent flat, thirty days.

**Arahan:** sorot panel **Before you can buy**.

> Four conditions, every one of them enforced by the contract, not by our
> interface. The snapshot has to be under an hour old. Health factor has to be
> above 1.05 — you cannot insure a fire that has already started. Duration inside
> the allowed range. And the vault has to hold enough free capital to pay this in
> full.
>
> That last one is a solvency guard. The contract will not sell cover it cannot
> pay.

---

## Segmen 5 — Likuidasi dan payout · 2:45–3:30

**Layar:** Etherscan `LiquidationCall` → terminal worker → Proof Explorer.

> Now the position gets liquidated. This is Aave's own event, on Ethereum. We did
> not emit it.

**Arahan:** worker mendeteksi, potong waktu tunggu, tampilkan `ClaimSettled`.

> The worker proves it, and the payout lands.

**Arahan:** buka `/proof`, scroll pelan melewati enam langkah.

> Every stage is here and every one links out to a block explorer. Source event.
> Emitter check. Attestation. Continuity proof. Merkle proof. Payout.
>
> Verification and payout happen inside a single Creditcoin transaction. The proof
> is checked and the money moves together, or neither happens.

---

## Segmen 6 — Kenapa tidak perlu percaya kami · 3:30–4:05

**Layar:** langkah 2 Proof Explorer (**Emitter check**), lalu terminal `forge test`.

> Proving a transaction happened is not the same as proving it deserves a payout.
>
> We match both the emitting contract address and topic0. Without the emitter
> check, anyone could deploy a look-alike contract on Sepolia, emit a fake
> LiquidationCall, and drain the vault with a technically valid proof.

**Arahan:** jalankan `forge test`, sorot `test_RejectsLiquidationFromWrongEmitter`.

> That is a test, not a comment.

**Arahan:** pindah ke panel **What cannot happen** di halaman Position.

> There is no owner. No pause. No upgrade path. No withdrawal function for us. The
> vault is deployed by the contract itself, inside its constructor, so its
> controller address is immutable.
>
> We cannot stop a valid payout, and we cannot take the capital. Read the source.

---

## Segmen 7 — Keterbatasan dan roadmap · 4:05–4:30

**Layar:** panel Attestation status di `/proof`, angka terbaca jelas.

> One thing we will not paper over. Attestation runs ahead of Ethereum's finalized
> checkpoint — we measured it three times, consistently twenty-five to fifty-plus
> blocks ahead. So a proof can pass for a block that is theoretically still
> reorgable. That depth is far outside any plausible reorg, but far outside is not
> impossible, and we would rather say it than hide behind the word finality.
>
> End to end, about eight minutes. We do not call it real-time.
>
> Next: more source chains onto one capital pool, and risk-priced premiums instead
> of a flat rate.
>
> AniWere. Your position lives anywhere. Your protection lives here.

---

## Kalau sampai hari rekaman tetap belum ter-deploy

Rekam tetap, jangan batal. Yang berubah hanya Segmen 3 dan 5 — sisanya utuh.

| Segmen | Ganti jadi |
|---|---|
| 3 | Biarkan banner "Sample data" terlihat. Katakan: *"Contracts are not deployed to testnet yet, so these position figures are illustrative — I will show you what is real in a moment."* Lalu pindah ke terminal dan jalankan `npm run worker -- status`, yang memanggil Sepolia, Proof Builder, dan Creditcoin sungguhan |
| 5 | Ganti demo payout dengan `forge test` — 12 test hijau, sorot happy path dan penolakan emitter. Katakan terus terang: *"The claim path is proven by tests and by a successful precompile call, not yet by a liquidation on testnet."* |

Panel Attestation di `/proof` tetap membaca jaringan asli tanpa wallet, jadi
Segmen 7 tidak berubah sama sekali dan tetap jadi penutup terkuat.

Menyebut batas sendiri lebih menguntungkan daripada ketahuan. Yang merusak nilai
bukan "belum di-deploy" — tapi juri yang menemukan angka karangan setelah kamu
menyebutnya nyata.
