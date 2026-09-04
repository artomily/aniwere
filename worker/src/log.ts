/**
 * Logger sekali pakai.
 *
 * Worker ini akan dijalankan sambil ditonton orang saat demo, dan sebagian
 * langkahnya memakan waktu menit-menitan. Setiap baris harus menjawab
 * "sekarang sedang apa" tanpa perlu membaca kode.
 */
const stamp = () => new Date().toISOString().slice(11, 19);

export const log = {
  step: (m: string) => console.log(`[${stamp()}] ·  ${m}`),
  ok: (m: string) => console.log(`[${stamp()}] ✓  ${m}`),
  warn: (m: string) => console.warn(`[${stamp()}] !  ${m}`),
  err: (m: string) => console.error(`[${stamp()}] ✕  ${m}`),
  info: (m = "") => console.log(m),
};
