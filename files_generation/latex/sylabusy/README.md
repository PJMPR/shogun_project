# LaTeX – Środowisko pracy PJATK

## Struktura

```
latex/
├── syllabusy/        ← pliki .tex (jeden per przedmiot)
│   └── ASD.tex       ← przykład
├── szablony/
│   └── pjatk.sty     ← wspólny styl PJATK
├── output/           ← wygenerowane PDF (ignorowane przez git)
└── build-latex.ps1   ← skrypt kompilacji
```

## Wymagania

- **MiKTeX 25.x** (zainstalowany w `%LOCALAPPDATA%\Programs\MiKTeX`)
- MiKTeX automatycznie pobiera brakujące pakiety przy pierwszej kompilacji

## Kompilacja

```powershell
# Z folderu latex/

# Kompiluj wszystkie sylabusy
.\build-latex.ps1

# Kompiluj konkretny plik (np. ASD.tex) i otwórz PDF
.\build-latex.ps1 ASD -open

# Kompiluj konkretny plik bez otwierania
.\build-latex.ps1 ASD
```

## Tworzenie nowego sylabusu

1. Skopiuj `syllabusy/ASD.tex` jako punkt startowy
2. Zmień nazwę na kod przedmiotu, np. `PRG.tex`
3. Zaktualizuj dane w sekcji nagłówkowej
4. Skompiluj: `.\build-latex.ps1 PRG -open`

## Pakiety LaTeX używane w szablonie

| Pakiet       | Opis                          |
|--------------|-------------------------------|
| `babel`      | Język polski                  |
| `geometry`   | Marginesy A4                  |
| `fancyhdr`   | Nagłówki i stopki             |
| `titlesec`   | Formatowanie sekcji           |
| `booktabs`   | Ładne tabele                  |
| `tabularx`   | Tabele ze zmienną szerokością |
| `colortbl`   | Kolorowe nagłówki tabel       |
| `mdframed`   | Ramki informacyjne            |
| `hyperref`   | Hiperłącza w PDF              |
| `xcolor`     | Kolory PJATK                  |
| `enumitem`   | Listy                         |

