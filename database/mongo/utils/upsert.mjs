/**
 * utils/upsert.mjs
 * Helper do idempotentnego upsert wielu dokumentów.
 */

/**
 * Wykonuje upsert dla każdego dokumentu w tablicy.
 * Klucz filtra budowany jest z podanych pól filterKeys.
 *
 * @param {import('mongodb').Collection} collection
 * @param {object[]} docs
 * @param {string[]} filterKeys - pola dokumentu używane jako klucz upsert
 * @returns {Promise<{upserted: number, modified: number}>}
 */
export async function upsertMany(collection, docs, filterKeys) {
  let upserted = 0;
  let modified = 0;

  for (const doc of docs) {
    const filter = {};
    for (const key of filterKeys) {
      filter[key] = doc[key];
    }
    const result = await collection.updateOne(
      filter,
      { $set: doc },
      { upsert: true }
    );
    if (result.upsertedCount > 0) upserted++;
    if (result.modifiedCount > 0) modified++;
  }

  return { upserted, modified };
}
