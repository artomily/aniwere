# AniWere Worker

Kurir proof antara Sepolia dan Creditcoin.

```
tx di Sepolia  →  tunggu blok ter-attest  →  minta proof  →  submit ke AniWereASC
```

## Worker ini tidak dipercaya, dan itu disengaja

Worker tidak memutuskan apa pun.

- Proof yang ia kirim tetap harus lolos Block Prover Precompile. Proof palsu membuat transaksi revert.
- Ia mengirim **seluruh receipt**, bukan satu log pilihan. Log mana yang dipakai ditentukan `_findLog` di ASC, yang mencocokkan emitter dan topic0. Worker tidak punya kesempatan untuk memilihkan.
- `submitLiquidationClaim` permissionless. Kalau worker mati, user atau siapa pun bisa menjalankan perintah yang sama dan payout tetap ke pemegang polis.

Yang bisa dilakukan worker jahat: tidak mengirim. Itu saja.

## Setup

```bash
cd worker
npm install
cp .env.example .env     # isi PROBE_ADDRESS, ASC_ADDRESS, PRIVATE_KEY
npm run status
```

`status` dan `prove` jalan tanpa `PRIVATE_KEY`.

## Perintah

| Perintah | Isi |
|---|---|
| `npm run worker -- status` | Head Sepolia, finalized, attested height, lag, saldo vault |
| `npm run worker -- probe <address>` | Panggil `probe(user)` di Sepolia |
| `npm run worker -- prove <txHash> [file]` | Bangun proof, simpan JSON, tidak mengirim apa pun |
| `npm run worker -- submit-position <txHash>` | Proof → `submitPositionProof` |
| `npm run worker -- submit-claim <txHash>` | Proof → `submitLiquidationClaim` |
| `npm run worker -- watch` | Loop: pantau kedua event, kerjakan otomatis |

Alur demo:

```bash
npm run worker -- status
npm run worker -- probe 0xUSER
npm run worker -- submit-position 0xTX_PROBE
npm run worker -- watch
```

`prove` ada khusus sebagai jaring pengaman saat rekaman: proof yang sudah tersimpan bisa dikirim ulang kapan saja tanpa menunggu attestation lagi.

## Waktu tunggu

Attestation tertinggal sekitar **8 menit** di belakang head Sepolia. Batas tunggu 20 menit dengan polling 15 detik, angka yang dipakai contoh resmi Attestcoin.

Jangan menyebut jalur ini real-time. Yang benar: satu blok Creditcoin setelah blok sumber ter-attest.

## Catatan implementasi

**REST, bukan `@gluwa/usc-sdk`.** Bentuk respons Proof Builder sudah diverifikasi lewat pemanggilan live (`docs/ATTESTCOIN.md` bagian 5), sementara SDK menyeret ethers ke project yang seluruh sisanya memakai viem. Kalau perlu pindah ke SDK, satu-satunya file yang berubah adalah `src/attestcoin.ts`.

**chainKey Sepolia = 1, bukan 11155111.** Ini bukan chain ID. Menukar keduanya menghasilkan proof untuk chain yang salah, dan revert-nya tidak menjelaskan apa-apa. `fetchProof` mengecek ulang chainKey di respons prover sebelum meneruskannya.

**Simulasi dulu, selalu.** `submitProof` menjalankan `eth_call` sebelum mengirim. Proof yang tidak sah lebih baik ketahuan gratis daripada dari transaksi yang sudah membakar gas.

**Buffer gas 35%, dengan fallback.** Estimasi gas ke precompile sering meleset walaupun call-nya sendiri berhasil. Fallback resmi Attestcoin (`21000 + 5000×root + 20000`) ditulis untuk kontrak yang hanya memanggil precompile; ASC kita masih men-decode receipt setelahnya, jadi fallback itu dijepit ke batas bawah 2.000.000. Gas berlebih dikembalikan; gas kurang tidak.

**Precompile Chain Info (`0x…0FD3`) hanya pembanding.** Signature-nya dugaan, bukan salinan header resmi seperti `INativeQueryVerifier`, jadi `status` menampilkannya kalau terbaca dan diam kalau tidak. Sumber kebenaran attested height adalah REST.
