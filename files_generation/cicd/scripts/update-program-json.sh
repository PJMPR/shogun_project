#!/usr/bin/env bash
# update-program-json.sh
# Aktualizuje pliki program.json, electives-other.json i electives-specializations.json
# dodając/aktualizując pola syllabusFile i pdf dla danego kodu przedmiotu.
#
# Użycie:
#   ./update-program-json.sh <kod> <mode:s|n> <json_path> <pdf_path>
#
# Przykład:
#   ./update-program-json.sh AM s assets/syllabusy/AM.json assets/files/stacjonarne/AM.pdf

set -euo pipefail

CODE="${1:?Brak argumentu: kod przedmiotu}"
MODE="${2:?Brak argumentu: tryb (s|n)}"
JSON_ASSET_PATH="${3:?Brak argumentu: ścieżka JSON w assets}"
PDF_ASSET_PATH="${4:?Brak argumentu: ścieżka PDF w assets}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ASSETS="$REPO_ROOT/frontend/public/assets"

if ! command -v jq &>/dev/null; then
  echo "BŁĄD: jq nie jest zainstalowany" >&2
  exit 1
fi

echo "Aktualizacja plików JSON programu dla kodu: $CODE (tryb: $MODE)"
echo "  syllabusFile → $JSON_ASSET_PATH"
echo "  pdf          → $PDF_ASSET_PATH"

UPDATED=0

# ── Funkcja pomocnicza: aktualizuj plik JSON in-place ────────────────────────
# Użycie: jq_update <plik> <wyrażenie_jq>
# Zmienne $CODE, $JSON_ASSET_PATH, $PDF_ASSET_PATH są dostępne jako --arg
jq_update() {
  local file="$1"
  local expr="$2"
  local tmp
  tmp=$(mktemp)
  jq --arg code "$CODE" \
     --arg syl  "$JSON_ASSET_PATH" \
     --arg pdf  "$PDF_ASSET_PATH" \
     "$expr" "$file" > "$tmp" && mv "$tmp" "$file"
}

# ── 1. program.json ───────────────────────────────────────────────────────────
if [[ "$MODE" == "s" ]]; then
  PROGRAM_FILE="$ASSETS/program.json"
else
  PROGRAM_FILE="$ASSETS/niestacjonarne/program.json"
fi

if [[ -f "$PROGRAM_FILE" ]]; then
  MATCH=$(jq -r --arg code "$CODE" \
    '.semesters[]?.subjects[]? | select(.code == $code) | .code' \
    "$PROGRAM_FILE" | head -1)

  if [[ -n "$MATCH" ]]; then
    jq_update "$PROGRAM_FILE" \
      '(.semesters[]?.subjects[]? | select(.code == $code)) |= . + {syllabusFile: $syl, pdf: $pdf}'
    echo "  ✓ Zaktualizowano $PROGRAM_FILE (subjects)"
    UPDATED=$((UPDATED+1))
  else
    echo "  ○ Kod $CODE nie znaleziony w subjects w $PROGRAM_FILE"
  fi
else
  echo "  OSTRZEZENIE: Brak pliku $PROGRAM_FILE" >&2
fi

# ── 2. electives-other.json ───────────────────────────────────────────────────
if [[ "$MODE" == "s" ]]; then
  ELECTIVES_OTHER="$ASSETS/electives-other.json"
else
  ELECTIVES_OTHER="$ASSETS/niestacjonarne/electives-other.json"
fi

if [[ -f "$ELECTIVES_OTHER" ]]; then
  MATCH=$(jq -r --arg code "$CODE" \
    '.groups[]?.items[]? | select(.code == $code) | .code' \
    "$ELECTIVES_OTHER" | head -1)

  if [[ -n "$MATCH" ]]; then
    jq_update "$ELECTIVES_OTHER" \
      '(.groups[]?.items[]? | select(.code == $code)) |= . + {syllabusFile: $syl, pdf: $pdf}'
    echo "  ✓ Zaktualizowano $ELECTIVES_OTHER (electives-other)"
    UPDATED=$((UPDATED+1))
  else
    echo "  ○ Kod $CODE nie znaleziony w electives-other"
  fi
else
  echo "  OSTRZEZENIE: Brak pliku $ELECTIVES_OTHER" >&2
fi

# ── 3. electives-specializations.json ────────────────────────────────────────
if [[ "$MODE" == "s" ]]; then
  ELECTIVES_SPEC="$ASSETS/electives-specializations.json"
else
  ELECTIVES_SPEC="$ASSETS/niestacjonarne/electives-specializations.json"
fi

if [[ -f "$ELECTIVES_SPEC" ]]; then
  MATCH=$(jq -r --arg code "$CODE" \
    '.specializations[]?.items[]? | select(.code == $code) | .code' \
    "$ELECTIVES_SPEC" | head -1)

  if [[ -n "$MATCH" ]]; then
    jq_update "$ELECTIVES_SPEC" \
      '(.specializations[]?.items[]? | select(.code == $code)) |= . + {syllabusFile: $syl, pdf: $pdf}'
    echo "  ✓ Zaktualizowano $ELECTIVES_SPEC (electives-specializations)"
    UPDATED=$((UPDATED+1))
  else
    echo "  ○ Kod $CODE nie znaleziony w electives-specializations"
  fi
else
  echo "  OSTRZEŻENIE: Brak pliku $ELECTIVES_SPEC" >&2
fi

if [[ $UPDATED -eq 0 ]]; then
  echo "  UWAGA: Kod $CODE nie został znaleziony w żadnym pliku programu." >&2
  echo "  Sylabus zostanie zapisany, ale nie będzie podpięty pod żaden przedmiot." >&2
fi

echo "Gotowe. Zaktualizowano $UPDATED plik(ów)."

