# BAYSHORE HEAT — Cover Studio

A self-contained, offline cover-art studio for building bold, multi-panel
"video game cover" posters from your own photos. Everything runs locally in
the browser — no network calls, no uploads, no external assets. All artwork,
lettering and effects are drawn in code/CSS; no third-party logos, artwork or
fonts are used.

## What it does

- **Collage editor** — arrange one photo across several panels or several
  photos into one cover, with per-panel crop and position control, a portrait
  anchor and a pop-out hero effect.
- **10 layouts** — including inked multi-panel, halftone title block, tilted
  snapshot and story-size arrangements.
- **Lettering** — retro-chrome extruded titles, bold caption templates
  (8 built in), cast role tags, a circular seal and a film-style billing block.
- **Finishes** — 8 sunset/neon "Vice" colour grades plus Painted and
  Poster Ink finishes, with grain and vignette.
- **Poster formulas** — 5 one-click recipes that set layout, grade and
  lettering together.
- **Editing workflow** — live preview, per-panel inspector, undo/redo.
- **Export** — one photo to a finished PNG in 1080×1080, 1080×1350 and
  1920×1080, or Export All three sizes at once. Two sample photos are bundled
  so the studio works out of the box.

## How to run

The app is static files under `app/` — open `app/index.html` in a desktop
browser, or serve the folder with the bundled preview server:

```sh
node serve.ts        # local preview of the studio
```

For the make.fun hand-in, `main.ts` is the entry point: it copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` using the
kit's `vendor/makefun-app.ts` helper.

## Layout of this repo

- `app/` — the studio itself (`index.html`, `style.css`, `src/` modules for
  the collage renderer, panels, grades, presets and shots; `samples/` photos)
- `screenshots/` — rendered shots of the studio and its exported covers
- `main.ts` / `serve.ts` — hand-in entry point / local preview server
- `research.md` — design notes and the competition teardown behind this build

## License

MIT — see `LICENSE`.
