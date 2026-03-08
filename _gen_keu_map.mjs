import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dirs = [
  'public/assets/syllabusy',
  'public/assets/syllabusy-n',
];

const result = {};

for (const dir of dirs) {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = join(dir, file);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    const syl = data.sylabus;
    const code = syl?.kod_przedmiotu;
    const ef = syl?.efekty_ksztalcenia;
    if (!code || !ef) continue;

    // syllabusy/ (stacjonarne) mają priorytet
    if (!result[code]) {
      function mapList(list) {
        if (!Array.isArray(list)) return [];
        return list.map(e => typeof e === 'object'
          ? { keu: e.keu ?? '', peu: e.peu ?? '' }
          : { keu: '', peu: String(e) });
      }
      result[code] = {
        wiedza:               mapList(ef.wiedza),
        umiejetnosci:         mapList(ef.umiejetnosci),
        kompetencje_spoleczne: mapList(ef.kompetencje_spoleczne),
      };
    }
  }
}

const sorted = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync('public/assets/keu-map.json', JSON.stringify(sorted, null, 2), 'utf8');
console.log(`Wygenerowano keu-map.json z ${Object.keys(sorted).length} kodami.`);

