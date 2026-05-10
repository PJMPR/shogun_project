# -*- coding: utf-8 -*-
"""
Główny skrypt generujący pliki Word syllabusów na podstawie plików JSON.

Użycie:
    python generate_syllabus.py                   # generuje wszystkie
    python generate_syllabus.py PAI               # generuje tylko PAI
    python generate_syllabus.py PAI RBD WPR       # generuje wybrane kody
"""

import sys
import json
import os
import io
from pathlib import Path

# Wymuszamy UTF-8 na stdout (Windows domyślnie cp1251/cp852)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from syllabus_builder import SyllabusBuilder

# ---------------------------------------------------------------------------
# Konfiguracja katalogów
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent.parent.parent  # katalog projektu (repozytorium)

INPUT_OUTPUT_MAP = {
    BASE_DIR / 'frontend' / 'public' / 'assets' / 'syllabusy': BASE_DIR / 'frontend' / 'public' / 'assets' / 'files' / 'stacjonarne',
    BASE_DIR / 'frontend' / 'public' / 'assets' / 'syllabusy-n': BASE_DIR / 'frontend' / 'public' / 'assets' / 'files' / 'niestacjonarne',
}


def load_json(path: Path) -> dict | None:
    """Wczytuje plik JSON z obsługą błędów."""
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f'  [ERR] Blad parsowania JSON {path.name}: {e}')
        return None
    except Exception as e:
        print(f'  [ERR] Blad wczytywania {path.name}: {e}')
        return None


def generate_single(json_path: Path, output_dir: Path) -> bool:
    """Generuje jeden plik DOCX z pliku JSON. Zwraca True jeśli sukces."""
    data = load_json(json_path)
    if data is None:
        return False

    try:
        builder = SyllabusBuilder(data)
        doc = builder.build()

        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f'{json_path.stem}.docx'
        doc.save(str(output_path))
        print(f'  [OK] {json_path.stem}.docx  ->  {output_path.relative_to(BASE_DIR)}')
        return True
    except Exception as e:
        import traceback
        print(f'  [ERR] Blad generowania {json_path.name}: {e}')
        traceback.print_exc()
        return False


def main():
    # Parsowanie argumentów: opcjonalny --mode s|n|all oraz kody pozycyjne
    args = sys.argv[1:]
    mode = 'all'
    filter_codes = None

    positional = []
    i = 0
    while i < len(args):
        if args[i] == '--mode' and i + 1 < len(args):
            mode = args[i + 1].lower()
            i += 2
        else:
            positional.append(args[i])
            i += 1

    if positional:
        filter_codes = set(a.upper() for a in positional)

    total_ok = 0
    total_err = 0

    # Filtrowanie katalogów według trybu
    filtered_map = {}
    for input_dir, output_dir in INPUT_OUTPUT_MAP.items():
        is_n = 'syllabusy-n' in str(input_dir)
        if mode == 's' and is_n:
            continue
        if mode == 'n' and not is_n:
            continue
        filtered_map[input_dir] = output_dir

    for input_dir, output_dir in filtered_map.items():
        if not input_dir.exists():
            print(f'\n[SKIP] Katalog nie istnieje, pomijam: {input_dir}')
            continue

        json_files = sorted(input_dir.glob('*.json'))
        if filter_codes:
            json_files = [f for f in json_files if f.stem.upper() in filter_codes]

        if not json_files:
            print(f'\n[SKIP] Brak plików JSON w: {input_dir}')
            continue

        tryb = 'stacjonarne' if 'syllabusy-n' not in str(input_dir) else 'niestacjonarne'
        print(f'\n[DIR] Przetwarzam [{tryb}]: {input_dir}')
        print(f'      -> wyjscie:  {output_dir}')
        print(f'      Pliki: {len(json_files)}')
        print('      ' + '-' * 58)

        for json_file in json_files:
            ok = generate_single(json_file, output_dir)
            if ok:
                total_ok += 1
            else:
                total_err += 1

    print('\n' + '=' * 64)
    print(f'  Zakończono: OK={total_ok}  BLEDY={total_err}')
    print('=' * 64)

    if total_err > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()

