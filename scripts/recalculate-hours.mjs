#!/usr/bin/env node
// Script: recalculate-hours.mjs
// Scans public/assets/syllabusy and public/assets/syllabusy-n for JSON files
// Recalculates sylabus.godziny.calkowita_liczba_godzin_h = ects * 25
// and sylabus.godziny.praca_wlasna_studenta_h = calkowita - z_udzialem_prowadzacego_h
// Creates a .bak backup of each modified file.

import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const targets = [
  path.join(ROOT, 'public', 'assets', 'syllabusy'),
  path.join(ROOT, 'public', 'assets', 'syllabusy-n')
];

async function findJsonFiles(dir) {
  const out = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        out.push(...(await findJsonFiles(full)));
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) {
        out.push(full);
      }
    }
  } catch (err) {
    // directory might not exist - that's fine
  }
  return out;
}

function safeNum(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

async function processFile(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    return { filePath, ok: false, error: `read error: ${err.message}` };
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { filePath, ok: false, error: `json parse error: ${err.message}` };
  }

  if (!json.sylabus || typeof json.sylabus !== 'object') {
    return { filePath, ok: false, error: 'missing sylabus object' };
  }

  const syl = json.sylabus;
  const ects = safeNum(syl.ects);
  if (!Number.isFinite(ects)) {
    return { filePath, ok: false, error: 'missing or invalid ects' };
  }

  syl.godziny = syl.godziny || {};
  const before = { ...syl.godziny };

  const zUdzial = safeNum(syl.godziny.z_udzialem_prowadzacego_h);
  const zVal = Number.isFinite(zUdzial) ? zUdzial : 0; // assume 0 if missing

  // special rule: if ects == 0, praca_wlasna_studenta_h must be 0
  let total;
  let praca;
  if (ects === 0) {
    // when ects is zero, set total equal to hours with instructor participation
    // and student's own work is 0 (per new requirement)
    total = zVal;
    praca = 0;
  } else {
    // first attempt: ects * 25
    total = ects * 25;
    praca = total - zVal;

    if (praca < 0) {
      // second attempt: ects * 30
      total = ects * 30;
      praca = total - zVal;
    }

    if (praca < 0) {
      // still negative -> set to minimum 10 (leave total as ects*30)
      praca = 10;
    }
  }

  if (process.env.VERBOSE) {
    console.log(`DEBUG: ${path.relative(ROOT, filePath)}: ects=${ects}, z=${zVal}, total=${total}, praca=${praca}`);
  }

  const changed =
    syl.godziny.calkowita_liczba_godzin_h !== total ||
    syl.godziny.praca_wlasna_studenta_h !== praca;

  syl.godziny.calkowita_liczba_godzin_h = total;
  syl.godziny.praca_wlasna_studenta_h = praca;

  if (!changed) {
    return { filePath, ok: true, changed: false };
  }

  // make backup
  try {
    await fs.writeFile(filePath + '.bak', raw, 'utf8');
  } catch (err) {
    return { filePath, ok: false, error: `backup error: ${err.message}` };
  }

  try {
    const pretty = JSON.stringify(json, null, 2) + '\n';
    await fs.writeFile(filePath, pretty, 'utf8');
  } catch (err) {
    return { filePath, ok: false, error: `write error: ${err.message}` };
  }

  return { filePath, ok: true, changed: true, before, after: syl.godziny };
}

(async () => {
  const allFiles = new Set();
  for (const t of targets) {
    const files = await findJsonFiles(t);
    files.forEach(f => allFiles.add(f));
  }
  const filesArray = [...allFiles].sort();
  if (filesArray.length === 0) {
    console.log('No JSON files found in target directories.');
    process.exit(0);
  }

  let processed = 0;
  let updated = 0;
  const errors = [];
  const details = [];

  for (const f of filesArray) {
    const res = await processFile(f);
    processed++;
    if (!res.ok) errors.push(res);
    else if (res.changed) {
      updated++;
      details.push(res);
    }
  }

  console.log(`Processed ${processed} files, updated ${updated} files, errors: ${errors.length}`);
  if (updated > 0) {
    console.log('\nUpdated files (sample):');
    for (const d of details.slice(0, 10)) {
      console.log(`- ${path.relative(ROOT, d.filePath)}: total=${d.after.calkowita_liczba_godzin_h}, praca_wlasna=${d.after.praca_wlasna_studenta_h}`);
    }
  }
  if (errors.length) {
    console.log('\nErrors (sample):');
    for (const e of errors.slice(0, 10)) {
      console.log(`- ${path.relative(ROOT, e.filePath)}: ${e.error}`);
    }
  }

  // exit code: 0 if no fatal errors
})();
