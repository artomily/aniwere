# Runbook: dari wallet kosong sampai rekaman selesai

**Ditulis 4 September.** Satu-satunya blocker yang tersisa adalah wallet terdanai.
Semua kode sudah siap. Halaman ini menghapus kebutuhan untuk berpikir besok —
tinggal jalankan dari atas ke bawah.

Perkiraan waktu total: **90 menit**, dengan dua kali menunggu attestation
~8 menit di dalamnya.

---

## 0. Sebelum mulai (10 menit)

| Yang dibutuhkan | Dari mana |
|---|---|
| Sepolia ETH | Faucet Sepolia mana pun. Butuh ~0.1 ETH: gas + collateral Aave |
| Creditcoin CC3 CTC | Faucet Creditcoin Testnet. Butuh ~600 CTC: gas + modal vault |
| Etherscan API key | Untuk `--verify`. Boleh dilewati kalau mepet |

Satu private key dipakai di ketiga `.env`. Untuk hackathon ini boleh; jangan
pakai key yang memegang aset sungguhan.

```bash
# Isi ketiganya dengan key yang sama
contracts-sepolia/.env      PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
contracts-creditcoin/.env   PRIVATE_KEY
worker/.env                 PRIVATE_KEY
```

Cek jalur sebelum membakar gas — perintah ini tidak butuh wallet:

```bash
cd worker && npm run status
```

Harus muncul angka blok Sepolia, `finalized`, dan attested height. Kalau
Proof Builder tidak menjawab, **berhenti di sini**; tidak ada gunanya deploy.

---

## 1. Deploy probe ke Sepolia (5 menit)

```bash
cd contracts-sepolia
forge script script/DeployProbe.s.sol:DeployProbe --rpc-url sepolia --broadcast --verify
```

Salin alamatnya ke dua tempat:

- `contracts-creditcoin/.env` → `SOURCE_PROBE_SEPOLIA`
- `worker/.env` → `PROBE_ADDRESS`

Alamat ini `immutable` di ASC. Salah salin berarti deploy ulang ASC, bukan
perbaikan satu setter — memang tidak ada setter-nya.

---

## 2. Deploy ASC ke Creditcoin (10 menit)

```bash
cd ../contracts-creditcoin
forge script script/DeployASC.s.sol:DeployASC --rpc-url creditcoin_testnet --broadcast --legacy
```

Output mencetak tiga alamat: adapter, ASC, dan vault. Vault ter-deploy sendiri
di dalam constructor ASC — itu memang inti klaim "tidak ada admin", jadi
pastikan alamatnya ikut dicatat untuk demo.

`EvmV1Decoder` adalah library dengan fungsi public, jadi forge men-deploy dan
me-link otomatis. Kalau estimasi gas gagal, tambahkan `--gas-estimate-multiplier 135`.

Isi `worker/.env` → `ASC_ADDRESS`, dan `.env.local` di root → `NEXT_PUBLIC_ASC_ADDRESS`
(yang terakhir mematikan banner "sample data" di frontend).

**Kalau deploy gagal karena precompile:** ini skenario yang paling mungkin
merusak hari. Jalur decoding receipt belum pernah diuji di jaringan asli —
lihat bagian 7.

---

## 3. Isi vault (2 menit)

```bash
cast send <VAULT> "depositCapital()" --value 500ether \
  --rpc-url creditcoin_testnet --private-key $PRIVATE_KEY
```

Verifikasi:

```bash
cd ../worker && npm run status   # baris CoverVault harus menunjukkan 500 CTC
```

---

## 4. Buat posisi Aave di Sepolia (15 menit)

Target HF sekitar **1.5**. Cukup tinggi untuk lolos `MIN_HF_TO_BUY` (1.05),
cukup rendah untuk bisa didorong ke bawah 1 nanti tanpa modal besar.

Lewat UI Aave V3 testnet (`app.aave.com`, pilih Sepolia) atau `cast`:
supply WETH, lalu borrow USDC sekitar 50% dari batas.

Konfirmasi angkanya sebelum lanjut:

```bash
cast call 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951 \
  "getUserAccountData(address)(uint256,uint256,uint256,uint256,uint256,uint256)" \
  <USER> --rpc-url sepolia
```

Angka terakhir adalah health factor, 18 desimal.

---

## 5. Snapshot terbukti di Creditcoin (15 menit, sebagian besar menunggu)

```bash
cd worker
npm run worker -- probe <USER>              # cetak tx hash
npm run worker -- submit-position <TX>      # tunggu attest ~8 mnt, lalu submit
```

**Ini momen paling menentukan seluruh proyek.** Kalau baris ini sukses,
posisi Aave dari Ethereum sudah tersimpan di Creditcoin lewat proof
kriptografis, dan sisanya adalah logic lokal yang sudah punya 12 test hijau.

Simpan tx hash Creditcoin-nya. Ini bahan rekaman.

---

## 6. Beli cover (5 menit)

Lewat frontend, atau langsung:

```bash
# premi = 2% dari cover
cast send <ASC> "buyCover(uint256,uint64)" 100000000000000000000 604800 \
  --value 2000000000000000000 --rpc-url creditcoin_testnet --private-key $PRIVATE_KEY
```

Cover 100 CTC, 7 hari, premi 2 CTC.

Ingat `MAX_SNAPSHOT_AGE` satu jam. Kalau langkah 5 selesai lebih dari sejam
lalu, probe ulang dulu.

Dua penolakan yang layak direkam karena keduanya adalah fitur:

```bash
# cover melebihi modal bebas -> revert
# beli dengan snapshot HF rendah -> revert HealthFactorTooLow
```

---

## 7. Likuidasi & payout (25 menit)

Jalankan worker dalam mode pantau di terminal terpisah:

```bash
npm run worker -- watch
```

Lalu turunkan HF ke bawah 1. Dua jalan:

**A. Tambah borrow.** Paling sederhana kalau posisinya masih punya ruang.

**B. Panggil `liquidationCall` sendiri.** Jangan berharap ada bot yang lewat di
testnet. Butuh sedikit debt asset untuk membayar bagian yang dilikuidasi.

Yang harus terlihat:

1. `LiquidationCall` muncul di Etherscan
2. Worker mendeteksinya, mengenali holder punya polis aktif
3. Worker menunggu attestation, membangun proof, submit
4. `ClaimSettled` di Creditcoin, saldo holder naik

Simpan semua tx hash.

### Kalau likuidasi tidak bisa dipicu sampai sore

Berhenti mengejar. Yang tetap bisa direkam dan tetap membuktikan klaim inti:

- Snapshot posisi terbukti lintas chain (langkah 5) — ini yang sebenarnya
  membuktikan Attestcoin bekerja
- Cover dibeli on-chain, solvency guard dan HF guard menolak sebagaimana mestinya
- 12 test hijau termasuk `test_RejectsLiquidationFromWrongEmitter`
- Panel attestation live di Proof Explorer

Katakan apa adanya di video: jalur klaim terbukti lewat test, belum lewat
likuidasi sungguhan di testnet. Juri lebih menghargai batas yang disebutkan
sendiri daripada demo yang mulus tapi tidak jelas mana yang nyata.

---

## 8. Kalau precompile menolak di jaringan asli

Ini risiko terbuka terbesar. Test lokal berhenti di `MockProver` karena
precompile pallet-evm tidak punya bytecode.

Urutan diagnosis, jangan dibalik:

1. `npm run worker -- prove <TX>` — apakah Proof Builder memberi proof sama sekali?
2. Kalau proof ada tapi submit revert: masalahnya di adapter, **bukan di ASC**.
   Aturan 4 di `CLAUDE.md` berlaku — jangan menambal `AniWereASC`.
3. Tersangka pertama: `verifyAndEmit` tidak ada dan yang ada hanya `verify`.
   Perbaikannya satu baris di `AttestcoinAdapter.verifyAndExtract`. Interface-nya
   sudah menyediakan keduanya.
4. Tersangka kedua: path import `EvmV1Decoder` berbeda versi. Pin `@gluwa/usc-contracts`
   di `0.1.2`, jangan `0.2.0` — lihat `docs/ATTESTCOIN.md` bagian 6.

---

## 9. Rekaman (target 4–5 menit)

Urutan yang menjaga klaim terkuat tetap di depan:

| Menit | Isi |
|---|---|
| 0:00–0:40 | Masalah: posisi di Ethereum, tidak ada proteksi parametrik lintas chain tanpa bridge |
| 0:40–1:30 | Apa yang dibuktikan dan apa yang tidak. Event, bukan storage. Kenapa ada prober |
| 1:30–2:30 | Demo: probe → snapshot terbukti di Creditcoin → beli cover |
| 2:30–3:30 | Likuidasi → payout otomatis. Proof Explorer, tiap tahap bisa diklik ke explorer |
| 3:30–4:15 | Kenapa tidak perlu percaya kami: tidak ada admin, vault di-deploy constructor, cek emitter, worker tidak dipercaya |
| 4:15–5:00 | Keterbatasan yang diakui sendiri, termasuk attestation mendahului finality. Roadmap |

Jangan pernah menyebut "real-time". Yang benar: **satu blok Creditcoin setelah
blok sumber ter-attest, sekitar 8 menit setelah masuk Ethereum.**

Rekam ulang bagian yang perlu; jangan mengulang seluruh alur on-chain hanya
demi satu take yang mulus. Proof yang sudah tersimpan bisa dipakai lagi:

```bash
npm run worker -- prove <TX> proof-demo.json
```

---

## 10. Submit

- [ ] Semua alamat kontrak masuk README, menggantikan baris "belum di-deploy"
- [ ] Tx hash bukti masuk README
- [ ] `.env` tidak ikut ter-commit — `git status` bersih
- [ ] Semua link dibuka ulang dari incognito
- [ ] Form DoraHacks
