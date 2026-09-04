# Attestcoin — Catatan Validasi

**27 Agustus 2026, diperbarui 4 September.** Semua angka di dokumen ini diambil dari pemanggilan live, bukan dari dokumentasi.
Kalau ada yang berbeda dengan `docs/PRD.md`, dokumen ini yang benar.

Sumber kanonik: [`gluwa/attestcoin-protocol-examples`](https://github.com/gluwa/attestcoin-protocol-examples)
(diperbarui 25 Agustus 2026), npm `@gluwa/usc-contracts` dan `@gluwa/usc-sdk`.

---

## 1. Signature asli precompile

`IAttestcoinProver.sol` kita **salah bentuk**. Ini yang sebenarnya, disalin dari
`contracts/sol/VerifierInterface.sol` di repo contoh:

```solidity
interface INativeQueryVerifier {
    struct MerkleProofEntry { bytes32 hash; bool isLeft; }
    struct MerkleProof      { bytes32 root; MerkleProofEntry[] siblings; }
    struct ContinuityProof  { bytes32 lowerEndpointDigest; bytes32[] roots; }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);

    function calculateTxIndex(MerkleProof calldata merkle_proof) external view returns (uint64);
}

library NativeQueryVerifierLib {
    address constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000FD2;
}
```

Precompile kedua, untuk worker dan monitoring:

| Precompile | Alamat | Isi |
|---|---|---|
| Block Prover | `0x0000000000000000000000000000000000000FD2` | `verifyAndEmit`, `calculateTxIndex` |
| Chain Info | `0x0000000000000000000000000000000000000FD3` | `get_supported_chains`, `is_height_attested`, `get_latest_attestation_height_and_hash` |

Perhatikan: Chain Info memakai penamaan `snake_case`, Block Prover `camelCase`. Bukan salah ketik.

---

## 2. Empat perbedaan yang mengubah kode kita

### 2.1 Prover tidak mengembalikan log

Ini yang terpenting. Placeholder kita mengandaikan:

```solidity
returns (uint256 sourceBlockNumber, VerifiedLog[] memory logs)   // TIDAK ADA
```

Yang asli mengembalikan `bool` saja. Log harus **kita decode sendiri** dari `encodedTransaction`,
memakai library `EvmV1Decoder`:

```solidity
EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
require(receipt.receiptStatus == 1, "source tx reverted");
EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(receipt, TOPIC);
```

Kabar baiknya, `LogEntry` sama persis bentuknya dengan `VerifiedLog` kita:

```solidity
struct LogEntry { address address_; bytes32[] topics; bytes data; }
```

Jadi `_findLog` **tidak perlu diubah logikanya**, cukup ganti tipe. Aturan emitter + topic0 tetap utuh.

Catatan keamanan: `getLogsByEventSignature` menyaring **topic0 saja**, tidak mengecek emitter.
Contoh resmi `ASCMinter` pun tidak mengeceknya — mereka bersandar pada mapping `wrappedTokens`.
Cek emitter kita lebih ketat daripada contoh resmi, dan itu memang harus dipertahankan.

### 2.2 `sourceBlockNumber` berubah dari output jadi input

Dulu prover yang memberi tahu kita nomor blok. Sekarang `height` adalah parameter yang kita kirim.

Ini tetap aman: kalau `height` salah, proof-nya gagal. Sudah diuji, lihat bagian 4.
Jadi `height` terikat pada proof, bukan klaim bebas dari pemanggil.

### 2.3 `verifyAndEmit` bukan `view`

Fungsi ini mengubah state dan meng-emit `TransactionVerified`. Interface kita menandainya `view`.
Tidak masalah untuk `submitPositionProof` dan `submitLiquidationClaim` yang memang state-changing,
tapi `view` harus dilepas atau kontrak tidak akan ter-compile.

### 2.4 Precompile tidak punya bytecode

```
cast code 0x...0FD2 --rpc-url <creditcoin>  ->  0x
```

Wajar untuk precompile pallet-evm, tapi ada konsekuensinya:

- Jangan pernah pakai `address.code.length > 0` sebagai sanity check di constructor.
- Fork test Foundry tidak bisa memanggil precompile ini. `MockProver` tetap diperlukan.
  Untuk Hari 2, `vm.etch` sebuah mock ke `0x...0FD2` adalah pendekatan yang paling mendekati aslinya.

---

## 3. Anti-replay: pola resmi vs pola kita

`ASCBase` memakai `queryId` yang mengikat chainKey, blockHeight, dan txIndex:

```solidity
uint256 txIndex = VERIFIER.calculateTxIndex(merkleProof);
queryId = keccak256(abi.encodePacked(chainKey, blockHeight, txIndex));  // 72 byte, via assembly
```

`AniWereASC` sudah punya `usedProofs[proofId]`. Perlu dipastikan Hari 4 bahwa `proofId` kita
mengikat ketiga komponen yang sama. Kalau `proofId` hanya hash dari raw transaction,
transaksi yang sama masih bisa dikirim ulang lewat blok berbeda.

---

## 4. Hasil pengukuran live

### Precompile menerima proof asli

Diambil transaksi Sepolia sungguhan (`0x3429c1aa…3f4d7e`, blok 11576800), proof dibuat lewat
Proof Builder, lalu `verifyAndEmit` disimulasikan dengan `eth_call` ke `0x...0FD2`:

```
-> 0x0000000000000000000000000000000000000000000000000000000000000001   (true)
```

Tidak butuh wallet dan tidak butuh gas. `eth_call` cukup untuk membuktikan jalur verifikasi hidup.

### Proof rusak selalu revert

Empat vektor, empat revert. Precompile **revert**, tidak mengembalikan `false`:

| Yang dirusak | Hasil |
|---|---|
| merkle root | `revert Merkle proof validation failed` |
| lowerEndpointDigest | `revert Continuity proof does not match attestation or checkpoint` |
| satu byte di `encodedTransaction` | `revert Merkle proof validation failed` |
| `height` digeser satu blok | `revert Continuity proof does not match attestation or checkpoint` |

Asumsi desain kita bahwa "prover harus revert, jangan kembalikan bool yang bisa diabaikan"
ternyata sesuai perilaku aslinya. `require(verified)` tetap ditulis sebagai sabuk pengaman kedua.

### Chain key Sepolia = 1

Dari `get_supported_chains()` di `0x...0FD3`:

```
[(3, 1, "Ethereum", 1), (1, 11155111, "Sepolia ethereum", 1)]
   ^chainKey ^chainId              ^chainKey ^chainId
```

**chainKey Sepolia adalah 1, bukan 11155111.** Ini sumber bug yang gampang terjadi.

### Latency sebenarnya lebih baik dari dugaan kita

Satu sampel, diukur bersamaan:

| | Blok |
|---|---|
| Sepolia head | 11576910 |
| Sepolia `finalized` | 11576840 |
| Ter-attest di Creditcoin (chainKey 1) | **11576870** |

Attestation tertinggal ~40 blok dari head, sekitar **8 menit** — dan **30 blok di depan
`finalized`**. Komentar di SDK juga menyebut "about 8 minutes".

Dua konsekuensi:

1. Angka "~13–15 menit" di PRD terlalu pesimistis. Sekitar 8 menit lebih dekat ke kenyataan.
2. Lebih penting: **attestation berjalan mendahului finality Ethereum.** Jadi framing
   "verified within one Creditcoin block of Ethereum finality" secara teknis tidak akurat —
   Attestcoin tidak menunggu finality. Ini perlu diputuskan sebelum masuk pitch,
   karena menyangkut klaim keamanan, bukan sekadar angka.

### Pengukuran kedua, 4 September

Diambil lewat `npm run worker -- status`, jadi kali ini alat ukurnya adalah kode
yang benar-benar dipakai worker, bukan perintah manual:

| | Blok |
|---|---|
| Sepolia head | 11630928 |
| Sepolia `finalized` | 11630865 |
| Ter-attest di Creditcoin (chainKey 1) | **11630890** |

Lag 38 blok di belakang head (~8 menit), dan **25 blok di depan `finalized`**.
Delapan hari berselang, angkanya praktis identik dengan 27 Agustus: 40 vs 38 blok
di belakang head, 30 vs 25 blok di depan finalized.

Dua sampel, dua alat ukur berbeda, kesimpulan sama. Cukup untuk masuk README:

1. **~8 menit**, bukan 13–15 menit.
2. **Attestcoin tidak menunggu finality Ethereum.** Ini bukan detail angka,
   ini soal klaim keamanan — lihat bagian 8.

---

## 5. Endpoint dan konstanta CC3 Testnet

| Nama | Nilai |
|---|---|
| Creditcoin RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Creditcoin chainId | `102031` |
| Proof Builder | `https://prover.cc3-testnet.creditcoin.network` |
| chainKey Sepolia | `1` |

Endpoint Proof Builder yang dipakai worker:

```
GET /api/v1/attested-height/{chainKey}
GET /api/v1/proof-by-tx/{chainKey}/{txHash}
GET /api/v1/proof-batch-by-tx
```

`GET /health` mengembalikan 404. Pakai `/api/v1/attested-height/1` untuk liveness check.

Bentuk respons `proof-by-tx`, ini yang masuk ke kontrak:

```jsonc
{
  "chainKey": 1,
  "headerNumber": 11576800,        // -> height
  "txIndex": 0,
  "txBytes": "0x…",                // -> encodedTransaction (~5 KB)
  "merkleProof":     { "root": "0x…", "siblings": [{ "hash": "0x…", "isLeft": false }] },
  "continuityProof": { "lowerEndpointDigest": "0x…", "roots": ["0x…"] }
}
```

Ukuran calldata untuk satu proof: **~6 KB**. Perlu diingat saat estimasi gas Hari 4.
Contoh resmi memakai buffer gas 35% dan fallback `21000 + 5000*jumlahRoot + 20000`
karena estimasi gas ke precompile sering gagal walaupun call-nya sendiri berhasil.

---

## 6. Dependensi

```
@gluwa/usc-contracts  0.1.2     // pin di sini, JANGAN 0.2.0
@gluwa/usc-sdk        0.18.0
ethers                ^6.17.0
```

Alasan pin: `EvmV1Decoder.sol` pindah lokasi antar versi.

| Versi | Path import |
|---|---|
| 0.1.2 | `@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol` |
| 0.2.0 | `@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol` |

Dokumentasi resmi memakai path 0.1.2. Repo contoh juga pin 0.1.2.

SDK untuk worker Hari 3:

```ts
import { proofProvider, chainInfo } from '@gluwa/usc-sdk';

const builder = new proofProvider.service.ProofBuilder(chainKey, proofBuilderUrl);
const info    = new chainInfo.PrecompileChainInfoProvider(creditcoinRpc);

await builder.waitUntilHeightAttested(chainKey, blockNumber, 15_000, 1_200_000);
const proof = await builder.getProof(txHash);
```

Timeout 20 menit dengan polling 15 detik adalah angka yang dipakai contoh resmi. Pakai itu.

---

## 7. Aave V3 Sepolia — terverifikasi on-chain

Bukan disalin dari dokumentasi. `PoolAddressesProvider.getPool()` dipanggil langsung:

| Kontrak | Alamat |
|---|---|
| PoolAddressesProvider | `0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A` |
| **Pool** | **`0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`** |
| AaveOracle | `0x2da88497588bf89281816106C7259e31AF45a663` |
| ProtocolDataProvider | `0x3e9708d80f7B3e43118013075F7e95CE3AB31F31` |

`getPool()` dan `getPriceOracle()` keduanya cocok dengan `bgd-labs/aave-address-book`. Sudah diisi ke `.env.example`.

---

## 8. Framing latency: apa yang sebenarnya boleh diklaim

Aturan 5 di `CLAUDE.md` menyuruh memakai kalimat
*"verified within one Creditcoin block of Ethereum finality"*. Dua pengukuran di
bagian 4 menunjukkan kalimat itu **tidak akurat**, dan arah ketidakakuratannya
adalah arah yang berbahaya: ia terdengar seperti janji keamanan yang tidak kami tepati.

Attestation berjalan **mendahului** finality Ethereum sekitar 25–30 blok. Jadi
proof bisa lolos untuk blok yang secara teknis masih bisa ter-reorg. Peluangnya
kecil — 25 blok jauh di luar kedalaman reorg yang wajar di Ethereum — tapi
"kecil" bukan "nol", dan mengklaim finality-gated ketika bukan itu yang terjadi
adalah klaim yang salah, bukan sekadar konservatif.

Yang akurat, dan tetap kuat:

> **Verified one Creditcoin block after the source block is attested — about
> 8 minutes after it lands on Ethereum.**

Larangan menulis "real-time" tetap berlaku dan tidak berubah.

Yang berubah dari asumsi awal: reorg Ethereum adalah risiko sisa yang nyata,
sekecil apa pun, dan tempatnya di bagian keterbatasan README — bukan
disembunyikan di balik kata "finality".

---

## 9. Yang masih terbuka

- [ ] Wallet + faucet Creditcoin Testnet. Butuh tangan manusia. **Ini satu-satunya blocker yang tersisa untuk semua deployment.**
- [ ] Signature event `TransactionVerified` yang di-emit `verifyAndEmit`. Diperlukan Hari 8 untuk Proof Explorer.
- [ ] Apakah likuidasi bisa dipicu di Aave V3 Sepolia. Risiko Hari 6.
- [x] ~~Ukur ulang lag attestation beberapa kali sebelum menaruh angka di README.~~ Selesai 4 Sep, dua sampel, lihat bagian 4.
