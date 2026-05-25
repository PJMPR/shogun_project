# Shogun – Monorepo PJATK

System zarządzania programami studiów, sylabusami i obsadami PJATK (rok 2026/27).

## Struktura monorepo

```
frontend/
  pj-studies-host/          # Shell Angular (MFE host) – nawigacja, auth
  pj-studies-program/       # MFE – programy studiów
  pj-studies-syllabi/       # MFE – przeglądarka i edytor sylabusów
  pj-studies-assignements/  # MFE – obsady zajęć
backend/
  Shogun.ProgramData.Service/   # .NET 10 REST API – sylabusy, programy, przedmioty
  Shogun.Assignments/           # .NET 10 REST API – obsady zajęć
  proxy/                        # Konfiguracja nginx (reverse proxy)
  docker-compose.yml            # Pełny stack uruchomieniowy
database/
  mongo/                        # Inicjalizacja MongoDB (kolekcje, seed)
files_generation/               # Narzędzia generujące PDF, DOCX, JSON
```

## Wymagania

- Docker Desktop
- .NET 10 SDK (lokalny development)
- Node.js 22+ / npm 11+
- MariaDB 11 (uruchomiony lokalnie – używany przez Assignments API i Keycloak)
- MongoDB 7 (uruchomiony lokalnie)

## Uruchomienie (Docker Compose)

### 1. Przygotowanie baz danych (Docker)

Wszystkie wymagane bazy danych uruchamiane są automatycznie przez Docker Compose:

```bash
cd backend
docker compose up -d mariadb mongo
```

#### MariaDB – ręczne utworzenie baz

Po uruchomieniu kontenera MariaDB, utwórz wymagane bazy (np. przez DBeaver, TablePlus lub CLI):

```sql
CREATE DATABASE pj_assignments CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE shogun_users   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE shogun        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;  -- dla obsad
```

Domyślne dane logowania (zdefiniowane w docker-compose.yml):
- host: `localhost` lub `127.0.0.1`
- port: `3306`
- user: `root`
- password: `password`

#### MongoDB – inicjalizacja danych

Po uruchomieniu kontenera MongoDB, zainicjuj bazę i kolekcje:

```bash
cd database/mongo
npm install
npm run init
```

Domyślne dane logowania:
- host: `localhost` lub `127.0.0.1`
- port: `27017`
- user: `admin`
- password: `haslo123`
- baza: `pj_sylabi`

### 2. Plik .env

Dostosuj `backend/.env` (domyślne wartości działają dla standardowej instalacji MariaDB):

```env
KC_DB_USER=root
KC_DB_PASS=password
KC_ADMIN_USER=admin
KC_ADMIN_PASS=admin_pass
```

### 3. Wpis w hosts

Dodaj do `C:\Windows\System32\drivers\etc\hosts` (Windows) lub `/etc/hosts` (Linux/macOS):

```
127.0.0.1  shogun.pjwstk.edu.pl
```

### 4. Certyfikat TLS (mkcert)

Keycloak 26 wymusza PKCE, które wymaga bezpiecznego kontekstu (HTTPS). Zainstaluj mkcert i wygeneruj lokalnie zaufany certyfikat:

```powershell
winget install FiloSottile.mkcert
# uruchom nowy terminal, następnie:
mkcert -install
cd backend/proxy/certs
mkcert shogun.pjwstk.edu.pl
```

> Po `mkcert -install` certyfikat jest automatycznie zaufany przez Chrome, Edge i Firefox.


### 5. Uruchomienie całego środowiska

```bash
cd backend
docker compose --env-file .env up -d
```

```bash
docker compose up --build --force-recreate --remove-orphans
```

Aplikacja dostępna pod: **https://shogun.pjwstk.edu.pl:8443**

| Serwis | URL |
|---|---|
| Aplikacja (shell) | https://shogun.pjwstk.edu.pl:8443 |
| Keycloak Admin UI | https://shogun.pjwstk.edu.pl:8443/auth/admin |
| Keycloak Admin (direct) | http://localhost:8180/auth/admin |
| Syllabi API (Scalar) | https://shogun.pjwstk.edu.pl:8443/api/scalar/v1 |
| Assignments API (Scalar) | https://shogun.pjwstk.edu.pl:8443/api-assignments/scalar/v1 |

## Konfiguracja Keycloak (pierwsze uruchomienie)

Po uruchomieniu stacku skonfiguruj Keycloak (**https://shogun.pjwstk.edu.pl:8443/auth/admin**):

### 1. Utwórz realm

- Zaloguj się danymi z `.env` (`KC_ADMIN_USER` / `KC_ADMIN_PASS`)
- Utwórz realm: **`shogun`**

### 2. Utwórz klienta Angular

- Client ID: **`shogun-web`**
- Client type: `OpenID Connect`
- Client authentication: **OFF** (publiczny)
- Valid redirect URIs: `https://shogun.pjwstk.edu.pl:8443/*`
- Web origins: `https://shogun.pjwstk.edu.pl:8443`
- Consent required: **ON** (wymaga zgody na udostępnienie danych)
- Required scopes: `profile`, `email`

### 3. Dodaj Google jako Identity Provider

Wymagany projekt w Google Cloud z OAuth 2.0 Client ID:

- Authorized JavaScript origins: `https://shogun.pjwstk.edu.pl:8443`
- Authorized redirect URI: `https://shogun.pjwstk.edu.pl:8443/auth/realms/shogun/broker/google/endpoint`

W Keycloak (realm `shogun` → Identity Providers → Google):
- Client ID / Secret: z Google Cloud
- First Login Flow: `first broker login`

### 4. Ogranicz logowanie do domeny uczelni

W realm `shogun` → Identity Providers → Google → Mappers, dodaj mapper:
- Type: `Hardcoded Role` lub `Username Template Importer`

Alternatywnie dodaj **Authentication Flow** z warunkiem weryfikującym domenę emaila:
- Realm → Authentication → Flows → First Broker Login
- Dodaj krok `Script Authenticator` lub `Condition - User Attribute` sprawdzający, czy `email` kończy się na `@pjwstk.edu.pl` lub `@pjatk.edu.pl`

## Architektura

```
Przeglądarka
    │
    ▼ :8443 (HTTPS)
┌─────────────────────────────────────────────────────────┐
│  nginx (proxy)                                          │
│  /auth/*         → Keycloak :8080                       │
│  /api/*          → Syllabi API :8080                    │
│  /api-assignments/* → Assignments API :8080             │
│  /mfe-program/*  → MFE Program :80                      │
│  /mfe-syllabi/*  → MFE Syllabi :80                      │
│  /mfe-assignements/* → MFE Assignements :80             │
│  /*              → Shell (Host) :80                     │
└─────────────────────────────────────────────────────────┘
    │
    ├── Keycloak 26  ──────── MariaDB (host:3306/shogun_users)
    ├── Syllabi API (.NET 10) ─ MongoDB (host:27017/pj_sylabi)
    └── Assignments API (.NET 10) ─ MariaDB (host:3306/pj_assignments)
```

## Autentykacja

Aplikacja używa **Keycloak** z Google jako Identity Provider (konta Gmail domeny `pjwstk.edu.pl` / `pjatk.edu.pl`). Shell Angular inicjalizuje sesję przez `keycloak-js` (`onLoad: login-required`) i przekazuje token Bearer do wywołań API przez HTTP interceptor.

## Generowanie dokumentów

### PDF sylabusów (Windows + MiKTeX)
```powershell
cd files_generation/latex
.\build-all-syllabi.ps1         # wszystkie
.\build-all-syllabi.ps1 -Mode s # tylko stacjonarne
.\build-all-syllabi.ps1 -Mode n # tylko niestacjonarne
```

### PDF programu studiów
```powershell
cd files_generation/latex-studia
.\build-program.ps1
```

### Indeks sylabusów (JSON)
```bash
cd files_generation
node scripts/generate-syllabus-index.mjs
```

## CI/CD

- **Deploy do GitHub Pages** – automatyczny przy push do `main` (workflow `deploy.yml`)
- **Dodaj / zaktualizuj sylabus** – ręczne uruchomienie z JSON jako wejściem (workflow `add-syllabus.yml`)

