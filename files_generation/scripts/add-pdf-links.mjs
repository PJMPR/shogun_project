/**
 * add-pdf-links.mjs  v2
 * Dodaje pole "pdf" do każdego przedmiotu w:
 *   - program.json (semesters[].subjects[])
 *   - electives-other.json (groups[].items[])
 *   - electives-specializations.json (specializations[].items[])
 * dla obu trybów studiów.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dir, '../../frontend/public/assets');

// Wyjątki: kod → nazwa pliku (bez rozszerzenia)
const EXCEPTIONS = {
  'AM':   'AMs',
  'ANG1': 'ANG1-3',
  'ANG2': 'ANG1-3',
  'ANG3': 'ANG1-3',
  'ANG4': 'ANG1-3',
  'PRG':  'PRG1',
  'KC':   'KCs',
  'JCP':  'JPC',
};

function findPdf(code, pdfDir) {
  if (!code || code === '-') return null;
  const base = EXCEPTIONS[code] ?? code;
  const path = resolve(ASSETS, 'files', pdfDir, `${base}.pdf`);
  if (existsSync(path)) return `assets/files/${pdfDir}/${base}.pdf`;
  return null;
}

function addPdfToSubjects(subjects, pdfDir) {
  let matched = 0;
  for (const subj of subjects) {
    const pdf = findPdf(subj.code, pdfDir);
    if (pdf) { subj.pdf = pdf; matched++; }
    else delete subj.pdf;
  }
  return matched;
}

function processAll(assetDir, pdfDir, label) {
  let total = 0, matched = 0;

  // 1. program.json
  const progFile = resolve(assetDir, 'program.json');
  const prog = JSON.parse(readFileSync(progFile, 'utf8'));
  for (const sem of prog.semesters) {
    total += sem.subjects.length;
    matched += addPdfToSubjects(sem.subjects, pdfDir);
  }
  writeFileSync(progFile, JSON.stringify(prog, null, 2), 'utf8');

  // 2. electives-other.json
  const elOthFile = resolve(assetDir, 'electives-other.json');
  const elOth = JSON.parse(readFileSync(elOthFile, 'utf8'));
  for (const g of elOth.groups) {
    total += g.items.length;
    matched += addPdfToSubjects(g.items, pdfDir);
  }
  writeFileSync(elOthFile, JSON.stringify(elOth, null, 2), 'utf8');

  // 3. electives-specializations.json
  const elSpecFile = resolve(assetDir, 'electives-specializations.json');
  const elSpec = JSON.parse(readFileSync(elSpecFile, 'utf8'));
  for (const sp of elSpec.specializations) {
    total += sp.items.length;
    matched += addPdfToSubjects(sp.items, pdfDir);
  }
  writeFileSync(elSpecFile, JSON.stringify(elSpec, null, 2), 'utf8');

  console.log(`[${label}] ${matched}/${total} przedmiotów z PDF`);

  // pokaż brakujące (z kodem innym niż -)
  const missing = [];
  for (const sem of prog.semesters)
    for (const s of sem.subjects)
      if (!s.pdf && s.code !== '-') missing.push(`${s.code} (${s.name})`);
  for (const g of elOth.groups)
    for (const s of g.items)
      if (!s.pdf && s.code !== '-') missing.push(`${s.code} (${s.name})`);
  for (const sp of elSpec.specializations)
    for (const s of sp.items)
      if (!s.pdf && s.code !== '-') missing.push(`${s.code} (${s.name})`);

  if (missing.length) {
    console.log(`  Brak PDF dla:`);
    [...new Set(missing)].forEach(m => console.log(`    - ${m}`));
  }
}

// Stacjonarne
processAll(ASSETS, 'stacjonarne', 'STACJONARNE');

// Niestacjonarne
processAll(resolve(ASSETS, 'niestacjonarne'), 'niestacjonarne', 'NIESTACJONARNE');

