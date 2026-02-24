# CI/CD – Zarządzanie sylabusami

## Struktura folderów

```
cicd/
├── scripts/
│   ├── parse-syllabus.sh        # Parsuje JSON, wyznacza ścieżki (helper, można source-ować)
│   ├── generate-tex.sh          # Generuje plik .tex z JSON sylabusu
│   ├── compile-pdf.sh           # Kompiluje .tex → .pdf (pdflatex, 2x przebieg)
│   ├── update-program-json.sh   # Aktualizuje program.json / electives-*.json (pola syllabusFile + pdf)
│   └── process-syllabus.sh      # Główny skrypt orkiestrujący (wywołuje pozostałe)
└── README.md                    # Ten plik
```

## Workflow GitHub Actions: `add-syllabus.yml`

**Plik:** `.github/workflows/add-syllabus.yml`

### Jak uruchomić?

1. Przejdź do zakładki **Actions** w repozytorium GitHub.
2. Wybierz workflow **"Dodaj / zaktualizuj sylabus"**.
3. Kliknij **"Run workflow"**.
4. W polu tekstowym **`syllabus_json`** wklej **całą zawartość** pliku JSON sylabusu.
5. Kliknij **"Run workflow"** (zielony przycisk).

### Co robi workflow?

1. **Walidacja** – sprawdza czy JSON ma poprawną strukturę (`sylabus.kod_przedmiotu`, `sylabus.tryb_studiow`).
2. **Zapis JSON** – kopiuje sylabus do odpowiedniego katalogu:
   - stacjonarny → `public/assets/syllabusy/<KOD>.json`
   - niestacjonarny → `public/assets/syllabusy-n/<KOD>.json`
3. **Generowanie TEX** – tworzy plik `.tex` na podstawie danych z JSON (ta sama logika co lokalny skrypt PowerShell).
4. **Kompilacja PDF** – uruchamia `pdflatex` (2 przebiegi) i zapisuje PDF do:
   - stacjonarny → `public/assets/files/stacjonarne/<KOD>.pdf`
   - niestacjonarny → `public/assets/files/niestacjonarne/<KOD>.pdf`
5. **Aktualizacja programu** – dodaje/aktualizuje pola `syllabusFile` i `pdf` w:
   - `program.json` (lub `niestacjonarne/program.json`)
   - `electives-other.json` (lub `niestacjonarne/electives-other.json`)
   - `electives-specializations.json` (lub `niestacjonarne/electives-specializations.json`)
6. **Commit & push** – zatwierdza wszystkie zmiany z opisem `sylabus(<KOD>): dodaj/zaktualizuj`.

### Wymagane uprawnienia

Workflow wymaga uprawnienia `contents: write` (już skonfigurowane w pliku `.yml`). Domyślne ustawienia repozytorium GitHub pozwalają na to dla Actions.

### Format JSON sylabusu

```json
{
  "sylabus": {
    "uczelnia": "Polsko-Japońska Akademia Technik Komputerowych Filia w Gdańsku",
    "jednostka": "Filia w Gdańsku",
    "kierunek": "INFORMATYKA",
    "profil": "praktyczny",
    "tryb_studiow": "stacjonarny",
    "wersja_z_dnia": "19.02.2026",
    "nazwa_przedmiotu": "Analiza matematyczna",
    "kod_przedmiotu": "AM",
    "rok_studiow": 1,
    "semestr_studiow": 1,
    "obligatoryjny": true,
    "forma_i_liczba_godzin_zajec": {
      "wyklady": 30,
      "cwiczenia_lektorat_seminarium": 30,
      "laboratorium_projekt": null
    },
    "odpowiedzialny_za_przedmiot": "...",
    "ects": 5,
    "godziny": {
      "z_udzialem_prowadzacego_h": 60,
      "praca_wlasna_studenta_h": 65,
      "calkowita_liczba_godzin_h": 125
    },
    "...": "..."
  }
}
```

Pole `tryb_studiow` decyduje o tym, gdzie sylabus trafia:
- zawiera "stacjonar" (bez "nie") → katalogi stacjonarne
- zawiera "niestacjonar" → katalogi niestacjonarne

### Lokalne uruchamianie skryptów

Skrypty działają na systemach Linux/macOS. Na Windows użyj WSL lub Git Bash.

```bash
# Przetwarzanie pojedynczego sylabusu lokalnie
bash cicd/scripts/process-syllabus.sh /ścieżka/do/AM.json
```

### Zależności runnera

Workflow automatycznie instaluje:
- `jq` – parsowanie JSON
- `texlive-latex-base`, `texlive-latex-extra`, `texlive-fonts-recommended`,
  `texlive-fonts-extra`, `texlive-lang-polish`, `texlive-pictures`, `lmodern`

