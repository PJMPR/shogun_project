/**
 * collections/programs.mjs
 * Importuje programy studiów do kolekcji `programs`.
 *
 * Źródła:
 *   frontend/public/assets/program.json                       → stacjonarny, is_stary: false, lang: pl
 *   frontend/public/assets/program-en.json                    → stacjonarny, is_stary: false, lang: en
 *   frontend/public/assets/niestacjonarne/program.json        → niestacjonarny, is_stary: false, lang: pl
 *   frontend/public/assets/niestacjonarne/program-en.json     → niestacjonarny, is_stary: false, lang: en
 *   frontend/public/assets/stary/stac/program.json            → stacjonarny, is_stary: true, lang: pl
 *   frontend/public/assets/stary/nstac/program.json           → niestacjonarny, is_stary: true, lang: pl
 *
 * Klucz upsert: { tryb_studiow, is_stary, lang }
 */
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../utils/mongo-client.mjs';
import { readJsonBom } from '../utils/read-json.mjs';
import { upsertMany } from '../utils/upsert.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '../../..');

const SOURCES = [
  {
    file: 'frontend/public/assets/program.json',
    tryb_studiow: 'stacjonarny',
    is_stary: false,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/program-en.json',
    tryb_studiow: 'stacjonarny',
    is_stary: false,
    lang: 'en',
  },
  {
    file: 'frontend/public/assets/niestacjonarne/program.json',
    tryb_studiow: 'niestacjonarny',
    is_stary: false,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/niestacjonarne/program-en.json',
    tryb_studiow: 'niestacjonarny',
    is_stary: false,
    lang: 'en',
  },
  {
    file: 'frontend/public/assets/stary/stac/program.json',
    tryb_studiow: 'stacjonarny',
    is_stary: true,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/stary/nstac/program.json',
    tryb_studiow: 'niestacjonarny',
    is_stary: true,
    lang: 'pl',
  },
];

export async function importPrograms() {
  const db = await getDb();
  const col = db.collection('programs');

  // Indeksy
  await col.createIndex(
    { tryb_studiow: 1, is_stary: 1, lang: 1 },
    { unique: true }
  );
  await col.createIndex({ 'semesters.subjects.code': 1 });

  const docs = [];

  for (const source of SOURCES) {
    const filePath = join(REPO_ROOT, source.file);
    const data = readJsonBom(filePath, source.file);
    if (!data) continue;

    docs.push({
      tryb_studiow: source.tryb_studiow,
      is_stary: source.is_stary,
      lang: source.lang,
      _source: source.file,
      ...data,
    });

    console.log(
      `  [programs] ${source.tryb_studiow} lang=${source.lang}` +
      `${source.is_stary ? ' [stary]' : ''} → upserted/modified`
    );
  }

  const { upserted, modified } = await upsertMany(
    col,
    docs,
    ['tryb_studiow', 'is_stary', 'lang']
  );

  console.log(
    `[programs] Razem: ${docs.length} dokumentów ` +
    `(upserted: ${upserted}, modified: ${modified})`
  );

  return docs.length;
}
