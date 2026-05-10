/**
 * collections/electives.mjs
 * Importuje przedmioty obieralne do kolekcji `electives`.
 *
 * Klucz upsert: { elective_type, tryb_studiow, is_stary, lang }
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../utils/mongo-client.mjs';
import { readJsonBom } from '../utils/read-json.mjs';
import { upsertMany } from '../utils/upsert.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '../../..');

const SOURCES = [
  // ─── Nowe stacjonarne ─────────────────────────────────────────────────────
  {
    file: 'frontend/public/assets/electives-other.json',
    elective_type: 'other',
    tryb_studiow: 'stacjonarny',
    is_stary: false,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/electives-other-en.json',
    elective_type: 'other',
    tryb_studiow: 'stacjonarny',
    is_stary: false,
    lang: 'en',
  },
  {
    file: 'frontend/public/assets/electives-specializations.json',
    elective_type: 'specializations',
    tryb_studiow: 'stacjonarny',
    is_stary: false,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/electives-specializations-en.json',
    elective_type: 'specializations',
    tryb_studiow: 'stacjonarny',
    is_stary: false,
    lang: 'en',
  },
  // ─── Nowe niestacjonarne ──────────────────────────────────────────────────
  {
    file: 'frontend/public/assets/niestacjonarne/electives-other.json',
    elective_type: 'other',
    tryb_studiow: 'niestacjonarny',
    is_stary: false,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/niestacjonarne/electives-other-en.json',
    elective_type: 'other',
    tryb_studiow: 'niestacjonarny',
    is_stary: false,
    lang: 'en',
  },
  {
    file: 'frontend/public/assets/niestacjonarne/electives-specializations.json',
    elective_type: 'specializations',
    tryb_studiow: 'niestacjonarny',
    is_stary: false,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/niestacjonarne/electives-specializations-en.json',
    elective_type: 'specializations',
    tryb_studiow: 'niestacjonarny',
    is_stary: false,
    lang: 'en',
  },
  // ─── Stare stacjonarne ────────────────────────────────────────────────────
  {
    file: 'frontend/public/assets/stary/stac/electives-other.json',
    elective_type: 'other',
    tryb_studiow: 'stacjonarny',
    is_stary: true,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/stary/stac/electives-specializations.json',
    elective_type: 'specializations',
    tryb_studiow: 'stacjonarny',
    is_stary: true,
    lang: 'pl',
  },
  // ─── Stare niestacjonarne ─────────────────────────────────────────────────
  {
    file: 'frontend/public/assets/stary/nstac/electives-other.json',
    elective_type: 'other',
    tryb_studiow: 'niestacjonarny',
    is_stary: true,
    lang: 'pl',
  },
  {
    file: 'frontend/public/assets/stary/nstac/electives-specializations.json',
    elective_type: 'specializations',
    tryb_studiow: 'niestacjonarny',
    is_stary: true,
    lang: 'pl',
  },
];

export async function importElectives() {
  const db = await getDb();
  const col = db.collection('electives');

  // Indeksy
  await col.createIndex(
    { elective_type: 1, tryb_studiow: 1, is_stary: 1, lang: 1 },
    { unique: true }
  );
  await col.createIndex({ 'groups.items.code': 1 });
  await col.createIndex({ 'specializations.items.code': 1 });

  const docs = [];

  for (const source of SOURCES) {
    const filePath = join(REPO_ROOT, source.file);
    const data = readJsonBom(filePath, source.file);
    if (!data) continue;

    docs.push({
      elective_type: source.elective_type,
      tryb_studiow: source.tryb_studiow,
      is_stary: source.is_stary,
      lang: source.lang,
      _source: source.file,
      ...data,
    });

    console.log(
      `  [electives] ${source.elective_type} ${source.tryb_studiow} lang=${source.lang}` +
      `${source.is_stary ? ' [stary]' : ''} → upserted/modified`
    );
  }

  const { upserted, modified } = await upsertMany(
    col,
    docs,
    ['elective_type', 'tryb_studiow', 'is_stary', 'lang']
  );

  console.log(
    `[electives] Razem: ${docs.length} dokumentów ` +
    `(upserted: ${upserted}, modified: ${modified})`
  );

  return docs.length;
}
