# Teardown — gta6-cover-art-01, recorded rebuild session

Rebuilt in this recorded session (branch `recorded-v1`, from anchor `0873ade`)
for the 21 Nov 17:30 WIB deadline. Pool $250 / 50 places. Format program/v1:
static offline app in `app/`, `main.ts` copies `app/` + `screenshots/` to the
output and writes `dossier.json` via the kit's `vendor/makefun-app.ts`
(byte-identical, never edited).

## What the kit says (RULES.txt + competition.yaml, read before writing)

- Pairwise judging, house model (GLM-5.3-Flash labelled superbot), no ties,
  margin 1–5. Criteria in order: (1) the art shown in the screenshots —
  multi-panel collage, bold caption lettering, sunset/neon grade; an entry
  whose screenshots show no exported cover loses; (2) any photo — user's own
  photos, crop/position per panel, one photo across several panels or several
  photos, editable caption; (3) fast and easy — photo to PNG in 1080×1080,
  1080×1350, 1920×1080; (4) polish — clear editor, live preview, lettering.
- Originality is a gate in practice: Rockstar logos, artwork or fonts lose.
  Everything here is drawn in code or CSS; fonts are local system stacks.
- The judge sees only a 1,536-token dossier view: one contact sheet
  (first screenshot large on top, fitted 768×480 — a landscape cover shows
  largest) plus a short source outline. Screenshots outweigh code; function
  names must describe what they do.
- House ladder strengths: 1-weak 0.05, 2-plain (starter) 0.24, 3-mid 0.51,
  4-strong 1.49, 5-pro 2.34, 6-elite 3.14, 7-ace 4.76. The ace tier wears
  inked panels, a halftone title block, a tilted snapshot layout, a story
  size and undo/redo — the feature floor this rebuild aims at or above.
- Gate caps: screenshots 3–4, each ≤256 KiB, long side ≤1280, short ≥480;
  dossier ≤1.5 MiB with text capped at 160 KiB; app ≤993 entries / 48 MiB;
  no reference may leave `app/`; LICENSE must be OSI-approved (MIT, root).

## Board vocabulary this design answers (from the earlier teardown)

Striped retro-chrome extruded titles, pop-out hero, per-panel crop with a
portrait anchor, cast role tags, a circular seal, a film-style billing block,
Painted / Poster Ink finishes, Export All in the three post sizes, one-click
poster formulas. Title "BAYSHORE HEAT" is our own and unused on the board.

## Build shape (three recorded stages)

- A: program/v1 hand-in, studio shell, upload/tray, scenery backdrops, basic
  collage renderer, sunset lettering, single-size export, shot scenes.
- B: 10 layouts, 8 Vice grades + Painted/Ink, retro-chrome lettering, seal,
  billing, role tags, stickers, halftone band, grain/vignette; gate preflight.
- C: per-panel inspector, pop-out hero, undo/redo, 5 poster formulas,
  8 caption templates, Export All, 4 rendered screenshots; dossier cap check.
