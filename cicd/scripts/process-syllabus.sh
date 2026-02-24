#!/usr/bin/env bash
# process-syllabus.sh
# Glowny skrypt orkiestrujacy przetwarzanie sylabusu:
#   1. Parsuje JSON i wyznacza sciezki
#   2. Zapisuje JSON do assets
#   3. Generuje plik TEX
#   4. Kompiluje PDF
#   5. Aktualizuje pliki programu (syllabusFile + pdf)
#
# Uzycie:
#   ./process-syllabus.sh <plik_json_sylabusu>
#
# Wymagania: jq, python3, pdflatex (TeX Live)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
JSON_INPUT="${1:?Brak argumentu: plik JSON sylabusu}"
# Sprawdz zaleznosci
for cmd in jq python3 pdflatex; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "BLAD: $cmd nie jest zainstalowany" >&2
    exit 1
  fi
done
echo "========================================"
echo "  Przetwarzanie sylabusu: $JSON_INPUT"
echo "========================================"
# Usun BOM jesli istnieje
sed -i 's/^\xEF\xBB\xBF//' "$JSON_INPUT"
# 1. Parsowanie JSON i wyznaczenie sciezek
SYLLABUS_CODE=$(jq -r '.sylabus.kod_przedmiotu // empty' "$JSON_INPUT")
TRYB=$(jq -r '.sylabus.tryb_studiow // empty' "$JSON_INPUT")
if [[ -z "$SYLLABUS_CODE" ]]; then
  echo "BLAD: Brak pola sylabus.kod_przedmiotu w $JSON_INPUT" >&2
  exit 1
fi
if [[ -z "$TRYB" ]]; then
  echo "BLAD: Brak pola sylabus.tryb_studiow w $JSON_INPUT" >&2
  exit 1
fi
if echo "$TRYB" | grep -qi "niestacjonar"; then
  MODE="n"
  JSON_ASSETS_REL="assets/syllabusy-n"
  PDF_ASSETS_REL="assets/files/niestacjonarne"
else
  MODE="s"
  JSON_ASSETS_REL="assets/syllabusy"
  PDF_ASSETS_REL="assets/files/stacjonarne"
fi
# Sciezki do JSON programu (zaczynaja sie od assets/, bez public/)
JSON_ASSET_PATH="${JSON_ASSETS_REL}/${SYLLABUS_CODE}.json"
PDF_ASSET_PATH="${PDF_ASSETS_REL}/${SYLLABUS_CODE}.pdf"
# Sciezki fizyczne na dysku (z public/)
JSON_ASSET_FULL="$REPO_ROOT/public/${JSON_ASSET_PATH}"
PDF_ASSET_DIR_FULL="$REPO_ROOT/public/${PDF_ASSETS_REL}"
echo "Kod:  $SYLLABUS_CODE"
echo "Tryb: $TRYB ($MODE)"
echo "JSON -> $JSON_ASSET_PATH"
echo "PDF  -> $PDF_ASSET_PATH"
echo ""
# 2. Zapis JSON do assets
echo "[1/4] Zapisywanie JSON do assets..."
mkdir -p "$(dirname "$JSON_ASSET_FULL")"
cp "$JSON_INPUT" "$JSON_ASSET_FULL"
echo "  OK: $JSON_ASSET_FULL"
# 3. Generowanie TEX
echo "[2/4] Generowanie pliku TEX..."
LATEX_DIR="$REPO_ROOT/latex"
TEMP_DIR=$(mktemp -d)
TEX_FILE="$TEMP_DIR/${SYLLABUS_CODE}.tex"
bash "$SCRIPT_DIR/generate-tex.sh" "$JSON_ASSET_FULL" "$TEX_FILE" "$LATEX_DIR"
echo "  OK: $TEX_FILE"
# 4. Kompilacja PDF
echo "[3/4] Kompilacja PDF..."
mkdir -p "$PDF_ASSET_DIR_FULL"
bash "$SCRIPT_DIR/compile-pdf.sh" "$TEX_FILE" "$PDF_ASSET_DIR_FULL"
echo "  OK: $PDF_ASSET_DIR_FULL/${SYLLABUS_CODE}.pdf"
# Sprzatanie pliku TEX
rm -rf "$TEMP_DIR"
# 5. Aktualizacja plikow programu
echo "[4/4] Aktualizacja plikow JSON programu..."
cd "$REPO_ROOT"
bash "$SCRIPT_DIR/update-program-json.sh" \
  "$SYLLABUS_CODE" \
  "$MODE" \
  "$JSON_ASSET_PATH" \
  "$PDF_ASSET_PATH"
echo ""
echo "========================================"
echo "  Gotowe! Sylabus $SYLLABUS_CODE przetworzony pomyslnie."
echo "========================================"