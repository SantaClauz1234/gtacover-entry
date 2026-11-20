// BAYSHORE HEAT — Cover Studio, recorded rebuild (program/v1 hand-in).
//
// This root program is the delivery driver, not the artwork itself. The artwork
// lives in app/ as plain static files that a desktop browser runs with no network.
// Here we mirror app/ and screenshots/ into the output directory and then ask the
// kit's own dossier library (vendor/makefun-app.ts, copied unchanged from the kit)
// to describe them in dossier.json. The sealed gate rebuilds that dossier with its
// own copy of the same library and compares bytes, so nothing here may add a
// timestamp, a random value or a machine-specific path to the output.
//
// Local run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Recursively counts regular files below a directory, for the hand-in summary. */
function countTreeFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countTreeFiles(join(dir, entry.name));
    else if (entry.isFile()) n += 1;
  }
  return n;
}

/**
 * Reads the dossier we just wrote back and refuses a hand-in whose cover slot is
 * empty. Failing here, in the open, is cheaper than failing inside the sealed gate.
 */
function assertDossierHasCover(dir: string): number {
  const raw = readFileSync(join(dir, 'dossier.json'), 'utf8');
  const parsed = JSON.parse(raw) as { images?: unknown; cover?: unknown };
  if (!Array.isArray(parsed.images) || parsed.images.length < 3 || parsed.cover !== 0) {
    throw new Error('dossier.json must list at least 3 screenshots with the first one as cover');
  }
  const bytes = Buffer.byteLength(raw);
  if (bytes > 1572864) throw new Error(`dossier.json is ${bytes} bytes, over the 1.5 MiB gate cap`);
  return bytes;
}

/**
 * Preflight against the gate's own caps, run on the source tree before a byte
 * is copied: every screenshot must be a JPEG/PNG of at most 256 KiB and the
 * app tree must stay far below its file ceiling. Catching an oversized capture
 * here keeps a doomed hand-in from ever reaching the sealed scorer.
 */
function preflightGateCaps(sourceRoot: string): void {
  const shotsDir = join(sourceRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    for (const name of readdirSync(shotsDir)) {
      const size = statSync(join(shotsDir, name)).size;
      if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB gate cap`);
    }
  }
  const appCount = countTreeFiles(join(sourceRoot, 'app'));
  if (appCount > 993) throw new Error(`app/ holds ${appCount} files, over the 993 gate cap`);
}

preflightGateCaps(here);
mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: dossier text cap, 4 screenshots of at most
// 256 KiB each, and the app tree limits. Refusing early keeps a bad tree out.
const dossierText = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossierText);

const appFiles = countTreeFiles(join(outDir, 'app'));
const shotFiles = countTreeFiles(join(outDir, 'screenshots'));
const dossierBytes = assertDossierHasCover(outDir);
console.log(`Bayshore Heat Cover Studio: ${appFiles} app files, ${shotFiles} screenshots, dossier ${dossierBytes} bytes.`);
