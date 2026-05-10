/**
 * init-db.mjs
 * Główny skrypt inicjalizujący bazę pj_sylabi.
 *
 * Uruchomienie:
 *   cd database/mongo
 *   npm install
 *   node init-db.mjs
 */
import { importSyllabi } from './collections/syllabi.mjs';
import { importPrograms } from './collections/programs.mjs';
import { importElectives } from './collections/electives.mjs';
import { closeClient, DB_NAME } from './utils/mongo-client.mjs';

const start = Date.now();

console.log('='.repeat(50));
console.log(`  Inicjalizacja bazy MongoDB: ${DB_NAME}`);
console.log(`  localhost:27017`);
console.log('='.repeat(50));

try {
  console.log('\n── syllabi ──────────────────────────────────────');
  const nSyllabi = await importSyllabi();

  console.log('\n── programs ─────────────────────────────────────');
  const nPrograms = await importPrograms();

  console.log('\n── electives ────────────────────────────────────');
  const nElectives = await importElectives();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(50));
  console.log(`  Gotowe! (${elapsed}s)`);
  console.log(`  syllabi:   ${nSyllabi} dokumentów`);
  console.log(`  programs:  ${nPrograms} dokumentów`);
  console.log(`  electives: ${nElectives} dokumentów`);
  console.log('='.repeat(50));
} catch (err) {
  console.error('\n[BŁĄD]', err.message);
  process.exit(1);
} finally {
  await closeClient();
}
