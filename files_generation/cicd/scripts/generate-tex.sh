#!/usr/bin/env bash
# generate-tex.sh
# Generuje plik .tex z JSON sylabusu – deleguje logikę do generate-tex.py
# Użycie: ./generate-tex.sh <plik_json> <plik_wyjściowy.tex> <katalog_latex>
# Wymaga: python3

set -euo pipefail

JSON_FILE="${1:?Brak argumentu: plik JSON sylabusu}"
TEX_OUT="${2:?Brak argumentu: plik wyjściowy .tex}"
LATEX_DIR="${3:?Brak argumentu: katalog latex}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 &>/dev/null; then
  echo "BLAD: python3 nie jest zainstalowany" >&2
  exit 1
fi

# Usun BOM jesli istnieje
python3 -c "
import sys
with open(sys.argv[1], 'rb') as f:
    data = f.read()
if data.startswith(b'\xef\xbb\xbf'):
    data = data[3:]
    with open(sys.argv[1], 'wb') as f:
        f.write(data)
" "$JSON_FILE"

# Deleguj do skryptu Python
python3 "$SCRIPT_DIR/generate-tex.py" "$JSON_FILE" "$TEX_OUT" "$LATEX_DIR"
