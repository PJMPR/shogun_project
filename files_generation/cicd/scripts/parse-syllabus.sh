#!/usr/bin/env bash
# parse-syllabus.sh
# Odczytuje plik JSON sylabusu i wyznacza ścieżki docelowe.
# Użycie: source parse-syllabus.sh <plik_json>
# Po wykonaniu eksportuje zmienne środowiskowe:
#   SYLLABUS_CODE, SYLLABUS_MODE (s|n), SYLLABUS_JSON_DST, SYLLABUS_PDF_DST

set -euo pipefail

JSON_FILE="${1:?Brak argumentu: plik JSON sylabusu}"

if ! command -v jq &>/dev/null; then
  echo "BŁĄD: jq nie jest zainstalowany" >&2
  exit 1
fi

# Wyciągnij pola z JSON
SYLLABUS_CODE=$(jq -r '.sylabus.kod_przedmiotu // empty' "$JSON_FILE")
TRYB=$(jq -r '.sylabus.tryb_studiow // empty' "$JSON_FILE")

if [[ -z "$SYLLABUS_CODE" ]]; then
  echo "BŁĄD: Brak pola sylabus.kod_przedmiotu w $JSON_FILE" >&2
  exit 1
fi

if [[ -z "$TRYB" ]]; then
  echo "BŁĄD: Brak pola sylabus.tryb_studiow w $JSON_FILE" >&2
  exit 1
fi

# Wyznacz tryb: stacjonarny (s) lub niestacjonarny (n)
if echo "$TRYB" | grep -qi "niestacjonar"; then
  SYLLABUS_MODE="n"
  SYLLABUS_JSON_DIR="frontend/public/assets/syllabusy-n"
  SYLLABUS_PDF_DIR="frontend/public/assets/files/niestacjonarne"
else
  SYLLABUS_MODE="s"
  SYLLABUS_JSON_DIR="frontend/public/assets/syllabusy"
  SYLLABUS_PDF_DIR="frontend/public/assets/files/stacjonarne"
fi

SYLLABUS_JSON_DST="${SYLLABUS_JSON_DIR}/${SYLLABUS_CODE}.json"
SYLLABUS_PDF_DST="${SYLLABUS_PDF_DIR}/${SYLLABUS_CODE}.pdf"

export SYLLABUS_CODE
export SYLLABUS_MODE
export SYLLABUS_JSON_DIR
export SYLLABUS_PDF_DIR
export SYLLABUS_JSON_DST
export SYLLABUS_PDF_DST

echo "Kod:    $SYLLABUS_CODE"
echo "Tryb:   $TRYB ($SYLLABUS_MODE)"
echo "JSON →  $SYLLABUS_JSON_DST"
echo "PDF  →  $SYLLABUS_PDF_DST"

