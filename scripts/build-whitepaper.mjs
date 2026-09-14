/**
 * Render README.md jadi docs/pdf/AniWere-whitepaper.pdf.
 *
 *   npm run whitepaper
 *
 * Pakai Chrome yang sudah terpasang untuk mencetak, bukan library PDF: hasil
 * cetak Chrome identik dengan yang dilihat orang di browser, termasuk gambar
 * dan tabel, dan tidak menambah dependency berat ke project.
 *
 * Jalankan ulang setiap kali README berubah — PDF ini yang ditautkan dari
 * form DoraHacks, jadi PDF yang tertinggal dari README berarti juri membaca
 * versi lama.
 */

import { marked } from "marked";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(REPO, "docs", "pdf", "AniWere-whitepaper.pdf");

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!existsSync(CHROME)) {
  console.error(`Chrome tidak ditemukan di ${CHROME}. Set CHROME_PATH.`);
  process.exit(1);
}

const md = readFileSync(join(REPO, "README.md"), "utf8");

// Gambar relatif -> file:// absolut, supaya Chrome bisa memuatnya saat print.
const body = marked
  .parse(md)
  .replace(/src="(?!https?:|file:)([^"]+)"/g, (_, p) => `src="file://${resolve(REPO, p)}"`);

const html = `<!doctype html><html><head><meta charset="utf-8"><title>AniWere</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  :root { --ink:#14161f; --ink2:#4a5061; --ink3:#787f92; --line:#e2e5ee; --accent:#2563eb; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
         color: var(--ink); font-size: 10pt; line-height: 1.58; margin: 0; }
  h1 { font-size: 27pt; letter-spacing: -0.03em; margin: 0 0 6pt; }
  h2 { font-size: 15pt; letter-spacing: -0.02em; margin: 20pt 0 7pt;
       padding-top: 9pt; border-top: 1.5px solid var(--line); page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 13pt 0 4pt; page-break-after: avoid; }
  p, li { color: var(--ink2); }
  strong { color: var(--ink); }
  a { color: var(--accent); text-decoration: none; }
  code { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 8.6pt;
         background: #f3f5fa; padding: 1px 4px; border-radius: 3px; color: var(--ink); }
  pre { background: #f7f8fc; border: 1px solid var(--line); border-radius: 6px;
        padding: 9pt 11pt; overflow: hidden; page-break-inside: avoid; }
  pre code { background: none; padding: 0; font-size: 8pt; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin: 9pt 0; font-size: 8.8pt;
          page-break-inside: avoid; }
  th { text-align: left; background: #f3f5fa; font-size: 8pt; text-transform: uppercase;
       letter-spacing: 0.06em; color: var(--ink3); padding: 5pt 7pt; }
  td { padding: 5pt 7pt; border-top: 1px solid var(--line); vertical-align: top;
       color: var(--ink2); word-break: break-word; }
  img { max-width: 100%; page-break-inside: avoid; margin: 8pt 0; }
  blockquote { margin: 9pt 0; padding: 7pt 12pt; border-left: 3px solid var(--accent);
               background: #f5f8ff; color: var(--ink2); }
  blockquote p { margin: 0; }
  hr { display: none; }
  ol, ul { padding-left: 16pt; }
  li { margin: 2pt 0; }
</style></head><body>${body}</body></html>`;

const dir = mkdtempSync(join(tmpdir(), "aniwere-whitepaper-"));
const page = join(dir, "readme.html");
writeFileSync(page, html);

try {
  execFileSync(
    CHROME,
    ["--headless", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${OUT}`, `file://${page}`],
    { stdio: "ignore" },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`Ditulis: ${OUT}`);
