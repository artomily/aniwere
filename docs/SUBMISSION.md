# Submission DoraHacks — BUIDL CTC 2026 Fall

**Deadline: 13 September 2026, 23:59 ET.** Diperpanjang dari 6 September.
Form: <https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail> → **Submit BUIDL**

Halaman ini isinya jawaban siap tempel untuk tiap field yang benar-benar ada di
form. Field-nya disalin dari halaman hackathon pada 8 September 2026, bukan
ditebak dari hackathon lain.

---

## Yang memblokir submit

Tinggal satu, dan ini bukan soal kualitas, tapi soal apakah submission-nya
memenuhi syarat.

| # | Blocker | Kenapa fatal | Perbaikan |
|---|---|---|---|
| 1 | **Belum di-deploy ke testnet** | Panitia menulis "Must be deployed on a testnet" sebagai project requirement, bukan saran. Tanpa ini submission bisa dianggap tidak memenuhi syarat berapa pun bagusnya kode | Runbook 90 menit di [DEMO.md](DEMO.md). Butuh wallet + faucet |

Sudah beres: repo public, situs live di <https://aniwere.vercel.app>, video
(`video/out/aniwere-demo.mp4`, tinggal upload), README bahasa Inggris,
whitepaper PDF, dan logo.

---

## Project Information

### Project Name

```
AniWere
```

### One-liner / Tagline

Field ringkas di profil BUIDL DoraHacks. 93 karakter — aman untuk batas pendek
mana pun.

```
Liquidation cover for Aave positions on Ethereum, paid on Creditcoin by cryptographic proof.
```

Kalau ada field tagline terpisah yang lebih pendek lagi, pakai slogan produk:

```
Your position lives anywhere. Your protection lives here.
```

### Vision

~230 karakter. Batas pasti field ini belum saya verifikasi dari form — kalau
terpotong, buang kalimat kedua.

```
Every lending position, on any chain, should be insurable without trusting anyone. AniWere pays out when a liquidation is proven, not when a committee agrees — starting with Aave on Ethereum, settled on Creditcoin through Attestcoin.
```

Kenapa dua kalimat ini: kalimat pertama adalah ambisi (multi-chain, tanpa
kepercayaan), kalimat kedua mengikatnya ke apa yang sudah dibangun hari ini.
Juri membaca vision tanpa bukti sebagai janji kosong; yang ini langsung
menunjuk implementasinya.

### Project Sector

```
DeFi
```

### Project Description

> Sekitar 1.100 karakter. Kalau form memotong, buang paragraf terakhir duluan.

```
AniWere is parametric liquidation cover for Aave V3 positions, sold on Creditcoin
and settled from cryptographic proof rather than from a claims process.

A user holds a leveraged lending position on Ethereum. If it gets liquidated, they
absorb the liquidation penalty with no recourse. Existing cover either requires a
claims committee, trusts a centralized oracle, or requires bridging assets to
wherever the cover lives. All three replace one trust assumption with another.

AniWere removes the claim entirely. Cover is bought on Creditcoin. The position
stays on Ethereum and is never bridged, wrapped, or mirrored. When Aave's own
LiquidationCall event fires on Ethereum, that event is proven on Creditcoin through
the Attestcoin Protocol, and the payout is released inside the same transaction that
verifies the proof. Nobody approves the claim. There is no oracle to bribe and no
committee to lobby.

The design commits to this hard: the contracts have no owner, no pause, no upgrade
path, and no withdrawal function for the team. CoverVault is deployed by the ASC
inside its own constructor so the vault's controller address is immutable and cannot
be pointed elsewhere later. We cannot stop a valid payout, and we cannot take the
capital. That is verifiable in the source, not a promise.

What it does not do: it pays after a liquidation, it does not prevent one. Prevention
needs Attestcoin Writability, which is outside this hackathon's scope.
```

### Attestcoin Protocol Integration Summary

> **Field paling menentukan.** Panitia menyebut "Depth of Attestcoin Protocol
> utilization" sebagai salah satu kriteria skor inti. Ini ditulis untuk pembaca
> yang tahu persis apa yang bisa dan tidak bisa dilakukan protokolnya.

```
Attestcoin is not a side integration here — it is the only reason the product can
exist without a bridge or an oracle.

WHAT WE PROVE, AND THE CONSTRAINT WE DESIGNED AROUND

Attestcoin Readability proves that a transaction occurred in a source-chain block.
It proves events in receipt logs. It cannot prove storage slots.

That constraint is load-bearing for us. Aave exposes position health through
getUserAccountData(), a view call against storage, which leaves no trace in any
receipt log and therefore cannot be proven directly. Rather than recompute health
factor from our own price source — which would reintroduce exactly the oracle trust
we set out to remove — we use a prober pattern: AniWereProbe on Sepolia calls Aave
and emits the result as an event, and that event is what gets proven. The health
factor that reaches Creditcoin is Aave's own number, unmodified.

The liquidation path needs no prober. Aave's LiquidationCall is already an event, so
we prove Aave's emission directly.

HOW VERIFICATION RUNS

An off-chain worker watches Sepolia, waits for the source block to be attested on
Creditcoin, requests a continuity proof and a merkle proof from the Proof Builder,
and submits them. The worker is a courier and is trusted with nothing: submission is
permissionless, payouts always go to the policy holder rather than the sender, and a
holder can submit their own claim from the web UI if our worker is down.

Verification happens synchronously in the Block Prover Precompile at 0x...0FD2, so
proof checking and payout occur in a single Creditcoin transaction — either both
happen or neither does. The precompile returns a bool and not the log, so the
receipt is decoded on the Creditcoin side by our AttestcoinAdapter.

TWO DEFENSES WORTH NAMING

Proving that a transaction happened is not the same as proving it is trustworthy.
_findLog matches BOTH the emitting contract address AND topic0. Matching topic0
alone would let anyone deploy a look-alike contract on Sepolia, emit a fake
LiquidationCall, and drain the vault with a technically valid proof. This is covered
by test_RejectsLiquidationFromWrongEmitter.

Our proofId binds chainKey + block height + merkle root + transaction contents. An
earlier version keyed on transaction hash alone, which let the same transaction be
replayed through a different block.

All Attestcoin-specific uncertainty is isolated in AttestcoinAdapter. AniWereASC has
no knowledge of the precompile, so if the protocol's surface shifts, one adapter file
changes and the business logic does not.

HONEST LIMITATION

We measured attestation lag three times (27 Aug, 4 Sep, 8 Sep). It consistently runs
25-54 blocks AHEAD of Ethereum's finalized checkpoint. Attestation does not wait for
finality, so a proof can pass for a block that is theoretically still reorgable. That
depth is far outside any plausible Ethereum reorg, but "far outside" is not
"impossible", and we would rather state it than hide behind the word finality. End to
end the path takes about 8 minutes. We never call it real-time.
```

### GitHub Repository URL

```
https://github.com/artomily/aniwere
```

✅ Public — terverifikasi bisa dibuka tanpa login (13 September).

### Live Demo URL

Kalau form punya field website/demo, atau untuk disebut di Project Description:

```
https://aniwere.vercel.app
```

Tanpa kontrak ter-deploy, situs ini berjalan dalam mode contoh yang diberi
label. Yang tetap nyata: tinggi blok di header dan panel attestation di
`/proof`, dibaca live dari Sepolia dan Proof Builder di tiap request.
Setelah deploy, isi `NEXT_PUBLIC_ASC_ADDRESS` dan `NEXT_PUBLIC_PROBE_ADDRESS`
di Environment Variables Vercel lalu redeploy supaya pindah ke mode live.

Jangan biarkan env var server (`SEPOLIA_RPC_URL`, `CREDITCOIN_RPC_URL`,
`PROOF_BUILDER_URL`) terisi string kosong di Vercel. Sejak commit 47cf7ac
kode sudah jatuh ke default untuk nilai kosong, tapi lebih bersih dihapus
saja kalau tidak dipakai.

### Project Deck or Whitepaper (PDF URL)

Sudah dibuat: **`docs/pdf/AniWere-whitepaper.pdf`** — 10 halaman, 566 KB, hasil
render README bahasa Inggris lengkap dengan diagram arsitektur.

Field-nya minta **URL**, jadi setelah repo dijadikan public, tautannya:

```
https://github.com/artomily/aniwere/blob/main/docs/pdf/AniWere-whitepaper.pdf
```

Regenerate setelah README berubah:

```bash
node /path/ke/build.mjs && \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --no-pdf-header-footer --print-to-pdf=docs/pdf/AniWere-whitepaper.pdf file://.../readme.html
```

### Prototype Demo Video URL

Sudah dirender: **`video/out/aniwere-demo.mp4`** — 97 detik, 1920×1080.

Unggah ke YouTube **public atau unlisted** — jangan private, juri tidak bisa
membukanya — lalu tempel URL-nya di sini.

Video ini motion graphics bergaya iklan, dibangun dengan Remotion, dan sudah
memuat bukti nyata: screenshot UI asli dan output `forge test` yang sebenarnya.
Cara membangun ulang atau mengubah narasinya ada di [`video/README.md`](../video/README.md).

**Yang belum dicakup video ini:** rekaman produk berjalan. Field-nya bernama
*Prototype* Demo Video, jadi setelah kontraknya di-deploy, rekam screencast
pendek pakai [VIDEO-SCRIPT.md](VIDEO-SCRIPT.md) dan gabungkan — atau unggah
terpisah dan sebut keduanya di Project Description. DoraHacks mengizinkan edit
setelah submit, jadi ini bisa menyusul.

### Project Logo

Unggah **`public/aniwere-mark.png`** — emblem saja, 512×512, latar transparan.
Slot logo DoraHacks berbentuk kotak kecil, dan versi dengan wordmark
(`public/aniwerelogo.png`) jadi terlalu kecil untuk terbaca di sana. Tulisannya
juga gelap, jadi hilang kalau ditampilkan di atas latar gelap.

---

## Team Information

Saya sengaja tidak mengisi bagian ini. Isinya data pribadi dan legal — nama sesuai
identitas, kewarganegaraan, domisili — dan menebaknya melanggar poin Terms &
Conditions yang kamu setujui saat submit: *"All submitted information is accurate
and truthful."*

Per anggota tim: First & Last Name · Email · Telegram (opsional) · X (opsional) ·
LinkedIn (opsional) · Resume PDF (opsional) · Short Bio · Role · Country of
Residence · Country of Citizenship

Team Size minimum 1 — solo diperbolehkan.

### Draft yang bisa diisi dari repo

Seluruh 16 commit di repo ini dari satu author (`artomily`), jadi draft di bawah
mengasumsikan tim solo. Isinya hanya hal yang bisa diverifikasi dari repo.

**Team Size**

```
1
```

**Role**

```
Full-stack smart contract engineer
```

**Short Bio** (~390 karakter)

```
Solo builder of AniWere. Wrote both Foundry projects — the Sepolia prober and the Creditcoin control plane with its Attestcoin adapter — plus the off-chain proof worker (TypeScript + viem) and the Next.js frontend. Validated the Attestcoin verification path live against the Block Prover precompile before writing product code, and documented what it proves and what it cannot.
```

Bio ini sengaja hanya menyebut apa yang dibangun di hackathon ini. Pengalaman
sebelumnya, pekerjaan, atau pendidikan belum ada di draft — tambahkan satu
kalimat di awal kalau mau.

### Masih harus kamu isi sendiri

| Field | Status |
|---|---|
| First & Last Name | Sesuai identitas |
| Email | Dari profil DoraHacks-mu |
| Country of Residence | — |
| Country of Citizenship | — |
| Telegram / X / LinkedIn / Resume | Opsional |

---

## Urutan sebelum menekan Submit

1. [ ] Repo dijadikan **public** — verifikasi dari incognito
2. [ ] Deploy ke testnet ([DEMO.md](DEMO.md) langkah 1–2)
3. [ ] Alamat kontrak + tx hash masuk README, ganti baris "belum di-deploy"
4. [ ] `.env` tidak ter-commit — `git status` bersih
5. [ ] Video diunggah, buka linknya dari incognito
6. [ ] README diterjemahkan ke Inggris
7. [ ] Diagram PNG disematkan di README
8. [ ] Tempel semua field dari halaman ini
9. [ ] Submit — masih bisa diedit sampai deadline

Poin 9 penting: **DoraHacks mengizinkan edit setelah submit.** Jadi submit lebih
awal dengan apa yang sudah ada, lalu perbaiki sampai 13 September. Jangan tahan
submission demi kesempurnaan dan malah kehabisan waktu.
