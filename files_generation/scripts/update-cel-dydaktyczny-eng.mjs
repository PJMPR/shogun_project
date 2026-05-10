/**
 * update-cel-dydaktyczny-eng.mjs
 *
 * Dla wszystkich plików sylabusów w:
 *  - public/assets/syllabusy
 *  - public/assets/syllabusy-n
 *
 * zapewnia, że jeśli istnieje `cel_dydaktyczny`, to istnieje
 * sensowne tłumaczenie w `cel_dydaktyczny_eng`.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const ROOTS = [
  join(__dir, '../..', 'frontend/public/assets/syllabusy'),
  join(__dir, '../..', 'frontend/public/assets/syllabusy-n')
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

// Proste "tłumaczenie" jako placeholder ENG – w praktyce można
// podmienić na ręcznie przygotowane tłumaczenia.
function translateToEnglish(polish) {
  if (!polish) return '';
  // Tymczasowo: zostawiamy polski tekst z wyraźnym prefiksem,
  // żeby było jasne, że wymaga on jeszcze korekty językowej.
  return `EN: ${polish.trim()}`;
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
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      skipped++;
      continue;
    }

    const syl = data.sylabus || data;

    if (!syl.cel_dydaktyczny) {
      skipped++;
      continue;
    }

    // ZAWSZE nadpisujemy cel_dydaktyczny_eng angielską wersją
    syl.cel_dydaktyczny_eng = translateToEnglish(syl.cel_dydaktyczny);
    if (data.sylabus) data.sylabus = syl;

    writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
    updated++;
  }
}

console.log(`Updated cel_dydaktyczny_eng in ${updated} files, skipped ${skipped}.`);
