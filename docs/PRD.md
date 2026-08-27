# AniWere — Product Requirements Document v2.0

**Hackathon:** BUIDL CTC 2026 Fall — BUIDL For The Real World
**Track:** DeFi
**Wajib:** Attestcoin Protocol (Readability)
**Deadline:** 6 September 2026

---

## 1. Overview

**AniWere** adalah *parametric liquidation cover* untuk posisi lending cross-chain, berjalan di Creditcoin.

User membeli proteksi di Creditcoin untuk posisi Aave V3 mereka di Ethereum. Kalau posisi itu benar-benar kena likuidasi, event `LiquidationCall` dari Ethereum dibuktikan secara kriptografis lewat Attestcoin Protocol, dan payout langsung cair dari Attestcoin Smart Contract. Tanpa klaim manual, tanpa adjuster, tanpa oracle terpusat, tanpa memindahkan aset lewat bridge.

Di atas mekanisme itu ada **Position Health Dashboard**: user bisa "probe" posisi Aave mereka kapan saja dan mendapat snapshot collateral / debt / health factor yang terverifikasi di Creditcoin, lengkap dengan bukti proof-nya.

**Tagline:** *Your position lives anywhere. Your protection lives here.*

---

## 2. Problem Statement

### 2.1 Masalah user

Pengguna DeFi yang punya posisi leverage menghadapi tiga hal sekaligus:

- **Likuidasi datang tiba-tiba.** Health factor bisa jatuh dalam hitungan menit saat volatilitas tinggi. Kerugian dari liquidation penalty (5–10% di Aave V3) permanen dan tidak bisa dinegosiasi.
- **Proteksi yang ada hari ini butuh trust.** Cover protocol tradisional mengandalkan komite klaim, voting DAO, atau oracle terpusat untuk memutuskan apakah suatu event benar terjadi. Itu memperkenalkan delay, subjektivitas, dan satu titik yang bisa dikorup.
- **Proteksi tidak bisa lintas chain.** Kalau posisimu di Ethereum, proteksimu harus di Ethereum juga. Mau pindahkan modal proteksi ke chain lain? Bridge dulu: mahal, lambat, dan menambah surface risiko.

### 2.2 Kenapa ini masalah *infrastruktur*, bukan masalah UI

Dashboard monitoring tidak butuh trustless. Backend biasa dengan RPC sudah cukup untuk menampilkan angka.

Yang butuh trustless adalah **hal yang bertindak atas data itu ketika ada uang bergerak**. Kalau sebuah kontrak akan membayar $5.000 karena "katanya kamu kena likuidasi", pertanyaan siapa yang berhak bilang itu terjadi jadi pertanyaan keamanan, bukan pertanyaan produk.

Di situlah Attestcoin masuk, dan di situlah AniWere bukan sekadar "oracle biasa dengan UI bagus".

---

## 3. Kenapa Attestcoin, dan Kenapa Ini Bukan Oracle Biasa

Ini bagian yang harus dimengerti judge dalam 30 detik.

| | Oracle terpusat / bridge | AniWere di atas Attestcoin |
|---|---|---|
| Siapa yang bilang likuidasi terjadi | Satu operator, atau komite klaim | Konsensus attestor Creditcoin atas block Ethereum |
| Bisa dipalsukan? | Ya, kalau operator dikompromikan | Tidak, tanpa memalsukan Merkle root block Ethereum |
| Delay klaim | Jam sampai minggu | Satu block Creditcoin setelah attestation |
| Aset user pindah chain? | Sering harus bridge | Tidak sama sekali |

Mekanisme konkretnya: Attestcoin Readability membuktikan bahwa **sebuah transaksi benar-benar terjadi** di block source chain, lewat dua proof yang bekerja bersama.

1. **Continuity proof** — membuktikan block yang dimaksud benar bagian dari rantai Ethereum yang sudah ter-attest di Creditcoin.
2. **Merkle proof** — membuktikan transaksi tertentu memang termasuk dalam block tersebut.

Kedua proof itu diverifikasi **sinkron** oleh Block Prover Precompile di dalam eksekusi kontrak, jadi verifikasi dan business logic (payout) terjadi dalam satu transaksi Creditcoin yang sama. Bukan callback, bukan menunggu.

**Konsekuensi desain yang harus dipatuhi:** yang bisa dibuktikan adalah **event di receipt log sebuah transaksi**, bukan storage slot. Ini menentukan seluruh arsitektur di Bagian 6.

---

## 4. Target Users

| Persona | Deskripsi | Pain point | Kenapa AniWere |
|---|---|---|---|
| **Leveraged Borrower** | Supply ETH, borrow stablecoin di Aave, HF 1.3–1.8 | Liquidation penalty permanen | Beli cover, payout otomatis kalau kena |
| **Risk-aware Investor** | Modal besar, konservatif | Tidak percaya klaim manual / komite | Payout ditentukan kriptografi, bukan orang |
| **Multi-chain Power User** | Posisi tersebar di beberapa chain | Proteksi terkunci per chain | Satu control plane di Creditcoin |

**Anti-persona (jangan didesain untuknya):** trader yang cuma mau lihat angka. Mereka sudah punya DeBank. Kita bukan dashboard.

---

## 5. Features

### 5.1 MVP — wajib untuk submission

| # | Feature | Deskripsi | Prioritas |
|---|---|---|---|
| 1 | Wallet Connection | Connect ke Creditcoin Testnet + Ethereum Sepolia | Must |
| 2 | Position Probe | Snapshot posisi Aave V3 (collateral, debt, HF) diverifikasi ke Creditcoin via Attestcoin | Must |
| 3 | Verified Health View | Tampilkan posisi ter-attest + block number + tx hash proof | Must |
| 4 | Buy Cover | Bayar premi di Creditcoin, dapat policy on-chain terikat address + posisi | Must |
| 5 | Liquidation Proof & Payout | Buktikan event `LiquidationCall` dari Sepolia, payout otomatis di ASC | **Must — ini bintang utamanya** |
| 6 | Proof Explorer | Tampilkan status proof: block attested, continuity verified, merkle verified, executed | Must |
| 7 | Health Alert | Flag di UI kalau HF snapshot terakhir di bawah threshold policy | Must |

### 5.2 Nice-to-have (kalau waktu masih ada)

- Premi dinamis berdasarkan health factor saat pembelian cover
- Batch probe multi-posisi dalam satu continuity proof (limit protokol: 10 query per proof)
- Historical health chart dari snapshot yang tersimpan on-chain
- Cover pool dengan LP deposit (underwriter side) yang sesungguhnya

### 5.3 Roadmap (post-hackathon)

Empat item, masing-masing lahir dari keterbatasan MVP yang kita akui sendiri. Urutan ini juga urutan penyampaian di pitch.

1. **Multi source chain** (Arbitrum, Base, Polygon)
   *Sebabnya:* satu pool modal yang menjamin banyak chain adalah alasan Creditcoin dipakai sejak awal. MVP satu chain belum menunjukkan itu.

2. **Capital efficiency — deploy idle capital ke yield strategy konservatif**
   *Sebabnya:* modal underwriter menganggur sepanjang periode polis. Opportunity cost itu jadi lantai harga yang harus dibayar user lewat premi. Kalau modal idle menghasilkan sendiri, lantai harganya turun dan premi jadi lebih murah.
   *Catatan risiko:* menaruh modal klaim di protokol lain menambah risiko baru. Kalau protokol itu kena exploit, dana klaim hilang justru saat paling dibutuhkan. Karena itu strateginya harus konservatif dan dibatasi porsinya.

3. **Risk-priced premium**
   *Sebabnya:* flat rate tidak adil untuk posisi konservatif dan terlalu murah untuk posisi agresif.

4. **Automated protection via Attestcoin Writability**
   *Sebabnya:* mencegah lebih baik daripada mengganti. Ini juga menunjukkan kita tahu Attestcoin punya sisi Writability dan sengaja tidak memakainya sekarang.

---

## 6. Technical Architecture

### 6.1 Kendala inti yang membentuk seluruh desain

> **Attestcoin Readability membuktikan event di receipt log, bukan storage slot.**

Artinya `IPool.getUserAccountData(user)` — yang mengembalikan health factor — **tidak bisa** dibuktikan langsung, karena itu view call terhadap storage dan tidak meninggalkan jejak di receipt log mana pun.

Solusinya: ubah state jadi event lewat **prober contract**.

### 6.2 Komponen

```
┌────────────────────── ETHEREUM SEPOLIA ──────────────────────┐
│                                                              │
│   Aave V3 Pool ──────────────► LiquidationCall (event asli)  │
│        ▲                                                     │
│        │ staticcall                                          │
│   AniWereProbe.sol                                           │
│   probe(user) ───────────────► PositionProbed (event kita)   │
│                                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │  receipt logs
                               ▼
                   ┌───────────────────────┐
                   │  Off-chain Worker     │
                   │  1. filter event      │
                   │  2. tunggu attestation│
                   │  3. Proof Builder     │
                   │     → continuity      │
                   │     → merkle          │
                   └───────────┬───────────┘
                               │ submitProof(tx, proofs)
                               ▼
┌───────────────────────── CREDITCOIN ─────────────────────────┐
│                                                              │
│   AniWereASC.sol                                             │
│     ├─ Block Prover Precompile ──► verifikasi sinkron        │
│     ├─ decode event → simpan snapshot / trigger payout       │
│     └─ business logic: policy, premi, threshold, payout      │
│                                                              │
│   CoverVault.sol  ── memegang premi & membayar klaim         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Source chain: `AniWereProbe.sol` (Sepolia)

Satu kontrak, dua event, logic seminimal mungkin. Ini mengikuti best practice Attestcoin: satu kontrak source chain per dApp, event yang spesifik dan tidak ambigu, semua data yang dibutuhkan ikut di dalam event.

**Catatan desain penting:**

- `probe()` **permissionless**. Siapa pun bisa memanggilnya untuk address mana pun. Ini menghilangkan trust assumption terhadap tim AniWere sebagai operator. Kita bukan gatekeeper data.
- Nama event sengaja spesifik (`...ForCover`) dan tidak memakai event umum seperti `Transfer`, sesuai anjuran dokumentasi supaya worker mudah memfilter dan tidak ada ambiguitas.
- Harga aset **tidak** dihitung ulang di manapun. `getUserAccountData` sudah memakai oracle Aave sendiri, jadi health factor yang kita buktikan identik dengan yang dipakai Aave untuk memutuskan likuidasi. **Jangan pernah** menghitung ulang HF di Creditcoin dengan sumber harga lain — itu langsung mengembalikan trust assumption yang mau kita hilangkan.

### 6.4 Untuk `LiquidationCall`: dua opsi

**Opsi A — buktikan event Aave langsung.** `LiquidationCall` adalah event asli Aave V3 Pool dengan receipt log yang sah, jadi secara teknis bisa di-Merkle-prove apa adanya. Paling meyakinkan untuk judge karena ini event protokol nyata, bukan buatan kita.

**Opsi B — relay lewat prober.** Worker mendeteksi `LiquidationCall`, lalu memanggil fungsi di `AniWereProbe` yang meng-emit ulang sebagai `LiquidationDetectedForCover`. Lebih patuh pada best practice "satu kontrak source chain", tapi menambah satu hop dan satu asumsi kecil.

**Rekomendasi:** implementasi **Opsi A** sebagai jalur utama, sediakan Opsi B sebagai fallback kalau parsing event Aave ternyata merepotkan di ASC. Sebutkan trade-off ini di README — judge akan menghargai bahwa kamu sadar akan best practice dan punya alasan sadar untuk menyimpang.

### 6.5 Creditcoin: `AniWereASC.sol` + `CoverVault.sol`

Semua business logic tinggal di sini, sesuai filosofi Attestcoin bahwa data dan logic sebaiknya terkumpul di Creditcoin agar likuiditas dan informasi dari banyak chain bisa dipakai di satu tempat.

Alur di dalam `submitLiquidationClaim`, semuanya dalam satu transaksi:

1. Panggil Block Prover Precompile dengan continuity proof + merkle proof.
2. Precompile mengembalikan transaksi terverifikasi. Kalau gagal, revert.
3. Decode receipt log, cari signature `LiquidationCall`, ekstrak `user`.
4. Cek policy: ada, aktif, belum diklaim, `expiresAt` belum lewat.
5. Transfer payout dari `CoverVault` ke holder. Tandai `claimed = true`.

### 6.6 Model modal: siapa yang membayar klaim

Premi saja tidak akan pernah cukup. Kalau user bayar premi 2% untuk cover 100 CTC, lalu kena likuidasi, vault harus membayar 100 CTC. Sisanya dari mana?

| Sumber dana | Siapa | Motivasi |
|---|---|---|
| Premi | User pembeli cover | Membeli proteksi |
| Modal | Underwriter | Mengambil premi kalau tidak ada klaim |

Underwriter menanggung risiko sebenarnya. Untuk MVP, sisi ini **disederhanakan**: `depositCapital()` permissionless, vault di-fund manual sebelum demo. Ekonomi underwriting yang sesungguhnya ada di roadmap.

**Solvency guard:** total cover aktif tidak boleh melebihi modal bebas di vault. Beberapa baris kode, tapi membuat kontrak secara matematis tidak bisa insolvent.

### 6.7 No privileged access

Ini keputusan desain, bukan detail implementasi. Tulis di README.

- `CoverVault` di-deploy **oleh** `AniWereASC` di dalam constructor-nya, jadi alamat ASC bersifat `immutable` di vault dan tidak ada setter sama sekali.
- Tidak ada `owner`, tidak ada `onlyOwner`, tidak ada `pause`, tidak ada fungsi withdraw untuk tim.
- Dana hanya bisa keluar lewat dua jalan: payout yang dipicu proof valid, atau penarikan underwriter atas modal yang tidak terkunci.
- Tim AniWere secara teknis tidak bisa menyentuh dana siapa pun.

Kalau ada juri bertanya "kenapa saya harus percaya kalian?", jawabannya: tidak perlu, dan itu justru intinya.

### 6.8 Off-chain Worker

Node.js service dengan tiga job:

- **Event listener** — `eth_getLogs` pada `AniWereProbe` dan Aave Pool di Sepolia.
- **Attestation waiter** — polling Creditcoin sampai block sumber ter-attest. Ini bagian yang paling sering bikin demo macet, jadi perlu retry dan logging yang jelas.
- **Proof submitter** — generate proof lewat Proof Builder / Attestcoin SDK, submit ke ASC.

Worker **tidak dipercaya untuk apa pun**. Dia cuma kurir. Kalau dia mengirim proof palsu, precompile menolak. Ini poin yang layak ditekankan di pitch.

### 6.9 Frontend

Next.js + wagmi + viem. Dua chain config (Sepolia + Creditcoin Testnet). Tiga halaman: Position, Cover, Proof Explorer.

**Proof Explorer adalah halaman terpenting untuk penilaian.** Tampilkan secara eksplisit: source tx hash → block number → status attestation → continuity proof ✓ → merkle proof ✓ → Creditcoin tx hash. Judge harus bisa melihat rantai bukti itu tanpa perlu penjelasan lisan.

---

## 7. Ekspektasi Latency (jangan overclaim)

Hindari kata "real-time" di semua materi. Angka yang benar:

| Tahap | Perkiraan |
|---|---|
| Ethereum finality | ~13 menit |
| Attestation block di Creditcoin | setelah finality |
| Verifikasi proof + eksekusi | satu block Creditcoin (~15 detik) |
| **Total** | **~13–15 menit** |

Framing yang jujur dan tetap kuat: *"Verified within one Creditcoin block of Ethereum finality."* Untuk produk asuransi, latency 15 menit sama sekali bukan masalah. Untuk dashboard yang mengklaim real-time, itu masalah.

**Batasan protokol lain:** batch query maksimal 10 per continuity proof. Relevan kalau mengejar fitur multi-position.

---

## 8. User Flows

### Flow A — Beli Cover

1. Connect wallet (Creditcoin + Sepolia).
2. Sistem panggil `probe(user)` di Sepolia. User approve tx.
3. Worker generate proof, submit ke ASC. UI tampilkan progres tiap tahap.
4. Snapshot terverifikasi muncul: collateral, debt, HF, block number.
5. User pilih cover amount dan durasi. UI tampilkan premi.
6. User bayar premi di Creditcoin. Policy tercatat on-chain.

### Flow B — Klaim (jalur otomatis)

1. Posisi user terlikuidasi di Aave Sepolia.
2. Worker mendeteksi `LiquidationCall`, menunggu attestation.
3. Worker submit proof ke ASC.
4. ASC verifikasi, cocokkan policy, transfer payout.
5. User melihat notifikasi. **Tidak ada aksi apa pun yang diperlukan dari user.**

### Flow C — Klaim manual (fallback demo)

Kalau worker mati saat demo, sediakan tombol "Submit Claim Manually" di UI yang menjalankan langkah proof generation di browser. Backup ini murah dibuat dan menyelamatkan demo.

---

## 9. Demo Script (5 menit)

Siapkan ini di hari ke-8, bukan hari ke-10.

| Menit | Aksi |
|---|---|
| 0:00–0:30 | Problem: leveraged position, liquidation penalty permanen, klaim asuransi butuh trust |
| 0:30–1:30 | Beli cover. Tunjukkan probe → proof → snapshot verified di Creditcoin |
| 1:30–2:30 | **Turunkan health factor**: borrow tambahan di Aave Sepolia sampai HF < 1 |
| 2:30–3:30 | Trigger likuidasi (script liquidator sendiri). Tunjukkan tx di Etherscan |
| 3:30–4:30 | Payout otomatis muncul di Creditcoin. Buka Proof Explorer, telusuri rantai buktinya |
| 4:30–5:00 | "Tidak ada yang meng-approve klaim ini. Tidak ada oracle yang bisa dibohongi." |

**Siapkan skenario likuidasi di testnet lebih awal.** Ini sering lebih sulit dari yang dibayangkan: butuh posisi yang tepat, harga oracle Sepolia yang kooperatif, dan liquidator bot sendiri. Alokasikan waktu khusus, jangan diasumsikan gampang.

---

## 10. Scope

**In scope:**
- 1 source chain: Ethereum Sepolia
- 1 protokol: Aave V3
- Probe + verifikasi + cover + payout otomatis + proof explorer

**Out of scope:**
- Multi chain, multi protokol
- Attestcoin Writability (aksi balik ke source chain)
- Ekonomi underwriter yang sesungguhnya
- Premium pricing model kuantitatif (pakai flat rate dulu, jelaskan bahwa ini disederhanakan)
- Tokenomics, governance, mobile app

---

## 11. Timeline (27 Agustus – 6 September)

| Hari | Tanggal | Fokus | Definition of done |
|---|---|---|---|
| 1 | 27 Aug | **Jangan tulis kode AniWere.** Jalankan tutorial Cross-Chain Loan dApp apa adanya | Proof berhasil terverifikasi on-chain di Creditcoin Testnet |
| 2 | 28 Aug | `AniWereProbe.sol` deploy di Sepolia. Emit event, verifikasi manual | Event `PositionProbedForCover` terlihat di Etherscan |
| 3 | 29 Aug | Worker: listener + attestation waiter + proof builder | Proof untuk event probe berhasil di-generate |
| 4 | 30 Aug | `AniWereASC.sol`: verify + decode + simpan snapshot | Snapshot posisi Aave tersimpan on-chain di Creditcoin |
| 5 | 31 Aug | Cover logic: `buyCover`, vault, policy storage | Policy bisa dibeli dan dibaca |
| 6 | 1 Sep | Liquidation claim path + skenario likuidasi di Sepolia | Payout cair otomatis dari event nyata |
| 7 | 2 Sep | Frontend: Position + Cover page | Flow beli cover jalan end-to-end |
| 8 | 3 Sep | Proof Explorer + polish + demo script | Demo bisa dijalankan dari awal sampai akhir |
| 9 | 4 Sep | README, architecture diagram, technical writeup | Dokumentasi selesai |
| 10 | 5 Sep | Rekam video, buffer, submit | Submitted |
| — | 6 Sep | Deadline. **Jangan pakai hari ini.** | — |

**Gate check hari 1:** kalau tutorial belum jalan end-to-end sampai malam hari pertama, itu sinyal untuk memotong scope segera. Opsi pemotongan berurutan: (a) hapus cover, sisakan verified position snapshot saja; (b) hapus probe, sisakan liquidation claim saja. Jangan tunggu hari ke-5 untuk mengambil keputusan ini.

---

## 12. Risks & Mitigations

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Attestcoin testnet tidak stabil / dokumentasi kurang | Fatal | Hari 1 khusus validasi tutorial. Bergabung ke channel developer Creditcoin lebih awal untuk akses support |
| Sulit membuat likuidasi terjadi di Sepolia | Tinggi | Siapkan liquidator script sendiri dari hari 6. Fallback: deploy fork Aave sendiri dengan oracle yang bisa dikontrol |
| Attestation delay bikin demo panjang | Sedang | Rekam demo dengan potongan waktu tunggu. Sediakan state yang sudah diverifikasi sebelumnya sebagai cadangan |
| Decoding event Aave di ASC merepotkan | Sedang | Fallback ke Opsi B (relay lewat prober) — sudah dirancang di 6.4 |
| Worker mati saat demo | Sedang | Tombol manual claim di UI (Flow C) |
| Vault kosong saat klaim masuk | Sedang | Solvency guard: cover aktif tidak boleh melebihi modal bebas. Fund vault sebelum rekaman |
| Scope creep | Sedang | Nice-to-have dikunci sampai hari 8. Kalau hari 8 belum stabil, semuanya dibuang |

---

## 13. Success Metrics

**Wajib tercapai:**
- Minimal satu event `LiquidationCall` nyata dari Sepolia terverifikasi di Creditcoin dan memicu payout
- Minimal satu snapshot posisi Aave terverifikasi lewat prober pattern
- Demo end-to-end tanpa intervensi manual
- Judge bisa menjelaskan kembali kenapa ini bukan oracle biasa

**Sinyal kualitas:**
- README menjelaskan dengan tepat *apa* yang dibuktikan (event di receipt log) dan *apa yang tidak* (storage slot)
- Trade-off didokumentasikan secara jujur, termasuk keterbatasan
- Architecture diagram terbaca tanpa penjelasan lisan

---

## 14. Keterbatasan yang Harus Diakui Terbuka

Cantumkan ini di README. Judge lebih mempercayai tim yang tahu batas produknya sendiri daripada tim yang mengklaim semuanya sempurna.

1. **Snapshot, bukan streaming.** Health factor terverifikasi berlaku *pada block tertentu*. Antara dua probe, kita tidak tahu apa-apa. Ini konsekuensi langsung dari model event proof.
2. **Kita tidak mencegah likuidasi.** Kita membayar setelahnya. Pencegahan butuh Writability dan eksekusi di source chain, yang di luar scope hackathon.
3. **Premi flat, bukan risk-priced.** Model pricing sungguhan butuh data historis dan analisis kuantitatif.
4. **Sisi underwriter disederhanakan.** Vault di-fund manual, belum ada ekonomi underwriting yang sesungguhnya.
5. **Satu chain, satu protokol.** Arsitekturnya generalizable, implementasinya belum.

---

## 15. Referensi

- Attestcoin Protocol — https://docs.creditcoin.org/attestcoin-protocol
- Readability: Attestation & Transaction Proving — https://docs.creditcoin.org/attestcoin-protocol/attestcoin-readability
- dApp Design Patterns: Readability — https://docs.creditcoin.org/attestcoin-protocol/dapp-builder-infrastructure/dapp-design-patterns-readability
- Source Chain Smart Contracts — https://docs.creditcoin.org/attestcoin-protocol/dapp-builder-infrastructure/source-chain-smart-contracts
- Attestcoin SDK — https://docs.creditcoin.org/attestcoin-protocol/dapp-builder-infrastructure/attestcoin-sdk-usc-sdk
- Offchain Readability Workers — https://docs.creditcoin.org/attestcoin-protocol/dapp-builder-infrastructure/offchain-readability-workers
- Attestcoin Chains & Environments — https://docs.creditcoin.org/attestcoin-protocol/attestcoin-protocol-chains-environments

---

*PRD v2.0 — 27 Agustus 2026*
