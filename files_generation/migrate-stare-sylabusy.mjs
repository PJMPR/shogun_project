/**
 * migrate-stare-sylabusy.mjs
 * Migruje stare sylabusy (stary/stac i stary/nstac) do spójnego formatu nowych plików:
 *  - usuwa BOM (UTF-8 Byte Order Mark)
 *  - formatuje JSON z wcięciami 2 spacji
 *  - kryteria_oceny: flat array → { wyklad: [], cwiczenia_laboratorium: [] }
 *  - efekty_ksztalcenia.wiedza/umiejetnosci: string[] → { keu, peu, metoda_weryfikacji }[]
 *  - efekty_ksztalcenia.kompetencje_spoleczne: string|mixed → { keu, peu, metoda_weryfikacji }[]
 *  - tresci_programowe: string[] → { nr_zajec, wyklad, cwiczenia }[]
 *  - metody_dydaktyczne: {} → { wyklad: [], cwiczenia_laboratorium: [] }
 *  - godziny.praca_wlasna_studenta: dodaje "" jeśli brak
 *  - cel_dydaktyczny_eng: dodaje "" jeśli brak
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dir, '../frontend/public/assets');

const DIRS = [
  join(BASE, 'stary/stac/sylabusy'),
  join(BASE, 'stary/nstac/sylabusy'),
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripBOM(s) {
  while (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  return s;
}

function convertEfektItem(item) {
  if (typeof item === 'string') {
    return { keu: '', peu: item, metoda_weryfikacji: '' };
  }
  if (item && typeof item === 'object') {
    return {
      keu: item.keu ?? '',
      peu: item.peu ?? item.tresc ?? '',
      metoda_weryfikacji: item.metoda_weryfikacji ?? '',
    };
  }
  return { keu: '', peu: '', metoda_weryfikacji: '' };
}

function convertEfektyArray(val) {
  if (!val) return [];
  if (typeof val === 'string') return [convertEfektItem(val)];
  if (Array.isArray(val)) return val.map(convertEfektItem);
  return [];
}

function convertKriteriaOceny(ko) {
  if (!ko) return { wyklad: [], cwiczenia_laboratorium: [] };
  if (Array.isArray(ko)) {
    // Płaska tablica → wszystko do cwiczenia_laboratorium
    return { wyklad: [], cwiczenia_laboratorium: ko };
  }
  if (typeof ko === 'object') {
    // Już struktura obiektowa – normalizuj klucze
    return {
      wyklad: Array.isArray(ko.wyklad) ? ko.wyklad : [],
      cwiczenia_laboratorium: Array.isArray(ko.cwiczenia_laboratorium) ? ko.cwiczenia_laboratorium : [],
    };
  }
  return { wyklad: [], cwiczenia_laboratorium: [] };
}

function convertTresci(tp) {
  if (!Array.isArray(tp)) return [];
  return tp.map((item, idx) => {
    if (typeof item === 'string') {
      return { nr_zajec: idx + 1, wyklad: item, cwiczenia: '' };
    }
    if (item && typeof item === 'object') {
      return {
        nr_zajec: item.nr_zajec ?? idx + 1,
        wyklad: item.wyklad ?? '',
        cwiczenia: item.cwiczenia ?? item.lab ?? '',
      };
    }
    return { nr_zajec: idx + 1, wyklad: '', cwiczenia: '' };
  });
}

function convertMetody(md) {
  if (!md || Object.keys(md).length === 0) {
    return { wyklad: [], cwiczenia_laboratorium: [] };
  }
  // Zachowaj istniejące klucze – mogą być różne (wyklad, cwiczenia_laboratorium, laboratorium)
  return md;
}

function migrate(raw) {
  const cleaned = stripBOM(raw);
  const obj = JSON.parse(cleaned);
  const sy = obj.sylabus;

  // godziny.praca_wlasna_studenta
  if (sy.godziny && !('praca_wlasna_studenta' in sy.godziny)) {
    sy.godziny.praca_wlasna_studenta = '';
  }

  // metody_dydaktyczne
  sy.metody_dydaktyczne = convertMetody(sy.metody_dydaktyczne);

  // kryteria_oceny
  sy.kryteria_oceny = convertKriteriaOceny(sy.kryteria_oceny);

  // efekty_ksztalcenia
  if (sy.efekty_ksztalcenia) {
    const ek = sy.efekty_ksztalcenia;
    ek.wiedza = convertEfektyArray(ek.wiedza);
    ek.umiejetnosci = convertEfektyArray(ek.umiejetnosci);
    ek.kompetencje_spoleczne = convertEfektyArray(ek.kompetencje_spoleczne);
  }

  // tresci_programowe
  if ('tresci_programowe' in sy) {
    sy.tresci_programowe = convertTresci(sy.tresci_programowe);
  } else {
    sy.tresci_programowe = [];
  }

  // cel_dydaktyczny_eng
  if (!('cel_dydaktyczny_eng' in sy)) {
    sy.cel_dydaktyczny_eng = '';
  }

  return JSON.stringify(obj, null, 2);
}

// ── Główna pętla ─────────────────────────────────────────────────────────────

let ok = 0, errors = 0;

for (const dir of DIRS) {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  console.log(`\nPrzetwarzam: ${dir} (${files.length} plików)`);

  for (const f of files) {
    const fp = join(dir, f);
    try {
      const raw = readFileSync(fp, 'utf8');
      const out = migrate(raw);
      writeFileSync(fp, out, 'utf8');  // zapis bez BOM (domyślne utf8 w Node)
      ok++;
    } catch (e) {
      console.error(`  BŁĄD ${f}: ${e.message}`);
      errors++;
    }
  }
}

console.log(`\nGotowe: ${ok} OK, ${errors} błędów`);
