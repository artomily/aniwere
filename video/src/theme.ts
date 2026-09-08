/**
 * Palet diambil langsung dari blok dark di `app/globals.css`, bukan dikarang
 * ulang. Video dan produknya harus terlihat seperti barang yang sama.
 *
 * Ground-nya sengaja sedikit lebih gelap dari aplikasi: di layar penuh tanpa
 * chrome browser, #14161f terbaca agak abu. Turun ke #0b0d14 bikin screenshot
 * produknya "menyala" saat ditempel di atasnya.
 */

export const C = {
  ground: "#0b0d14",
  panel: "#1a1d28",
  surface: "#212533",
  line: "#2e3444",

  ink: "#eef0f6",
  ink2: "#a5abbd",
  ink3: "#7b8296",

  accent: "#5b8def",
  periwinkle: "#8b9bf0",
  safe: "#2fbfa2",
  coral: "#f2786f",
  caution: "#f0994d",
} as const;

/** Gradien aksen untuk teks besar dan garis. */
export const GRADIENT = `linear-gradient(100deg, ${C.accent} 0%, ${C.periwinkle} 55%, ${C.safe} 100%)`;

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/**
 * Easing standar seluruh video. Satu kurva dipakai di mana-mana supaya
 * gerakannya terasa satu tangan — ini yang membedakan motion graphic yang
 * rapi dari kumpulan animasi yang kebetulan berdekatan.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.55, 0, 1, 0.45] as const;

/** Spring yang enak untuk masuknya elemen: cepat, sedikit sekali overshoot. */
export const SPRING = { damping: 200, stiffness: 110, mass: 0.6 };
