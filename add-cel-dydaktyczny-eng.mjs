/**
 * add-cel-dydaktyczny-eng.mjs
 * Dla wszystkich plików sylabusów (stacjonarne + niestacjonarne)
 * dodaje pole `cel_dydaktyczny_eng` z tłumaczeniem na angielski
 * z istniejącego pola `cel_dydaktyczny`.
 *
 * Na razie tłumaczenie jest prostym placeholderem opartym na oryginalnym tekście,
 * tak żeby struktura JSON była kompletna i spójna. Teksty można potem dopracować
 * ręcznie tam, gdzie będzie to potrzebne.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const ROOTS = [
  join(__dir, 'public/assets/syllabusy'),
  join(__dir, 'public/assets/syllabusy-n')
];

function listJsonFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) continue;
    if (!name.toLowerCase().endsWith('.json')) continue;
    out.push(full);
  }
  return out;
}

function makeEnglishFromPolish(pl) {
  if (!pl) return '';
  // Tu można w przyszłości podmienić na prawdziwe tłumaczenie.
  // Na razie zostawiamy wyraźny placeholder, żeby wiadomo było, że
  // wymaga on dopracowania językowego.
  return `ENGLISH VERSION NEEDED: ${pl}`;
}

let updated = 0;
let skipped = 0;

for (const root of ROOTS) {
  let files;
  try {
    files = listJsonFiles(root);
  } catch {
    continue;
  }

  for (const path of files) {
    let raw = readFileSync(path, 'utf8');
    // Usuń ewentualny BOM
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // uszkodzony JSON – pomijamy, ale sygnalizujemy
      process.stderr.write(`PARSE ERROR: ${path}: ${e.message}\n`);
      skipped++;
      continue;
    }

    const syl = data.sylabus || data; // w większości plików jest `sylabus`, ale wspieramy też płaską strukturę

    if (!syl.cel_dydaktyczny) {
      // brak pola źródłowego – nie robimy nic
      skipped++;
      continue;
    }

    // jeśli już jest angielska wersja, nie nadpisujemy
    if (!syl.cel_dydaktyczny_eng) {
      syl.cel_dydaktyczny_eng = makeEnglishFromPolish(syl.cel_dydaktyczny);
      if (data.sylabus) data.sylabus = syl;
      updated++;

      writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
      process.stdout.write(`UPDATED: ${path}\n`);
    }
  }
}

process.stdout.write(`\nDone. Updated: ${updated}, skipped: ${skipped}.\n`);

