# Teardown — gta6-cover-art-01 "Make GTA 6 Cover Art"

Sesi build Step 2, 20 Nov 2026 malam WIB. Deadline: **21 Nov 17:30 WIB** (21 Nov 10:30 UTC).
Pool $250 / 50 tempat ($50 / $30 / $15, #4–10 $5, #11–50 $3). Format: program/v1 —
app statis offline di `app/`, `main.ts` menyalin `app/` + `screenshots/` ke output dan
menulis `dossier.json` via `vendor/makefun-app.ts` (byte-identik kit, tidak diubah).

## 1. Cara juri menilai (dari RULES.txt + competition.yaml kit)

- Pairwise, model house `z-ai/glm-5.3-flash` (label superbot, effort high), tanpa seri, margin 1–5.
- Kriteria berurutan — kriteria pertama yang berbeda memutuskan, kecuali berikutnya beda jauh:
  1. **The art** — cover yang DIEKSPOR di screenshot: kolase multi-panel, lettering caption
     tebal, grading sunset/neon Vice City. Tanpa exported cover di screenshot = kalah.
  2. **Any photo** — foto user sendiri, crop & posisi per foto/panel, beberapa panel diisi
     satu foto atau banyak foto, caption bisa diedit.
  3. **Fast & easy** — sedikit langkah dari foto ke PNG di 1080×1080, 1080×1350, 1920×1080.
  4. **Polish** — editor jelas, live preview, lettering & efek rapi.
- Originalitas = gerbang: logo/wordmark/artwork/font resmi Rockstar = kalah + diskualifikasi
  di finalist review top-10. Semua aset kita: gambar/CSS/SVG/canvas buatan sendiri + foto
  sampel kit yang bebas pakai.
- Juri hanya melihat dossier-view 1.536 token: **satu contact sheet JPEG** (screenshot
  pertama menurut nama di atas, fit 768×480 → cover landscape tampil paling besar; sisanya
  kecil di bawah) + **outline sumber yang sangat pendek** (nama file/fungsi + deklarasi
  pertama). Kesimpulan: screenshot >> kode, dan nama fungsi harus deskriptif
  (`drawPanelCollage`, `applyViceGradeToPanel`, `renderPosterTitleLettering`,
  `exportCoverPng`, `spreadPhotosAcrossPanels`).

## 2. Tangga house (kalibrasi resmi di competition.yaml)

| Tier | Nama | Strength | Isi |
|---|---|---|---|
| 1-weak | "caption it" | 0,050 | form polos, stempel caption 24px di foto ukuran asli |
| 2-plain | "Cover Snap" (starter) | 0,245 | 1 foto persegi, tint sunset, caption sans tebal, ekspor 1080×1080 saja |
| 3-mid | "Sunset Poster" | 0,507 | 1 foto, drag+zoom, 3 tint, 3 ukuran, Bebas Neue, frame putih |
| 4-strong | "Panel Press" | 1,493 | grid 4-panel, hero+3, full-bleed, gradient-map grades, Anton, frame putih |
| 5-pro | "Sunset Sleeve" | 2,340 | 6 layout, 5 grade, lettering gradien sunset + subtitle script neon, grain+vignette |
| 6-elite | "Palm Poster Lab" | 3,140 | grid 9-panel + title block, heat meter bintang, badge ribbon, semua ukuran sekaligus |
| 7-ace | "Neon Coast Cover Studio" | 4,761 | panel inked/banded ala poster, title block halftone, layout snapshot miring, ukuran story, undo/redo |

Target kita: **fitur ≥ 7-ace**, dengan judul orisinal sendiri (bukan nama house).

Starter sudah dilihat langsung (screenshot kit): cover 1 panel penuh "SUNSET HEIST" dengan
tint pink dari bawah, editor abu-abu polos "BOULEVARD QUEEN" — tanpa panel, tanpa kontrol
crop, tanpa multi-foto. Mengirim starter apa adanya = bermain sebagai house #2.

## 3. Papan publik (dev phase) — LIVE sesi ini, 20 Nov 18:4x WIB

Unduhan API sesi ini (`GET /api/competitions/gta6-cover-art-01/leaderboard`, header
`x-api-key`, tersimpan di `~/workspace/makefun/lb-cover-art-now.json`, 16 MB):
**5.505 entry** di papan (naik dari 3.319 di Step 1), @kei belum masuk.
Cutoff: **#1 = 95,18 · #50 = 92,31 · #100 = 90,87 · #200 = 87,85 · #500 = 82,34 ·
#1000 = 76,67** (garis final top-1.000). Zona hadiah #50 kini 92,31 — naik ±3,9 poin
dari Step 1 (88,41). Sepuluh besar malam ini:

| # | Handle | Judul (fitur yang dijual) | Judge |
|---|---|---|---|
| 1 | ryanp1632-netizen | Golden Mile Cover Studio v4 — framed crime-epic key art, hero close-up, **face-aware crops**, 5 grades, PNG 3 sizes | 95,18 |
| 2 | el-net | Palmline — multi-panel, **callouts, seal, billing block**, PNG 3 sizes | 95,06 |
| 3 | nightshift-labs | HEATWAVE — title over the art, **slanted panels**, sunset grade, sky glow, optional **Poster Ink**, per-panel crop | 94,81 |
| 4 | plntky | Billboard Bay — **pop-out hero cut-out on-device**, face-aware crops, **auto cast tags**, 3 sizes | 94,68 |
| 5 | limnhere | Neon Harbor — 7-panel **pop-out hero**, **striped retro-chrome titles**, **cast role tags**, face-aware crop, 8 grades | 94,68 |
| 6 | kiencx | Vice Poster Studio v2 — pop-out hero cut-out, **extruded striped-chrome title**, painted panels | 94,63 |
| 7 | regian1117 | Vice Cover Studio v3 — Twilight Gold Frame, striped retro-chrome 3D titles, role tags, 8 layouts, 6 grades | 94,56 |
| 8 | tungnguyen84 | Heat Wave — retro chrome title, role tags, **9 grades**, panel crop, export all 3 sizes | 94,22 |
| 9 | crisp-coyote-57 | Coral Heat Cover Studio | 94,17 |
| 10 | hazel-harbor-63 | SUNSET HEIST cover maker v3 | 94,17 |

**Kosakata pemenang BARU sejak Step 1** (ini yang harus diserang/dilampaui):
*striped retro-chrome title* (gradien pita krom + ekstrusi 3D), **pop-out hero**
(subjek panel hero menembus bingkai), **face/portrait-aware crop**, **cast role tags /
callouts** per panel, **seal** (lencana bundar) + **billing block** (blok kredit ala
poster film di kaki cover), **painted / Poster Ink panels**, **gold frame**.
Catatan nama: "Coral Heat" SUDAH dipakai rank-9 → judul kita ganti, lihat §4.

Kode/screenshot lawan `source_withheld`, tapi app ter-host rank atas (makefun.sh,
diintip Step 1) terbuka strukturnya: topbar langkah bernomor (1 Add photos →
2 Pick size → 3 Export), tombol **"Export all 3 sizes"**, tray foto + drop zone
("photos stay on your computer"), dan **inspector per panel**: slider zoom,
auto-center crop, replace photo, *fill all panels from this photo*, *spread photos
across panels*, drag-untuk-pan + scroll-untuk-zoom langsung di preview.
Itu lantai editor yang harus dilampaui, bukan disamai.

## 4. Daftar kesenjangan → target build kita ("BAYSHORE HEAT — Cover Studio")

Nama dicek ke papan live: "bayshore" = **0 entri** memakai (orisinal, tidak tabrakan);
"Coral Heat" gugur karena sudah dipakai rank-9.

1. **Poster utuh sejak dibuka** — bukan canvas kosong: poster multi-panel terisi foto
   sampel lokal + panel pemandangan prosedural (sunset/palma/skyline digambar canvas),
   title block, badge. Screenshot pertama langsung terbaca poster.
2. **Sistem panel ≥8 layout** — grid 9, hero+3, slashed diagonal, triptych, full-bleed +
   snapshot miring, polaroid tilted, story portrait, wide banner. Keyline putih tebal
   antar panel (ciri poster yang paling dikenali juri).
3. **Foto per panel** — multi-upload, drag pan di canvas, zoom slider+scroll, ganti foto
   per panel, *fill-all-from-one-photo* (crop berbeda per panel), *spread-across-panels*,
   auto-center + **jangkar crop portrait-aware** (anchor atas/tengah/bawah per panel —
   jawaban kita untuk klaim "face-aware crop" papan atas, tanpa model ML eksternal).
4. **Grading ≥8 grade bernama + Painted/Ink** — gradient-map/duotone (Sunset Boulevard,
   Neon Nights, Golden Hour, Teal Heat, Magenta Vice, Coral Dusk, Bayshore Gold, Noir)
   + mode Painted (posterize) dan Ink (kontras tepian), grain, vignette, sky glow.
5. **Lettering pemenang papan** — judul **striped retro-chrome**: isian gradien pita
   krom horizontal + ekstrusi offset bertumpuk + outline gelap; mode alternatif gradien
   sunset. Subtitle script neon, **heat meter bintang**, **seal bundar orisinal**
   ("BAYSHORE HEAT • ORIGINAL COVER • EST. 2026"), **billing block** kredit poster film
   di kaki, **cast role tags** per panel ("THE DRIVER", "THE DREAMER", … bisa diganti),
   preset caption sekali klik.
6. **Pop-out hero** — toggle: foto panel hero digambar menembus tepi atas bingkainya
   masuk ke area judul, dengan keyline tetap tergambar di sekeliling panel.
7. **Ekspor** — 1080×1080 + 1080×1350 + 1920×1080 + **Export All**, topbar langkah 1-2-3.
8. **Polish** — UI studio gelap-neon Vice, live preview, undo/redo, preset poster
   sekali klik ("poster formula"), kontrol grain/vignette/halftone title block.
8. **Screenshot** — #1 exported cover landscape 1920×1080, #2 editor kaya dengan foto
   termuat, #3 exported cover portrait 1080×1350 layout/grade beda, #4 cover persegi
   layout ketiga. Semua ≤256 KiB, sisi panjang ≤1280, sisi pendek ≥480.
10. **Kebersihan gate** — nol referensi keluar `app/`, nol CDN/font eksternal (font sistem
   lokal), nama file/fungsi deskriptif, total sumber di bawah cap teks dossier 160 KiB.

## 5. Batas keras gate (pengingat saat build)

- `app/` ≤993 file/dir, ≤48 MiB, `index.html` ≤1 MiB; semua referensi script/link/import
  harus file di dalam `app/` atau `data:` URI; tanpa network sama sekali.
- Screenshots 3–4 file, ≤256 KiB, PNG/JPEG utuh, panjang ≤1280, pendek ≥480.
- `dossier.json` byte-for-byte dari `buildDossier`; `main.ts` Node 22 stdlib-only,
  dua run byte identik; ≥1 baris authored di entrypoint; file entrypoint direvisi
  di ≥2 pesan berbeda (gerbang transkrip).
- Final hanya judge ulang top-1.000 papan dev; finalist review top-10 mencoba app
  sungguhan — cover di screenshot harus benar-benar bisa dihasilkan app.

## 6. Re-cek live sesi build — SELESAI

- Leaderboard diunduh sesi ini via curl (API key dari `~/workspace/makefun/api-key.json`,
  header `x-api-key`): `~/workspace/makefun/lb-cover-art-now.json` (16 MB, HTTP 200).
  Hasilnya adalah §3 versi live di atas: 5.505 entry, #50 = 92,31, #1000 = 76,67,
  @kei belum di papan. Satu percobaan unduh paralel via urllib menggantung di egress
  (pola lama make.fun dari VM ini) — curl adalah jalur yang terbukti, sesuai catatan
  `state.md` induk.
- Konsekuensi build: garis menang digeser — bukan lagi "samai 7-ace", tapi serang
  kosakata baru papan (chrome-striped title, pop-out hero, role tags, seal, billing
  block, painted panels) sambil menjaga semua lantai Step 1.
