# AniWere — Sprint Plan

**27 Agustus – 5 September 2026.** Submit 5 Sep. Deadline 6 Sep tidak dipakai.

Aturan main:

- Tiap hari punya satu **Definition of Done** yang bisa dijawab ya/tidak. Kalau jawabannya "hampir", itu tidak.
- Tiap hari punya **stop signal**. Kalau kena, berhenti dan ambil keputusan scope hari itu juga, bukan besok.
- Commit di akhir tiap hari, sekecil apa pun progresnya.
- Nice-to-have dikunci sampai Hari 8. Kalau Hari 8 belum stabil, semuanya dibuang tanpa diskusi.

---

## Status saat ini

Sudah selesai sebelum sprint mulai:

- [x] PRD v2 + tiga diagram
- [x] `AniWereProbe.sol` + test hijau
- [x] `AniWereASC.sol` + `CoverVault.sol` + 11 test hijau
- [x] Deploy script kedua sisi

Belum terpecahkan, dan ini **risiko nomor satu**:

- [x] ~~Signature asli Block Prover Precompile~~ — **terpecahkan 27 Agt.** `verifyAndEmit` di `0x…0FD2`, lihat `docs/ATTESTCOIN.md`. Placeholder-nya salah bentuk; perbaikan masuk Hari 2
- [x] ~~Alamat Aave V3 Pool di Sepolia~~ — `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`, diverifikasi on-chain, sudah masuk `.env.example`
- [ ] Apakah likuidasi bisa dipicu di Sepolia

---

## Hari 1 — 27 Agustus — Validasi Attestcoin

**Goal:** membuktikan Attestcoin jalan di tanganmu, bukan cuma di dokumentasi.

Jangan tulis kode AniWere hari ini. Serius.

- [ ] Setup wallet + faucet Creditcoin Testnet — **butuh tangan manusia**
- [ ] Jalankan tutorial Cross-Chain Loan dApp **apa adanya**, tanpa modifikasi — terblokir wallet
- [x] Catat signature asli precompile: alamat, nama fungsi, tipe parameter, bentuk return
- [x] Catat cara memanggil Proof Builder / Attestcoin SDK
- [ ] Join channel developer Creditcoin, perkenalkan diri, tanya kalau mentok — **butuh tangan manusia**
- [x] Verifikasi alamat Aave V3 Pool di Sepolia, isi `.env` kedua project

**DoD:** ada satu transaksi di Creditcoin Testnet explorer yang membuktikan event Sepolia berhasil diverifikasi.

**Status 27 Agt:** belum ada transaksi, karena wallet belum ada. Tapi jalur verifikasinya sudah dibuktikan lewat `eth_call` ke precompile memakai proof dari transaksi Sepolia sungguhan — precompile mengembalikan `true`, dan empat variasi proof rusak semuanya revert. Yang tersisa hanya mengubahnya jadi transaksi bergas. Risiko nomor satu sudah turun drastis.

**Stop signal:** jam 22:00 belum ada transaksi itu. → Turunkan target ke "satu snapshot posisi terverifikasi", buang cover dan payout dari MVP. Ambil keputusan malam ini.

---

## Hari 2 — 28 Agustus — Probe hidup di Sepolia

**Goal:** event kita sendiri sudah mengalir di source chain.

- [x] Ganti `IAttestcoinProver.sol` dengan signature asli hasil Hari 1 — **selesai 1 Sep**
- [x] Sesuaikan `MockProver.sol` agar mengikuti bentuk baru, pastikan test tetap hijau — 12/12 hijau
- [ ] Deploy `AniWereProbe` ke Sepolia, verify di Etherscan
- [ ] Buat posisi Aave sungguhan di Sepolia: supply + borrow, target HF sekitar 1.5
- [ ] Panggil `probe(user)`, konfirmasi `PositionProbedForCover` muncul di Etherscan
- [ ] Simpan tx hash-nya, ini bahan baku Hari 3

**DoD:** ada event probe di Etherscan Sepolia berisi angka posisi Aave yang nyata.

**Status 1 Sep:** adapter selesai. `AttestcoinAdapter.sol` memanggil `verifyAndEmit` di
`0x…0FD2` lalu men-decode receipt sendiri lewat `EvmV1Decoder` — precompile hanya
mengembalikan `bool`, log tidak ikut. `AniWereASC` tidak tahu-menahu soal precompile;
yang berubah di sana hanya signature dua fungsi submit dan `proofId`, yang sekarang
mengikat chainKey + height + merkle root + isi transaksi (dulu cuma hash transaksi,
sehingga transaksi yang sama masih bisa dikirim ulang lewat blok berbeda).
`test_RejectsLiquidationFromWrongEmitter` tetap hijau.

Yang belum bisa dites lokal: decoding receipt di adapter. Precompile pallet-evm tidak
punya bytecode, jadi fork test tidak bisa menyentuhnya. Jalur itu baru terbukti Hari 4
di Creditcoin Testnet. Sisa blocker Hari 2 semuanya butuh wallet dan deployment.

**Stop signal:** Aave V3 Sepolia ternyata tidak bisa dipakai. → Deploy fork Aave sendiri dengan mock oracle. Ini juga menyelesaikan masalah Hari 6 sekaligus, jadi bukan kerugian murni.

---

## Hari 3 — 29 Agustus — Worker & proof generation

**Goal:** proof bisa dibuat secara terprogram, bukan manual.

- [x] Scaffold `worker/` (Node + TypeScript + viem) — **selesai 4 Sep**
- [x] Listener: `eth_getLogs` pada alamat probe, filter topic0 — plus `LiquidationCall` dari Aave Pool, disaring ke pemegang polis aktif
- [x] Attestation waiter: polling sampai block sumber ter-attest, dengan retry dan log yang jelas
- [x] Proof builder: generate continuity + merkle proof dari tx hash
- [x] Simpan hasil proof ke file JSON — `npm run worker -- prove <tx> [file]`

**DoD:** `npm run worker` menghasilkan proof yang valid dari tx hash Sepolia.

**Status 4 Sep:** worker selesai dan `status` sudah dijalankan terhadap endpoint
asli — Sepolia, Proof Builder, dan Creditcoin ketiganya menjawab. Yang belum bisa
dijalankan hanyalah perintah yang butuh tx hash dari probe yang sudah di-deploy,
jadi DoD ini tertahan di blocker yang sama dengan Hari 2, bukan di kodenya.

Keputusan yang diambil: REST langsung, bukan `@gluwa/usc-sdk`. Bentuk responsnya
sudah diverifikasi live, dan SDK menyeret ethers ke project yang seluruh sisanya
memakai viem. Kalau perlu pindah, hanya `src/attestcoin.ts` yang berubah.

**Stop signal:** attestation waiter tidak pernah selesai. → Cek apakah block sudah final. Kalau memang macet, tanya di channel developer sekarang juga, jangan tunggu besok.

---

## Hari 4 — 30 Agustus — ASC menerima proof asli

**Goal:** jembatan tersambung untuk pertama kalinya.

- [ ] Deploy `AniWereASC` ke Creditcoin Testnet
- [ ] Worker submit `submitPositionProof` dengan proof asli
- [ ] Verifikasi `latestSnapshot` terisi angka yang benar di Creditcoin
- [ ] Uji jalur gagal: kirim proof yang dirusak, pastikan revert
- [ ] Uji anti-replay: kirim proof yang sama dua kali, pastikan revert

**DoD:** posisi Aave dari Sepolia tersimpan on-chain di Creditcoin lewat proof asli.

**Stop signal:** decoding log gagal. → Kemungkinan besar bentuk return precompile berbeda dari asumsi. Perbaiki adapter, jangan tambal di ASC.

**Ini titik paling menentukan di seluruh sprint.** Kalau Hari 4 selesai, sisanya sebagian besar sudah bisa dites lokal.

---

## Hari 5 — 31 Agustus — Cover flow

**Goal:** uang bisa masuk.

- [ ] Fund `CoverVault` lewat `depositCapital()`
- [ ] `buyCover` dari wallet asli di Creditcoin
- [ ] Verifikasi solvency guard bekerja: coba beli melebihi modal, harus revert
- [ ] Verifikasi guard HF: coba beli dengan snapshot HF rendah, harus revert
- [ ] Verifikasi `expirePolicy` melepas modal yang terkunci

**DoD:** polis bisa dibeli on-chain dan terbaca lewat `policies(address)`.

**Stop signal:** tidak ada. Bagian ini murni logic lokal dan risikonya rendah.

---

## Hari 6 — 1 September — Likuidasi & payout

**Goal:** bintang utama demo bekerja.

Ini hari tersulit setelah Hari 1. Mulai pagi.

- [ ] Turunkan HF posisi Sepolia sampai di bawah 1 (borrow tambahan, atau turunkan harga oracle kalau pakai fork)
- [ ] Tulis liquidator script sendiri, jangan berharap ada bot yang lewat
- [ ] Picu `liquidationCall`, konfirmasi event muncul di Etherscan
- [ ] Worker deteksi, build proof, submit `submitLiquidationClaim`
- [ ] Konfirmasi payout masuk ke wallet holder di Creditcoin
- [ ] Simpan semua tx hash untuk bahan demo dan cadangan rekaman

**DoD:** CTC berpindah ke wallet user karena event `LiquidationCall` di Ethereum. Tidak ada intervensi manual.

**Stop signal:** likuidasi tidak bisa dipicu sampai sore. → Pindah ke fork Aave dengan mock oracle malam ini. Jangan habiskan Hari 7 untuk ini.

---

## Hari 7 — 2 September — Frontend inti

**Goal:** flow bisa dijalankan orang lain tanpa terminal.

- [ ] Wagmi config dua chain: Sepolia + Creditcoin Testnet
- [ ] Halaman Position: connect, probe, tampilkan snapshot terverifikasi
- [ ] Halaman Cover: quote premi, beli, tampilkan polis aktif
- [ ] Health alert kalau HF di bawah threshold
- [ ] Tombol "Submit Claim Manually" sebagai cadangan kalau worker mati saat demo

**DoD:** beli cover bisa dilakukan dari browser, dari awal sampai akhir.

**Stop signal:** waktu habis. → Buang styling, sisakan fungsionalitas. Judge menilai integrasi, bukan CSS.

---

## Hari 8 — 3 September — Proof Explorer & demo

**Goal:** rantai bukti terlihat tanpa perlu dijelaskan.

- [ ] Halaman Proof Explorer: source tx → block → attested → continuity ✓ → merkle ✓ → Creditcoin tx
- [ ] Link keluar ke Etherscan dan Creditcoin explorer di tiap tahap
- [ ] Jalankan demo script utuh dari awal, catat di mana yang tersendat
- [ ] Siapkan state cadangan yang sudah diverifikasi, untuk berjaga saat rekaman
- [ ] **Kunci fitur.** Apa pun yang belum jadi hari ini, dibuang.

**DoD:** demo 5 menit bisa dijalankan dari awal sampai akhir tanpa panik.

Proof Explorer adalah halaman yang paling menentukan penilaian. Kalau harus memilih antara ini dan styling halaman lain, pilih ini.

---

## Hari 9 — 4 September — Dokumentasi

**Goal:** juri paham tanpa kamu di sebelahnya.

- [ ] Perbarui README: alamat kontrak asli, hasil test, tx hash bukti
- [ ] Technical writeup: bagaimana Attestcoin dipakai, apa yang dibuktikan, apa yang tidak
- [ ] Render diagram jadi PNG, sematkan di README
- [ ] Bagian keterbatasan dan roadmap, lengkap dengan sebabnya
- [ ] Rapikan repo: hapus kode mati, pastikan `.env` tidak ikut ter-commit

**DoD:** orang asing bisa membaca README dan mengerti apa yang dibangun dan kenapa.

---

## Hari 10 — 5 September — Rekam & submit

- [ ] Rekam video demo (target 4–5 menit)
- [ ] Isi form submission DoraHacks
- [ ] Cek ulang semua link bisa dibuka dari incognito

---

## Rekap 4 September (Hari 9)

Selesai hari ini:

- **Worker** dibangun penuh dan diverifikasi terhadap endpoint asli. Ini deliverable Hari 3 yang tidak pernah dikerjakan.
- **Framing latency diperbaiki** di CLAUDE.md, README, dan PRD. Pengukuran ketiga hari ini (40 blok di belakang head, 34 di depan `finalized`) mengonfirmasi dua pengukuran sebelumnya. Kalimat "within one Creditcoin block of Ethereum finality" dibuang karena menjanjikan jaminan yang protokolnya tidak berikan.
- **Frontend berhenti menampilkan angka karangan tanpa label.** Pill blok di header dan panel attestation di Proof Explorer sekarang dibaca dari jaringan asli tanpa wallet; sisanya diberi banner "sample data".
- **README ditulis ulang** dengan status jujur di paling atas.
- **`docs/DEMO.md`** — runbook dari wallet kosong sampai rekaman selesai, termasuk apa yang direkam kalau likuidasi tidak bisa dipicu.

Yang tersisa, dan semuanya satu blocker yang sama:

> **Wallet + faucet.** Hari 2, 4, 5, 6 semuanya tertahan di sini. Tidak satu pun tertahan di kode.

Kalau wallet ada besok pagi, `docs/DEMO.md` memperkirakan 90 menit sampai payout
terbukti. Kalau tidak ada, yang disubmit adalah repo dengan 16 test hijau, jalur
Attestcoin yang terbukti hidup lewat `eth_call`, worker yang jalan, dan dokumentasi
yang menyebut sendiri apa yang belum terbukti. Itu bukan submission yang buruk —
tapi jelas lebih lemah, dan bedanya cuma satu faucet.
- [ ] **Submit.** Jangan menunggu besok.

---

## Urutan pemotongan scope

Kalau tertinggal, potong dari bawah. Jangan improvisasi urutan baru saat panik.

| Prioritas | Komponen | Boleh dibuang? |
|---|---|---|
| 1 | Verifikasi proof di ASC | Tidak pernah. Ini syarat hackathon |
| 2 | Liquidation claim + payout | Tidak. Ini bintang utamanya |
| 3 | Buy cover | Hanya kalau Hari 5 gagal total |
| 4 | Position probe + snapshot | Bisa, kalau harus memilih antara ini dan payout |
| 5 | Proof Explorer | Jangan. Ini yang menjual ke juri |
| 6 | Health alert | Bisa |
| 7 | Styling | Buang duluan |

---

## Yang perlu dijaga selama coding

- **Jangan tambahkan admin function.** Tidak ada `owner`, `pause`, atau withdraw untuk tim. Ini klaim utama produk, dan sekali dilanggar, seluruh pitch runtuh.
- **Jangan hitung ulang health factor** dengan sumber harga selain Aave.
- **`test_RejectsLiquidationFromWrongEmitter` harus selalu hijau.** Kalau gagal setelah refactor, berhenti dan perbaiki. Itu satu-satunya penghalang antara vault dan kontrak palsu di Sepolia.
- **Jangan tulis "real-time"** di kode, UI, README, atau pitch.
- **Isolasi ketidakpastian Attestcoin di adapter.** Kalau kamu mulai menambal di `AniWereASC`, arsitekturnya sedang bocor.
