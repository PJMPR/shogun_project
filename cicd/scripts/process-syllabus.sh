#!/usr/bin/env bash
# process-syllabus.sh
# Główny skrypt orkiestrujący przetwarzanie sylabusu:
#   1. Parsuje JSON i wyznacza ścieżki
#   2. Zapisuje JSON do assets
#   3. Generuje plik TEX
#   4. Kompiluje PDF
#   5. Aktualizuje pliki programu (syllabusFile + pdf)
#
# Użycie:
#   ./process-syllabus.sh <plik_json_sylabusu>
#
# Wymagania: jq, pdflatex (TeX Live)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
JSON_INPUT="${1:?Brak argumentu: plik JSON sylabusu}"

# Sprawdź zależności
for cmd in jq python3 pdflatex; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "BLAD: $cmd nie jest zainstalowany" >&2
    exit 1
  fi
done

echo "========================================"
echo "  Przetwarzanie sylabusu: $JSON_INPUT"
echo "========================================"

# Usuń BOM jeśli istnieje
sed -i 's/^\xEF\xBB\xBF//' "$JSON_INPUT"

# ── 1. Parsowanie JSON i wyznaczenie ścieżek ────────────────────────────────
SYLLABUS_CODE=$(jq -r '.sylabus.kod_przedmiotu // empty' "$JSON_INPUT")
TRYB=$(jq -r '.sylabus.tryb_studiow // empty' "$JSON_INPUT")

if [[ -z "$SYLLABUS_CODE" ]]; then
  echo "BŁĄD: Brak pola sylabus.kod_przedmiotu w $JSON_INPUT" >&2
  exit 1
fi
if [[ -z "$TRYB" ]]; then
  echo "BŁĄD: Brak pola sylabus.tryb_studiow w $JSON_INPUT" >&2
  exit 1
fi

if echo "$TRYB" | grep -qi "niestacjonar"; then
  MODE="n"
  JSON_ASSET_DIR="public/assets/syllabusy-n"
  PDF_ASSET_DIR="public/assets/files/niestacjonarne"
else
  MODE="s"
  JSON_ASSET_DIR="public/assets/syllabusy"
  PDF_ASSET_DIR="public/assets/files/stacjonarne"
fi

JSON_ASSET_PATH="${JSON_ASSET_DIR}/${SYLLABUS_CODE}.json"
PDF_ASSET_PATH="${PDF_ASSET_DIR}/${SYLLABUS_CODE}.pdf"
JSON_ASSET_FULL="$REPO_ROOT/$JSON_ASSET_PATH"
PDF_ASSET_FULL="$REPO_ROOT/$PDF_ASSET_DIR"

echo "Kod:  $SYLLABUS_CODE"
echo "Tryb: $TRYB ($MODE)"
echo "JSON → $JSON_ASSET_PATH"
echo "PDF  → $PDF_ASSET_PATH"
echo ""

# ── 2. Zapis JSON do assets ──────────────────────────────────────────────────
echo "[1/4] Zapisywanie JSON do assets..."
mkdir -p "$(dirname "$JSON_ASSET_FULL")"
cp "$JSON_INPUT" "$JSON_ASSET_FULL"
echo "  ✓ $JSON_ASSET_FULL"

# ── 3. Generowanie TEX ───────────────────────────────────────────────────────
echo "[2/4] Generowanie pliku TEX..."
LATEX_DIR="$REPO_ROOT/latex"
TEMP_DIR=$(mktemp -d)
TEX_FILE="$TEMP_DIR/${SYLLABUS_CODE}.tex"

# Katalog z plikami graficznymi LaTeX (forward slashes dla pdflatex)
LATEX_IMG_DIR="${LATEX_DIR//\\//}"

bash "$SCRIPT_DIR/generate-tex.sh" "$JSON_ASSET_FULL" "$TEX_FILE" "$LATEX_IMG_DIR"
echo "  ✓ $TEX_FILE"

# ── 4. Kompilacja PDF ────────────────────────────────────────────────────────
echo "[3/4] Kompilacja PDF..."
mkdir -p "$REPO_ROOT/$PDF_ASSET_DIR"
bash "$SCRIPT_DIR/compile-pdf.sh" "$TEX_FILE" "$REPO_ROOT/$PDF_ASSET_DIR"
echo "  ✓ $REPO_ROOT/$PDF_ASSET_DIR/${SYLLABUS_CODE}.pdf"

# Sprzątanie pliku TEX
rm -rf "$TEMP_DIR"

# ── 5. Aktualizacja plików programu ─────────────────────────────────────────
echo "[4/4] Aktualizacja plików JSON programu..."
cd "$REPO_ROOT"
bash "$SCRIPT_DIR/update-program-json.sh" \
  "$SYLLABUS_CODE" \
  "$MODE" \
  "$JSON_ASSET_PATH" \
  "$PDF_ASSET_PATH"

echo ""
echo "========================================"
echo "  Gotowe! Sylabus $SYLLABUS_CODE przetworzony pomyślnie."
echo "========================================"

