/**
 * generate-syllabus-index.mjs
 * Generuje assets/syllabus-index.json i assets/niestacjonarne/syllabus-index.json
 * z mapowaniem kod -> ścieżka do pliku JSON sylabusa.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = 'public/assets';

function readJsonBom(filePath) {
  const buf = readFileSync(filePath);
  // Usuń UTF-8 BOM (EF BB BF)
  const slice = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(slice.toString('utf8'));
}

function buildIndex(sylDir, prefix) {
  const index = {};
  if (!existsSync(sylDir)) { console.warn(`Brak folderu: ${sylDir}`); return index; }
  const files = readdirSync(sylDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = join(sylDir, file);
    const fileCode = file.replace('.json', '');
    const assetPath = `${prefix}/${file}`;
    try {
      const data = readJsonBom(filePath);
      const sylabus = data.sylabus ?? data;
      const code = sylabus?.kod_przedmiotu;
      if (code && code !== '-') {
        index[code] = assetPath;
        if (fileCode !== code) index[fileCode] = assetPath;
      } else {
        index[fileCode] = assetPath;
      }
    } catch (e) {
      // fallback: użyj nazwy pliku jako klucza
      index[fileCode] = assetPath;
      console.warn(`Błąd parsowania ${file} (fallback po nazwie):`, e.message.substring(0, 60));
    }
  }
  return index;
}

// Stacjonarne
const stacDir = join(BASE, 'syllabusy');
const stacIndex = buildIndex(stacDir, 'assets/syllabusy');

// Ręczne aliasy: kod w programie -> plik sylabusa
const ALIASES_STAC = {
  'PRG':  'assets/syllabusy/PRG1.json',
  'LEK1': 'assets/syllabusy/ANG1-3.json',
  'LEK2': 'assets/syllabusy/ANG1-3.json',
  'LEK3': 'assets/syllabusy/ANG1-3.json',
  'LEK4': 'assets/syllabusy/ANG1-3.json',
  'ANG1': 'assets/syllabusy/ANG1-3.json',
  'ANG2': 'assets/syllabusy/ANG1-3.json',
  'ANG3': 'assets/syllabusy/ANG1-3.json',
};
Object.assign(stacIndex, ALIASES_STAC);

writeFileSync(join(BASE, 'syllabus-index.json'), JSON.stringify(stacIndex, null, 2), 'utf8');
console.log(`Stacjonarne: ${Object.keys(stacIndex).length} wpisów -> assets/syllabus-index.json`);

// Niestacjonarne
const niesDir = join(BASE, 'syllabusy-n');
const niesIndex = buildIndex(niesDir, 'assets/syllabusy-n');

const ALIASES_NIEST = {
  'PRG':  'assets/syllabusy-n/PRG1.json',
  'LEK1': 'assets/syllabusy-n/ANG1-3.json',
  'LEK2': 'assets/syllabusy-n/ANG1-3.json',
  'LEK3': 'assets/syllabusy-n/ANG1-3.json',
  'LEK4': 'assets/syllabusy-n/ANG1-3.json',
  'LEK5': 'assets/syllabusy-n/ANG1-3.json',
  'ANG1': 'assets/syllabusy-n/ANG1-3.json',
  'ANG2': 'assets/syllabusy-n/ANG1-3.json',
  'ANG3': 'assets/syllabusy-n/ANG1-3.json',
  'ANG4': 'assets/syllabusy-n/ANG1-3.json',
};
Object.assign(niesIndex, ALIASES_NIEST);

const niesOutDir = join(BASE, 'niestacjonarne');
if (existsSync(niesOutDir)) {
  writeFileSync(join(niesOutDir, 'syllabus-index.json'), JSON.stringify(niesIndex, null, 2), 'utf8');
  console.log(`Niestacjonarne: ${Object.keys(niesIndex).length} wpisów -> assets/niestacjonarne/syllabus-index.json`);
}
