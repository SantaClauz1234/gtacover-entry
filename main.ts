// BAYSHORE HEAT — Cover Studio, recorded-v2 hand-in driver.
//
// This root program is the delivery driver, not the artwork itself. The
// artwork lives in app/ as plain static files that a desktop browser runs
// with no network. This program mirrors app/ and screenshots/ into the
// output directory and asks the kit's own dossier library
// (vendor/makefun-app.ts, copied unchanged from the kit) to describe them in
// dossier.json. The sealed gate rebuilds that dossier with its own copy of
// the same library and compares bytes, so nothing here may add a timestamp, a
// random value or a machine-specific path to the output.
//
// Local run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAP_BYTES = 1572864;
const SHOT_CAP_BYTES = 262144;
const APP_FILE_CAP = 993;

// Walks a directory tree and returns how many regular files it holds.
function countFilesBelow(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) total += countFilesBelow(join(dir, entry.name));
    else if (entry.isFile()) total += 1;
  }
  return total;
}

// Preflight against the gate's own caps, run on the source tree before a
// byte is copied: every screenshot must be a JPEG/PNG of at most 256 KiB and
// the app tree must stay far below its file ceiling. Catching an oversized
// capture here keeps a doomed hand-in from ever reaching the sealed scorer.
function checkGateCaps(sourceRoot: string): void {
  const shotsDir = join(sourceRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    for (const name of readdirSync(shotsDir)) {
      const bytes = statSync(join(shotsDir, name)).size;
      if (bytes > SHOT_CAP_BYTES) {
        throw new Error(`screenshot ${name} is ${bytes} bytes, over the 256 KiB gate cap`);
      }
    }
  }
  const appFiles = countFilesBelow(join(sourceRoot, 'app'));
  if (appFiles > APP_FILE_CAP) {
    throw new Error(`app/ holds ${appFiles} files, over the ${APP_FILE_CAP} gate cap`);
  }
}

// Reads the dossier we just wrote back and refuses a hand-in whose cover
// slot is empty or whose dossier is over the cap. Failing here, in the open,
// is cheaper than failing inside the sealed gate.
function checkDossier(dir: string): number {
  const raw = readFileSync(join(dir, 'dossier.json'), 'utf8');
  const parsed = JSON.parse(raw) as { images?: unknown; cover?: unknown };
  if (!Array.isArray(parsed.images) || parsed.images.length < 3 || parsed.cover !== 0) {
    throw new Error('dossier.json must list at least 3 screenshots with the first one as cover');
  }
  const bytes = Buffer.byteLength(raw);
  if (bytes > DOSSIER_CAP_BYTES) {
    throw new Error(`dossier.json is ${bytes} bytes, over the 1.5 MiB gate cap`);
  }
  return bytes;
}

checkGateCaps(repoRoot);
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: dossier text cap, 4 screenshots of at most
// 256 KiB each, and the app tree limits. Refusing early keeps a bad tree out.
const dossierText = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: SHOT_CAP_BYTES },
  app_max_files: APP_FILE_CAP,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossierText);

const appFiles = countFilesBelow(join(outDir, 'app'));
const shotFiles = countFilesBelow(join(outDir, 'screenshots'));
const dossierBytes = checkDossier(outDir);
console.log(`Bayshore Heat Cover Studio: ${appFiles} app files, ${shotFiles} screenshots, dossier ${dossierBytes} bytes.`);
