# Shogun.SyllabusPdf

Generator tworzy pojedynczy plik PDF sylabusu na podstawie dokumentu JSON.
Jest to pierwszy etap wydzielenia generatora do osobnego serwisu backendowego.

## Wymagania

- PowerShell 7 lub Windows PowerShell 5.1
- `pdflatex` dostępny w `PATH` albo MiKTeX zainstalowany w domyślnej lokalizacji użytkownika Windows
- pakiety LaTeX używane przez szablon, między innymi `babel`, `lmodern`, `microtype`, `geometry`, `booktabs`, `tabularx`, `longtable`, `multirow`, `colortbl`, `enumitem`, `fancyhdr`, `titlesec`, `mdframed`, `hyperref`, `eso-pic`, `tikz` i `tocloft`

## Uruchomienie

Z głównego katalogu repozytorium:

```powershell
./backend/Shogun.SyllabusPdf/Generator/generate-syllabus.ps1 `
  -InputFile ./frontend/public/assets/syllabusy/ASD.json `
  -OutputFile ./backend/Shogun.SyllabusPdf/output/ASD.pdf
```

Skrypt oczekuje obiektu `sylabus` w korzeniu dokumentu:

```json
{
  "sylabus": {
    "kod_przedmiotu": "ASD"
  }
}
```

Pole `sylabus.kod_przedmiotu` jest wymagane. Katalog wyjściowy zostanie utworzony automatycznie.

## Izolacja uruchomień

Każde uruchomienie używa osobnego katalogu w systemowym katalogu tymczasowym. Po zakończeniu, także w przypadku błędu, katalog jest usuwany. Pozwala to bezpiecznie uruchamiać kilka procesów generatora jednocześnie i przygotowuje implementację pod przyszłe API HTTP.

Kompilacja odbywa się trzy razy z wyłączonym `shell-escape`, tak jak w dotychczasowym generatorze.

## API HTTP

Projekt `Shogun.SyllabusPdf.Api` udostępnia endpoint:

```text
POST /api/v1/syllabi/pdf
Content-Type: application/json
```

Przykład lokalnego wywołania:

```bash
curl -X POST http://localhost:8080/api/v1/syllabi/pdf \
  -H "Content-Type: application/json" \
  --data-binary @ASD.json \
  --output ASD.pdf
```

Poprawna odpowiedź ma typ `application/pdf` i nagłówek pobrania z kodem przedmiotu. Maksymalny rozmiar żądania wynosi 2 MiB.

Endpointy diagnostyczne:

```text
GET /health/live
GET /health/ready
```

Konfiguracja generatora znajduje się w sekcji `Generator`:

| Ustawienie | Domyślna wartość | Znaczenie |
|---|---:|---|
| `ScriptPath` | `Generator/generate-syllabus.ps1` | Ścieżka do skryptu względem katalogu aplikacji |
| `PowerShellExecutable` | automatycznie | `powershell.exe` na Windows lub `pwsh` na Linuksie |
| `TimeoutSeconds` | `60` | Maksymalny czas pojedynczej generacji |
| `MaxConcurrency` | `2` | Maksymalna liczba jednoczesnych procesów LaTeX |

## Docker

Z katalogu `backend`:

```bash
docker compose build syllabus-pdf
docker compose up -d syllabus-pdf
```

W sieci Compose pozostałe usługi mogą korzystać z adresu:

```text
http://syllabus-pdf:8080/api/v1/syllabi/pdf
```

Port nie jest publikowany na hoście. Kontener korzysta z tymczasowego systemu plików `/tmp` ograniczonego do 512 MiB.
