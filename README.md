# GD_WI_PRG_26-27 – Monorepo

Repozytorium programów i sylabusów studiów PJATK (rok 2026/27).

## Struktura monorepo

```
frontend/            # Aplikacja Angular (przeglądarka sylabusów)
files_generation/    # Narzędzia generujące PDF, DOCX, JSON
backend/             # Przyszłe API (placeholder)
database/            # Przyszłe schematy BD (placeholder)
.github/workflows/   # CI/CD: deploy do GitHub Pages + dodawanie sylabusów
```

## Frontend (Angular)

```bash
cd frontend
npm ci
npm start            # dev server: http://localhost:4200
npm run build:gh-pages   # production build dla GitHub Pages
npm test             # testy jednostkowe (Vitest)
```

## Generowanie dokumentów

### PDF sylabusów (Windows + MiKTeX)
```powershell
cd files_generation/latex
.\build-all-syllabi.ps1         # wszystkie
.\build-all-syllabi.ps1 -Mode s # tylko stacjonarne
.\build-all-syllabi.ps1 -Mode n # tylko niestacjonarne
```

### PDF programu studiów (Windows + MiKTeX)
```powershell
cd files_generation/latex-studia
.\build-program.ps1
```

### Pliki Word (DOCX) sylabusów
```bash
cd files_generation/sylabus-word
python generate_syllabus.py       # wszystkie
python generate_syllabus.py AM    # wybrany kod
```

### Indeks sylabusów (JSON)
```bash
cd files_generation
node scripts/generate-syllabus-index.mjs
```

### Mapa KEU
```bash
cd files_generation
node _gen_keu_map.mjs
```

## CI/CD

- **Deploy do GitHub Pages** – automatyczny przy push do `main` (workflow `deploy.yml`)
- **Dodaj / zaktualizuj sylabus** – ręczne uruchomienie z JSON jako wejściem (workflow `add-syllabus.yml`)

