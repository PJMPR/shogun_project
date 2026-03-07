#!/usr/bin/env node
// -*- coding: utf-8 -*-
/**
 * Dodaje pole `docFile` do wszystkich przedmiotów w plikach JSON:
 *   - public/assets/program.json
 *   - public/assets/electives-other.json
 *   - public/assets/electives-specializations.json
 *   - public/assets/niestacjonarne/program.json
 *   - public/assets/niestacjonarne/electives-other.json
 *   - public/assets/niestacjonarne/electives-specializations.json
 *
 * Reguła: docFile = pole `pdf` z zamianą rozszerzenia .pdf → .docx
 *
 * Użycie: node scripts/add-docfile-field.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Pliki do przetworzenia
const FILES = [
  'public/assets/program.json',
  'public/assets/electives-other.json',
  'public/assets/electives-specializations.json',
  'public/assets/niestacjonarne/program.json',
  'public/assets/niestacjonarne/electives-other.json',
  'public/assets/niestacjonarne/electives-specializations.json',
];

/**
 * Zamienia rozszerzenie .pdf na .docx w ścieżce.
 */
function pdfToDocx(pdfPath) {
  return pdfPath.replace(/\.pdf$/i, '.docx');
}

/**
 * Dodaje pole docFile do obiektu przedmiotu (jeśli ma pole pdf i nie ma jeszcze docFile).
 * Zwraca true jeśli dokonano zmiany.
 */
function addDocFile(item) {
  if (item.pdf && !item.docFile) {
    item.docFile = pdfToDocx(item.pdf);
    return true;
  }
  return false;
}

/**
 * Przetwarza plik program.json — iteruje po semestrach → subjects.
 */
function processProgram(data) {
  let count = 0;
  for (const semester of (data.semesters || [])) {
    for (const subject of (semester.subjects || [])) {
      if (addDocFile(subject)) count++;
    }
  }
  return count;
}

/**
 * Przetwarza plik electives-other.json — iteruje po groups → items.
 */
function processElectivesOther(data) {
  let count = 0;
  for (const group of (data.groups || [])) {
    for (const item of (group.items || [])) {
      if (addDocFile(item)) count++;
    }
  }
  return count;
}

/**
 * Przetwarza plik electives-specializations.json — iteruje po specializations → items.
 */
function processElectivesSpecializations(data) {
  let count = 0;
  for (const spec of (data.specializations || [])) {
    for (const item of (spec.items || [])) {
      if (addDocFile(item)) count++;
    }
  }
  return count;
}

// Mapowanie pliku na funkcję procesującą
function getProcessor(filename) {
  const base = path.basename(filename);
  if (base === 'program.json') return processProgram;
  if (base === 'electives-other.json') return processElectivesOther;
  if (base === 'electives-specializations.json') return processElectivesSpecializations;
  return null;
}

// --- Główna logika ---
let totalOk = 0;
let totalErr = 0;

for (const relPath of FILES) {
  const fullPath = path.join(ROOT, relPath);
  try {
    const raw = readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(raw);

    const processor = getProcessor(relPath);
    if (!processor) {
      console.warn(`[SKIP] Nieznany typ pliku: ${relPath}`);
      continue;
    }

    const count = processor(data);

    // Zapisz z zachowaniem formatowania (2 spacje, bez zmiany kolejności kluczy)
    const output = JSON.stringify(data, null, 2);
    writeFileSync(fullPath, output, 'utf-8');

    console.log(`[OK] ${relPath}  (+${count} docFile)`);
    totalOk++;
  } catch (err) {
    console.error(`[ERR] ${relPath}: ${err.message}`);
    totalErr++;
  }
}

console.log(`\nZakończono: OK=${totalOk}  BLEDY=${totalErr}`);

