@AGENTS.md

# AniWere

Parametric liquidation cover untuk posisi Aave V3 cross-chain, di atas Attestcoin Protocol (Creditcoin). Hackathon BUIDL CTC 2026 Fall, track DeFi.

Baca `docs/PRD.md` untuk konteks penuh dan `docs/SPRINT.md` untuk rencana harian.

## Struktur

| Path | Isi |
|---|---|
| `app/` | Frontend Next.js |
| `contracts-sepolia/` | Foundry. `AniWereProbe.sol` — source chain |
| `contracts-creditcoin/` | Foundry. `AniWereASC.sol`, `CoverVault.sol` — control plane |
| `worker/` | Off-chain proof worker (belum dibuat) |
| `docs/` | PRD, sprint plan, diagram |

Dua project Foundry terpisah dan memang disengaja. Target EVM dan config network-nya berbeda.

## Kendala inti

**Attestcoin Readability membuktikan event di receipt log, bukan storage slot.**

`getUserAccountData()` tidak bisa dibuktikan langsung karena itu view call terhadap storage. Karena itu ada prober pattern: kontrak di Sepolia memanggil Aave lalu meng-emit hasilnya sebagai event, dan event itulah yang dibuktikan.

Kalau ada ide yang mengandaikan pembacaan state source chain secara langsung, ide itu tidak bisa dijalankan. Ubah dulu jadi event.

## Aturan yang tidak boleh dilanggar

1. **Tidak ada admin function.** Tidak ada `owner`, `onlyOwner`, `pause`, upgrade, atau withdraw untuk tim. `CoverVault` di-deploy oleh `AniWereASC` di constructor supaya alamat ASC immutable. Ini klaim utama produk.
2. **Jangan hitung ulang health factor** dengan sumber harga selain Aave. Pakai angka `getUserAccountData` apa adanya.
3. **`_findLog` harus mencocokkan emitter DAN topic0.** Tanpa cek emitter, siapa pun bisa deploy kontrak palsu di Sepolia dan menguras vault. Dijaga oleh `test_RejectsLiquidationFromWrongEmitter` — kalau test itu gagal, berhenti dan perbaiki.
4. **Ketidakpastian Attestcoin diisolasi di `src/interfaces/IAttestcoinProver.sol`.** Kalau perlu menambal di `AniWereASC` agar cocok dengan precompile, artinya adapter yang salah, bukan ASC.
5. **Jangan tulis "real-time"** di kode, komentar, UI, atau dokumen. Latency sebenarnya ~13–15 menit, didominasi Ethereum finality. Framing yang benar: *verified within one Creditcoin block of Ethereum finality*.
6. **Solvency guard tidak boleh dilepas.** Total cover aktif tidak boleh melebihi modal bebas di vault.

## Status

`IAttestcoinProver.sol` masih **placeholder**, bukan interface resmi Attestcoin. Signature asli harus diambil dari dokumentasi. Sampai itu selesai, semua test berjalan di atas `MockProver`.

## Konvensi

- Solidity 0.8.24, `evm_version = "paris"`
- Custom error, bukan `require` dengan string
- Checks-effects-interactions, selalu
- Komentar menjelaskan **kenapa**, bukan apa
- Fungsi yang sengaja permissionless diberi komentar yang menyatakan itu properti desain, supaya tidak ada yang "memperbaikinya" dengan menambahkan akses kontrol
