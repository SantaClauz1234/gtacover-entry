// BAYSHORE HEAT — Cover Studio: the program that hands in our gta6-cover-art-01 entry.
//
// What this program does, in plain terms: the real work lives in app/, a folder of plain
// static files (index.html, its ES modules, one stylesheet and two sample photos) that a
// desktop browser runs fully offline. This program copies app/ and screenshots/ from
// beside itself into the output folder and then writes dossier.json there with
// buildDossier from the kit's vendor/makefun-app.ts (copied byte for byte, never edited),
// because the sealed gate rebuilds that dossier with its own copy of the same library and
// compares the two byte for byte.
//
// Run it the way the grader does, or locally with an output override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// It must produce identical bytes on both of the grader's runs, so it writes nothing
// time-dependent, random or machine-specific into the output: only the two copied trees
// and the dossier the library derives from them.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Counts the files under a folder, recursively, for the run summary printed below. */
function countFilesIn(folder: string): number {
  let total = 0;
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) total += countFilesIn(path);
    else total += 1;
  }
  return total;
}

/** The one-line summary a human sees when they hand the entry in by hand. */
function describeEntry(appFileCount: number, screenshotCount: number, dossierBytes: number): string {
  return `Bayshore Heat Cover Studio: ${appFileCount} app files, ${screenshotCount} screenshots, dossier written (${dossierBytes} bytes).`;
}

/**
 * A last sanity pass over what was just written: the dossier must be readable JSON
 * whose first screenshot is the cover, because a dossier that does not parse here
 * would only fail later, inside the sealed gate, where the fix costs a submission.
 * This reads the output back; it never changes a byte of it, so the grader's two
 * runs still produce identical files.
 */
function verifyWrittenDossier(outputFolder: string): number {
  const dossierPath = join(outputFolder, 'dossier.json');
  const parsed = JSON.parse(readFileSync(dossierPath, 'utf8')) as { images?: unknown; cover?: unknown };
  if (!Array.isArray(parsed.images) || parsed.images.length === 0 || parsed.cover !== 0) {
    throw new Error('dossier.json carries no cover image: the first screenshot is the cover the judge sees');
  }
  return statSync(dossierPath).size;
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const screenshotsSource = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(screenshotsSource)) {
  cpSync(screenshotsSource, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (reference/gate.json): text_max_bytes is the only
// one that shapes the dossier's bytes; the rest make this program refuse an entry the
// scorer would refuse anyway (too many or too-large screenshots, an app/ tree over its
// file, byte or path limits), so a bad tree fails here first, in the open.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(
  describeEntry(
    countFilesIn(join(outputDir, 'app')),
    countFilesIn(join(outputDir, 'screenshots')),
    verifyWrittenDossier(outputDir),
  ),
);
