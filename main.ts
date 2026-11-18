// Neon Harbor — the entrypoint for make.fun's gta6-01 (Node 22, standard library only).
// It hands the game in: the static files under game/ plus the screenshots/ the maker took,
// copied to /output, and a dossier.json the judge reads, written by the vendored make.fun
// library. Run it locally with MAKEFUN_OUTPUT_DIR set; the grader runs it with /output.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function totalBytes(dir) {
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const info = statSync(full);
    bytes += info.isDirectory() ? totalBytes(full) : info.size;
  }
  return bytes;
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Refuse to hand in a game that breaks the gate's own caps, instead of letting the
// scorer be the first to notice: 993 files / 48 MiB under game/, 4 shots at 256 KiB.
const gameBytes = totalBytes(join(outputDir, 'game'));
if (gameBytes > 48 * 1024 * 1024) throw new Error('game/ is ' + gameBytes + ' bytes, over the 48 MiB cap');
const shotNames = existsSync(join(outputDir, 'screenshots')) ? readdirSync(join(outputDir, 'screenshots')) : [];
if (shotNames.length > 4) throw new Error(shotNames.length + ' screenshots, at most 4 allowed');
for (const name of shotNames) {
  const size = statSync(join(outputDir, 'screenshots', name)).size;
  if (size > 256 * 1024) throw new Error('screenshot ' + name + ' is ' + size + ' bytes, over the 256 KiB cap');
}

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
