/**
 * utils/read-json.mjs
 * Wczytuje plik JSON z obsługą UTF-8 BOM (EF BB BF).
 */
import { readFileSync, existsSync } from 'fs';

/**
 * Wczytuje plik JSON, stripuje BOM, parsuje i zwraca obiekt.
 * Jeśli plik nie istnieje, zwraca null i emituje ostrzeżenie.
 * @param {string} filePath - bezwzględna ścieżka do pliku
 * @param {string} [label] - etykieta do komunikatu ostrzeżenia
 * @returns {any|null}
 */
export function readJsonBom(filePath, label = filePath) {
  if (!existsSync(filePath)) {
    console.warn(`[WARN] Brak pliku: ${label}`);
    return null;
  }
  const buf = readFileSync(filePath);
  const slice =
    buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
      ? buf.slice(3)
      : buf;
  try {
    return JSON.parse(slice.toString('utf8'));
  } catch (e) {
    console.warn(`[WARN] Błąd parsowania JSON: ${label} – ${e.message}`);
    return null;
  }
}
