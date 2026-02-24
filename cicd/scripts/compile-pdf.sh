#!/usr/bin/env bash
# compile-pdf.sh
# Kompiluje plik .tex do PDF za pomocą pdflatex (dwukrotnie).
# Użycie: ./compile-pdf.sh <plik.tex> <katalog_wyjściowy>
# Wymaga: pdflatex (TeX Live)

set -euo pipefail

TEX_FILE="${1:?Brak argumentu: plik .tex}"
OUTPUT_DIR="${2:?Brak argumentu: katalog wyjściowy}"

if ! command -v pdflatex &>/dev/null; then
  echo "BŁĄD: pdflatex nie jest zainstalowany" >&2
  exit 1
fi

NAME=$(basename "$TEX_FILE" .tex)
WORK_DIR=$(mktemp -d)

echo "Kompilacja: $NAME.tex → $OUTPUT_DIR/$NAME.pdf"

# Dwukrotna kompilacja (dla referencji)
for i in 1 2; do
  echo "  Przebieg $i/2..."
  if ! pdflatex \
      -interaction=nonstopmode \
      -halt-on-error \
      -output-directory="$WORK_DIR" \
      "$TEX_FILE" > "$WORK_DIR/${NAME}_run${i}.log" 2>&1; then
    echo "BŁĄD kompilacji (przebieg $i):" >&2
    grep "^!" "$WORK_DIR/${NAME}_run${i}.log" >&2 || true
    echo "--- Ostatnie 30 linii logu ---" >&2
    tail -30 "$WORK_DIR/${NAME}_run${i}.log" >&2 || true
    rm -rf "$WORK_DIR"
    exit 1
  fi
done

# Kopiuj PDF do miejsca docelowego
mkdir -p "$OUTPUT_DIR"
cp "$WORK_DIR/${NAME}.pdf" "$OUTPUT_DIR/${NAME}.pdf"

PDF_SIZE=$(du -k "$OUTPUT_DIR/${NAME}.pdf" | cut -f1)
echo "OK: $NAME.pdf (${PDF_SIZE} KB) → $OUTPUT_DIR/"

# Sprzątanie
rm -rf "$WORK_DIR"

