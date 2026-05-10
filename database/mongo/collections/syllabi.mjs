/**
 * collections/syllabi.mjs
 * Importuje sylabusy do kolekcji `syllabi`.
 *
 * Źródła:
 *   frontend/public/assets/syllabusy/         → stacjonarny, is_stary: false
 *   frontend/public/assets/syllabusy-n/        → niestacjonarny, is_stary: false
 *   frontend/public/assets/stary/stac/sylabusy/ → stacjonarny, is_stary: true
 *   frontend/public/assets/stary/nstac/sylabusy/ → niestacjonarny, is_stary: true
 *
 * Klucz upsert: { kod_przedmiotu, tryb_studiow, is_stary }
 */
import { readdirSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../utils/mongo-client.mjs';
import { readJsonBom } from '../utils/read-json.mjs';
import { upsertMany } from '../utils/upsert.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '../../..');

const SOURCES = [
  {
    dir: join(REPO_ROOT, 'frontend/public/assets/syllabusy'),
    tryb_studiow: 'stacjonarny',
    is_stary: false,
  },
  {
    dir: join(REPO_ROOT, 'frontend/public/assets/syllabusy-n'),
    tryb_studiow: 'niestacjonarny',
    is_stary: false,
  },
  {
    dir: join(REPO_ROOT, 'frontend/public/assets/stary/stac/sylabusy'),
    tryb_studiow: 'stacjonarny',
    is_stary: true,
  },
  {
    dir: join(REPO_ROOT, 'frontend/public/assets/stary/nstac/sylabusy'),
    tryb_studiow: 'niestacjonarny',
    is_stary: true,
  },
];

export async function importSyllabi() {
  const db = await getDb();
  const col = db.collection('syllabi');

  // Indeksy
  await col.createIndex({ kod_przedmiotu: 1 });
  await col.createIndex({ tryb_studiow: 1, is_stary: 1 });
  await col.createIndex({ 'sylabus.rok_studiow': 1 });

  const counts = { stacjonarny: 0, niestacjonarny: 0, stary: 0, bledy: 0 };
  let totalDocs = 0;

  for (const source of SOURCES) {
    if (!existsSync(source.dir)) {
      console.warn(`[syllabi] WARN: katalog nie istnieje – ${source.dir}`);
      continue;
    }

    const files = readdirSync(source.dir).filter(f => f.toLowerCase().endsWith('.json'));
    const docs = [];

    for (const file of files) {
      const filePath = join(source.dir, file);
      const relPath = relative(REPO_ROOT, filePath).replace(/\\/g, '/');
      const data = readJsonBom(filePath, relPath);
      if (!data) { counts.bledy++; continue; }

      const sylabus = data.sylabus ?? data;
      const kod = sylabus?.kod_przedmiotu;
      if (!kod) {
        console.warn(`[syllabi] WARN: brak kod_przedmiotu w ${relPath}`);
        counts.bledy++;
        continue;
      }

      docs.push({
        kod_przedmiotu: kod,
        tryb_studiow: source.tryb_studiow,
        is_stary: source.is_stary,
        _source: relPath,
        sylabus,
      });
    }

    const { upserted, modified } = await upsertMany(
      col,
      docs,
      ['kod_przedmiotu', 'tryb_studiow', 'is_stary']
    );

    for (const doc of docs) {
      const tag = source.is_stary ? '[stary]' : '';
      console.log(`  [syllabi] ${doc.kod_przedmiotu} (${source.tryb_studiow})${tag} → upserted/modified`);
    }

    if (source.tryb_studiow === 'stacjonarny') counts.stacjonarny += docs.length;
    else counts.niestacjonarny += docs.length;
    if (source.is_stary) counts.stary += docs.length;
    totalDocs += docs.length;
  }

  console.log(
    `[syllabi] Razem: ${counts.stacjonarny} stacjonarnych, ` +
    `${counts.niestacjonarny} niestacjonarnych ` +
    `(w tym stare: ${counts.stary}), błędy: ${counts.bledy} ` +
    `→ ${totalDocs} dokumentów`
  );

  return totalDocs;
}
