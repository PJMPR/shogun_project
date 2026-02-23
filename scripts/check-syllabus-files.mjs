import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const BASE = 'public/assets';

const elSpec = JSON.parse(readFileSync(join(BASE, 'electives-specializations.json'), 'utf8'));
const elOth  = JSON.parse(readFileSync(join(BASE, 'electives-other.json'), 'utf8'));
const prog   = JSON.parse(readFileSync(join(BASE, 'program.json'), 'utf8'));

const elSpecN = JSON.parse(readFileSync(join(BASE, 'niestacjonarne/electives-specializations.json'), 'utf8'));
const elOthN  = JSON.parse(readFileSync(join(BASE, 'niestacjonarne/electives-other.json'), 'utf8'));
const progN   = JSON.parse(readFileSync(join(BASE, 'niestacjonarne/program.json'), 'utf8'));

function checkDataset(label, prog, elSpec, elOth) {
  let total = 0, withFile = 0;
  const without = [];

  for (const sem of prog.semesters) {
    for (const s of sem.subjects) {
      total++;
      if (s.syllabusFile) withFile++;
      else without.push(`sem${sem.semester}:${s.code}:${s.name}`);
    }
  }
  for (const spec of elSpec.specializations) {
    for (const item of spec.items) {
      total++;
      if (item.syllabusFile) withFile++;
      else without.push(`spec:${item.code}:${item.name}`);
    }
  }
  for (const g of elOth.groups) {
    for (const item of g.items) {
      total++;
      if (item.syllabusFile) withFile++;
      else without.push(`other:${item.code}:${item.name}`);
    }
  }

  console.log(`\n=== ${label} ===`);
  console.log(`Total: ${total}, withSyllabusFile: ${withFile}, without: ${total - withFile}`);
  if (without.length) {
    console.log('Przedmioty BEZ syllabusFile:');
    without.forEach(x => console.log('  ', x));
  }
}

checkDataset('STACJONARNE', prog, elSpec, elOth);
checkDataset('NIESTACJONARNE', progN, elSpecN, elOthN);

// Sprawdz jakie pliki są w folderach sylabusów
const sylS = existsSync(join(BASE, 'syllabusy')) ? readdirSync(join(BASE, 'syllabusy')).filter(f => f.endsWith('.json')) : [];
const sylN = existsSync(join(BASE, 'syllabusy-n')) ? readdirSync(join(BASE, 'syllabusy-n')).filter(f => f.endsWith('.json')) : [];
console.log(`\nPliki w syllabusy/: ${sylS.length}`);
console.log(`Pliki w syllabusy-n/: ${sylN.length}`);

