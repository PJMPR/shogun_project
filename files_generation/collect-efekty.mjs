import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const DIRS = [
  'C:/Users/adamu/WebstormProjects/pj-studies/public/assets/syllabusy',
  'C:/Users/adamu/WebstormProjects/pj-studies/public/assets/syllabusy-n',
];
const OUT = 'C:/Users/adamu/WebstormProjects/pj-studies/public/assets/efekty_ksztalcenia.json';

// Mapa: znormalizowany tekst -> { tresc, kody Set }
const wiedza = new Map();
const umiej  = new Map();
const komp   = new Map();

function normalize(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function fixText(s) {
  if (!s) return '';
  // Usun niewidzialne znaki Unicode
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '');
  // Normalizuj wielokrotne spacje
  s = s.replace(/\s+/g, ' ').trim();
  // Brakujace spacje po kropce przed wielka litera
  s = s.replace(/\.([A-ZĄĆĘŁŃÓŚŹŻ])/g, '. $1');
  // Brakujace spacje po przecinku
  s = s.replace(/,([^\s])/g, ', $1');
  // Wielka litera na poczatku
  if (s.length > 0) s = s[0].toUpperCase() + s.slice(1);
  return s;
}

function isSenseless(s) {
  if (!s || s.length < 15) return true;
  const t = s.trimEnd();
  // Konczy sie samym dwukropkiem (naglowek)
  if (t.endsWith(':')) return true;
  // Samo "Dodatkowo:" lub podobne
  if (/^Dodatkowo\s*:?\s*$/.test(t)) return true;
  // Fragmenty zaczynajace sie malą litera - urwane zdania (krotkie)
  if (/^[a-ząćęłńóśźż]/.test(t) && t.length < 40) return true;
  return false;
}

function addEntry(map, raw, kod) {
  const fixed = fixText(raw);
  if (isSenseless(fixed)) return;
  const key = normalize(fixed);
  if (map.has(key)) {
    map.get(key).kody.add(kod);
  } else {
    map.set(key, { tresc: fixed, kody: new Set([kod]) });
  }
}

let ok = 0, err = 0;

for (const dir of DIRS) {
  let files;
  try { files = readdirSync(dir).filter(f => f.endsWith('.json')); }
  catch { continue; }

  for (const fname of files) {
    try {
      const raw = readFileSync(join(dir, fname), 'utf8').replace(/^\uFEFF/, '');
      const data = JSON.parse(raw);
      const s = data.sylabus;
      const kod = (s.kod_przedmiotu && s.kod_przedmiotu !== '') ? s.kod_przedmiotu : basename(fname, '.json');
      const ef = s.efekty_ksztalcenia || {};

      if (Array.isArray(ef.wiedza))               ef.wiedza.forEach(w => w && addEntry(wiedza, w, kod));
      if (Array.isArray(ef.umiejetnosci))          ef.umiejetnosci.forEach(u => u && addEntry(umiej, u, kod));
      if (Array.isArray(ef.kompetencje_spoleczne)) ef.kompetencje_spoleczne.forEach(k => k && addEntry(komp, k, kod));
      ok++;
    } catch(e) {
      console.error(`ERR: ${fname} - ${e.message}`);
      err++;
    }
  }
}

console.log(`Plikow OK: ${ok}, Bledow: ${err}`);
console.log(`Wiedza: ${wiedza.size}, Umiejetnosci: ${umiej.size}, Kompetencje: ${komp.size}`);

function mapToArray(m) {
  return [...m.values()]
    .sort((a, b) => a.tresc.localeCompare(b.tresc, 'pl'))
    .map(e => ({ tresc: e.tresc, kody: [...e.kody].sort() }));
}

const result = {
  efekty_ksztalcenia: {
    wiedza:                mapToArray(wiedza),
    umiejetnosci:          mapToArray(umiej),
    kompetencje_spoleczne: mapToArray(komp),
  }
};

writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
console.log(`Zapisano: ${OUT}`);

