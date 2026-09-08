# video/ — demo video AniWere

Video demo 97 detik, dirender dengan [Remotion](https://remotion.dev). Narasi
dibuat dengan TTS bawaan macOS (`say`), jadi tidak ada layanan berbayar dan
tidak ada API key.

Output: `out/aniwere-demo.mp4` — 1920×1080, 30 fps, H.264 CRF 18.

---

## Menjalankan

```bash
cd video
npm install
npm run build     # voice + render, sekali jalan
```

Atau terpisah:

```bash
npm run voice     # generate VO + ukur durasi -> src/narration.json
npm run studio    # buka Remotion Studio, preview interaktif
npm run render    # render mp4
```

**`npm run voice` wajib dijalankan lebih dulu.** `src/narration.json` tidak
ikut di-commit, dan tanpanya `Video.tsx` tidak bisa menghitung durasi scene.

---

## Kenapa timing-nya tidak ditulis manual

Ini keputusan desain yang paling menentukan di project ini.

`scripts/build-voice.mjs` menjalankan `say`, mengonversi hasilnya ke WAV, lalu
mengukur durasi tiap klip dengan `ffprobe` dan menuliskannya ke
`src/narration.json`. `Video.tsx` membaca file itu dan menghitung panjang tiap
scene dari panjang audionya.

Konsekuensinya: **ubah kalimat narasi, jalankan `npm run voice`, render.** Tidak
ada satu pun angka durasi yang perlu disetel ulang. Yang tetap manual hanya
`head` dan `tail` di `PLAN` — ruang diam sebelum dan sesudah suara, karena itu
keputusan ritme, bukan konsekuensi audio.

Animasi di dalam scene juga disinkronkan ke kalimat, bukan ke angka acak.
Contohnya coretan di scene "masalah" dimulai pada 72% durasi klip `prob2`,
jadi mendarat tepat saat scene berikutnya mengucapkan *"removes all three"* —
dan tetap mendarat di sana kalau kalimatnya nanti dipanjangkan.

---

## Mengganti suara

```bash
VOICE="Daniel" npm run voice      # en_GB, laki-laki
VOICE="Karen"  npm run voice      # en_AU
RATE=155 npm run voice            # lebih lambat (default 168 wpm)
say -v '?'                        # lihat semua suara terpasang
```

Default `Samantha` (en_US). Kalau mau kualitas lebih tinggi dari TTS bawaan,
unduh suara *Enhanced* atau *Premium* lewat **System Settings → Accessibility →
Spoken Content → System Voice → Manage Voices**, lalu panggil namanya lewat
`VOICE=`.

---

## Aset

| File | Asal |
|---|---|
| `public/shots/*.png` | Screenshot UI asli, ditangkap headless Chrome pada 2× device scale |
| `public/shots/arch.png` | `docs/diagrams/1-arsitektur.png` |
| `src/forge.ts` | Output `forge test` sungguhan dari `contracts-creditcoin/` |

Screenshot ditangkap ulang begini (dev server harus jalan):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1600,1376 \
  --screenshot=public/shots/home.png http://localhost:3000
```

Set `devIndicators: false` di `next.config.ts` sebelum menangkap, supaya badge
Next tidak ikut masuk frame. Kembalikan setelahnya.

Aset di-capture 2×, jadi `Shot` boleh zoom sampai sekitar 1.8 tanpa pecah.

---

## Struktur

| File | Isi |
|---|---|
| `src/theme.ts` | Palet, diambil dari blok dark `app/globals.css` |
| `src/components.tsx` | Primitif: `Stage`, `Kinetic`, `Shot`, `Card`, `Terminal` |
| `src/scenes.tsx` | 11 scene, murni presentasi |
| `src/Video.tsx` | Jadwal: PLAN → durasi absolut → Sequence + Audio |
| `src/forge.ts` | Output test, disalin apa adanya |
| `scripts/build-voice.mjs` | TTS + pengukuran durasi |

---

## Catatan lisensi

Remotion **gratis untuk individu dan perusahaan kecil**, tapi butuh lisensi
berbayar untuk perusahaan di atas tiga orang. Untuk hackathon solo ini tidak
jadi masalah; kalau AniWere nanti jadi produk komersial dengan tim yang tumbuh,
cek <https://remotion.dev/license> sebelum memakai ulang pipeline ini.
