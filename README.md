# AniWere

**Parametric liquidation cover untuk posisi lending cross-chain, di atas Attestcoin Protocol.**

*Your position lives anywhere. Your protection lives here.*

> BUIDL CTC 2026 Fall — Track DeFi

---

## Apa ini

User membeli proteksi di **Creditcoin** untuk posisi Aave V3 mereka di **Ethereum**. Kalau posisi itu benar-benar kena likuidasi, event `LiquidationCall` dari Ethereum dibuktikan secara kriptografis lewat **Attestcoin Protocol**, dan payout cair otomatis.

Tanpa klaim manual. Tanpa komite. Tanpa oracle terpusat. Tanpa bridge.

---

## Apa yang sebenarnya dibuktikan

Ini bagian yang paling sering disalahpahami, jadi ditulis eksplisit.

**Attestcoin Readability membuktikan bahwa sebuah transaksi terjadi di block source chain**, lewat dua proof yang bekerja bersama:

- **Continuity proof** — block itu memang bagian dari rantai Ethereum yang sudah ter-attest di Creditcoin
- **Merkle proof** — transaksi itu memang termasuk di dalam block tersebut

Keduanya diverifikasi **sinkron** oleh Block Prover Precompile, jadi verifikasi dan payout terjadi dalam satu transaksi Creditcoin yang sama.

**Yang bisa dibuktikan:** event di receipt log sebuah transaksi.
**Yang TIDAK bisa dibuktikan:** storage slot.

Konsekuensinya, `IPool.getUserAccountData(user)` tidak bisa dibuktikan secara langsung, karena itu view call terhadap storage dan tidak meninggalkan jejak di receipt log mana pun. Karena itu kami memakai **prober pattern**: kontrak di Sepolia memanggil Aave lalu meng-emit hasilnya sebagai event, dan event itulah yang dibuktikan.

---

## Arsitektur

```
ETHEREUM SEPOLIA                 WORKER              CREDITCOIN
─────────────────                ──────              ──────────
AniWereProbe.probe(user)
  └─ staticcall Aave V3
  └─ emit PositionProbedForCover ──┐
                                   ├─► filter log
Aave V3 Pool                       │   tunggu attestation
  └─ emit LiquidationCall ─────────┘   build proof
                                       submit ──────► AniWereASC
                                                        ├─ Block Prover (sinkron)
                                                        ├─ decode + validasi polis
                                                        └─ CoverVault.payClaim()
```

Diagram lengkap ada di [`docs/diagrams/`](docs/diagrams/).

---

## Keputusan desain

### No privileged access

`CoverVault` di-deploy **oleh** `AniWereASC` di dalam constructor-nya, sehingga alamat ASC di vault bersifat `immutable` dan tidak ada setter sama sekali.

- Tidak ada `owner`, `onlyOwner`, `pause`, atau upgrade
- Tidak ada fungsi withdraw untuk tim
- Dana hanya keluar lewat dua jalan: payout yang dipicu proof valid, atau penarikan underwriter atas modal yang tidak sedang terkunci

Tim AniWere secara teknis tidak bisa menyentuh dana siapa pun. Kalau ada yang bertanya kenapa harus percaya kami: tidak perlu, dan itu justru intinya.

### Worker tidak dipercaya

Off-chain worker cuma kurir. Kalau dia mengirim proof palsu, precompile menolak dan transaksi revert. Satu-satunya hal yang bisa dia lakukan adalah tidak mengirim, dan karena `submitLiquidationClaim` permissionless, siapa pun bisa menggantikannya.

### Solvency guard

Total cover aktif tidak boleh melebihi modal bebas di vault. Vault secara matematis tidak bisa insolvent.

### Tidak pernah menghitung ulang health factor

Kami memakai angka dari `getUserAccountData` apa adanya, sehingga HF yang dibuktikan identik dengan yang dipakai Aave untuk memutuskan likuidasi. Menghitung ulang dengan sumber harga lain akan langsung mengembalikan trust assumption yang mau dihilangkan.

### Pengecekan emitter

`_findLog` mencocokkan **emitter dan topic0**, bukan topic0 saja. Tanpa itu, siapa pun bisa deploy kontrak di Sepolia yang meng-emit event dengan signature sama dan menguras vault. Ada tesnya: `test_RejectsLiquidationFromWrongEmitter`.

---

## Struktur repo

```
aniwere/
├── app/                    Frontend (Next.js)
├── contracts-sepolia/      Foundry — AniWereProbe.sol
├── contracts-creditcoin/   Foundry — AniWereASC.sol, CoverVault.sol
├── worker/                 Off-chain proof worker
└── docs/
    ├── PRD.md
    └── diagrams/
```

Dua project Foundry terpisah, bukan satu. Config network dan target EVM-nya berbeda, dan menggabungkannya membuat deploy gampang tertukar.

---

## Setup

```bash
# Sisi source chain
cd contracts-sepolia
forge install foundry-rs/forge-std --no-git
cp .env.example .env      # isi dulu
forge build && forge test

# Sisi Creditcoin
cd ../contracts-creditcoin
forge install foundry-rs/forge-std --no-git
cp .env.example .env      # isi dulu
forge build && forge test
```

Kalau repo ini sudah berupa git repo, hapus `--no-git` agar dependency masuk sebagai submodule.

### Deploy

```bash
# 1. Probe ke Sepolia
cd contracts-sepolia
forge script script/DeployProbe.s.sol:DeployProbe --rpc-url sepolia --broadcast --verify

# 2. Masukkan alamatnya ke contracts-creditcoin/.env sebagai SOURCE_PROBE_SEPOLIA

# 3. ASC ke Creditcoin
cd ../contracts-creditcoin
forge script script/DeployASC.s.sol:DeployASC --rpc-url creditcoin_testnet --broadcast --legacy

# 4. Fund vault sebelum demo
cast send <vault> "depositCapital()" --value 500ether --rpc-url creditcoin_testnet --private-key $PRIVATE_KEY
```

---

## Yang masih perlu diisi

Dua hal sengaja dibiarkan sebagai placeholder karena harus diverifikasi langsung, bukan ditebak:

1. **`src/interfaces/IAttestcoinProver.sol`** — signature asli Block Prover Precompile harus diambil dari [dokumentasi Attestcoin](https://docs.creditcoin.org/attestcoin-protocol/dapp-builder-infrastructure/attestcoin-smart-contracts). Bentuk sekarang adalah adapter placeholder supaya business logic bisa ditulis dan dites lebih dulu. Ketika signature aslinya diketahui, **hanya file ini** yang perlu diubah. `AniWereASC` tidak perlu disentuh.

2. **`AAVE_POOL_SEPOLIA`** — verifikasi di [aave.com/docs/resources/addresses](https://aave.com/docs/resources/addresses). Alamat testnet bisa berubah kalau Aave melakukan redeployment.

---

## Ekspektasi latency

Jangan pakai kata "real-time".

| Tahap | Perkiraan |
|---|---|
| Ethereum finality | ~13 menit |
| Attestation di Creditcoin | setelah finality |
| Verifikasi proof + payout | satu block Creditcoin (~15 detik) |
| **Total** | **~13–15 menit** |

Framing yang benar: *verified within one Creditcoin block of Ethereum finality*.

---

## Keterbatasan yang kami akui

1. **Snapshot, bukan streaming.** Health factor terverifikasi berlaku pada block tertentu. Di antara dua probe, kami tidak tahu apa-apa. Ini konsekuensi langsung dari model event proof.
2. **Kami tidak mencegah likuidasi.** Kami membayar setelahnya. Pencegahan butuh Attestcoin Writability, di luar scope hackathon.
3. **Premi flat 2%, bukan risk-priced.** Model pricing sungguhan butuh data historis dan analisis kuantitatif.
4. **Sisi underwriter disederhanakan.** Vault di-fund manual. Belum ada share accounting, lock period, atau ekonomi underwriting yang sesungguhnya.
5. **Satu chain, satu protokol.** Arsitekturnya generalizable, implementasinya belum.

---

## Roadmap

Empat item, masing-masing lahir dari keterbatasan di atas.

1. **Multi source chain** (Arbitrum, Base, Polygon) — satu pool modal yang menjamin banyak chain adalah alasan Creditcoin dipakai sejak awal.
2. **Capital efficiency** — modal underwriter menganggur sepanjang periode polis, dan opportunity cost itu jadi lantai harga yang dibayar user lewat premi. Men-deploy idle capital ke yield strategy konservatif menurunkan lantai itu. Catatan risiko: ini menambah exposure baru, karena exploit di protokol tujuan akan menghilangkan dana klaim justru saat paling dibutuhkan. Karena itu strateginya harus konservatif dan porsinya dibatasi.
3. **Risk-priced premium** — flat rate tidak adil untuk posisi konservatif dan terlalu murah untuk posisi agresif.
4. **Automated protection via Writability** — mencegah lebih baik daripada mengganti.

---

## Lisensi

MIT
