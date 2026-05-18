# Shogun.Syllabi.Service — Backend REST API

Produkcyjny backend .NET 10 w stylu Clean Architecture dla MongoDB (`pj_sylabi`).

## Projekty w solucji

| Projekt | Rola |
|---|---|
| `Shogun.Syllabi.Service.Domain` | Encje, interfejsy repozytoriów |
| `Shogun.Syllabi.Service.Application` | DTOs, walidatory (FluentValidation), serwisy aplikacyjne |
| `Shogun.Syllabi.Service.Infrastructure` | MongoDB.Driver, implementacje repozytoriów |
| `Shogun.Syllabi.Service.Api` | ASP.NET Core Web API, kontrolery, middleware, Scalar/OpenAPI |
| `Shogun.Syllabi.Service.Seed` | Upsert danych z plików JSON + tworzenie indeksów |
| `Shogun.Syllabi.Service.UnitTests` | Testy jednostkowe (xUnit, NSubstitute, FluentAssertions) |
| `Shogun.Syllabi.Service.IntegrationTests` | Testy integracyjne (Testcontainers dla MongoDB) |

## Endpoints

Bazowy URL: `http://localhost:8080/api/v1`

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/syllabi` | Lista sylabus (paginacja, filtry, wyszukiwanie) |
| GET | `/syllabi/{id}` | Pobierz sylabus po ObjectId |
| POST | `/syllabi` | Utwórz sylabus |
| PUT | `/syllabi/{id}` | Zastąp sylabus |
| DELETE | `/syllabi/{id}` | Usuń sylabus |
| GET | `/programs` | Lista programów |
| GET | `/programs/{id}` | Pobierz program |
| POST | `/programs` | Utwórz program |
| PUT | `/programs/{id}` | Zastąp program |
| DELETE | `/programs/{id}` | Usuń program |
| GET | `/electives` | Lista przedmiotów obieralnych |
| GET | `/electives/{id}` | Pobierz przedmiot obieralny |
| POST | `/electives` | Utwórz przedmiot obieralny |
| PUT | `/electives/{id}` | Zastąp przedmiot obieralny |
| DELETE | `/electives/{id}` | Usuń przedmiot obieralny |
| GET | `/health` | Health check |

### Parametry listy (query params)

| Parametr | Domyślna | Opis |
|---|---|---|
| `page` | 1 | Numer strony |
| `pageSize` | 20 | Rozmiar strony |
| `sortBy` | — | Nazwa pola do sortowania |
| `sortDir` | `asc` | Kierunek (`asc`/`desc`) |
| `search` | — | Full-text search po polach tekstowych |

### Dodatkowe filtry dla `/syllabi`

| Parametr | Opis |
|---|---|
| `kod_przedmiotu` | Regex na kod przedmiotu |
| `tryb_studiow` | `stacjonarny` lub `niestacjonarny` |
| `is_stary` | `true` / `false` |

### Dodatkowe filtry dla `/programs`

`tryb_studiow`, `is_stary`, `lang` (`pl`/`en`)

### Dodatkowe filtry dla `/electives`

`elective_type` (`other`/`specializations`), `tryb_studiow`, `is_stary`, `lang`

## Uruchomienie — Docker

```bash
cd backend

# Opcjonalnie: dostosuj .env
# cp .env .env.local

# Uruchom MongoDB + API
docker compose --env-file .env up -d mongo api

# Uruchom seed (jednorazowo)
docker compose --env-file .env run --rm seed
```

API dostępne pod: http://localhost:8080  
Swagger/Scalar: http://localhost:8080/scalar/v1 (tylko środowisko Development)

## Uruchomienie — lokalnie

Wymagania: .NET 10 SDK, MongoDB 7

```bash
# Start MongoDB (jeśli brak lokalnego)
docker run -d -p 27017:27017 --name mongo mongo:7

# Uruchom API
cd backend/Shogun.Syllabi.Service.Api
dotnet run

# Uruchom seed (z katalogu backend)
cd ../Shogun.Syllabi.Service.Seed
dotnet run -- "../../.."    # ścieżka do roota repo
```

## Konfiguracja

| Zmienna | Domyślna | Opis |
|---|---|---|
| `MONGODB__CONNECTIONSTRING` | `mongodb://localhost:27017` | Connection string MongoDB |
| `MONGODB__DATABASENAME` | `pj_sylabi` | Nazwa bazy danych |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Środowisko (`Development` włącza Swagger) |

## Testy

```bash
# Testy jednostkowe
dotnet test Shogun.Syllabi.Service.UnitTests

# Testy integracyjne (wymaga Docker — Testcontainer z MongoDB)
dotnet test Shogun.Syllabi.Service.IntegrationTests
```

## Przykładowe requesty

Plik [`requests.http`](requests.http) — obsługiwany przez VS Code REST Client i JetBrains HTTP Client.

## Architektura

```
Api  ──►  Application  ──►  Domain
 │             │
 └──►  Infrastructure ──implements──►  Domain (repozytoria)
```

- **Domain** — czyste encje BSON + interfejsy repozytoriów, bez zależności frameworkowych
- **Application** — serwisy mapujące encje ↔ DTOs + walidatory FluentValidation
- **Infrastructure** — MongoDB.Driver, implementacje repozytoriów
- **Api** — kontrolery, GlobalExceptionHandler → RFC 7807, Serilog, health checks
- **Seed** — standalone console app — upsert JSON → MongoDB + tworzenie indeksów
