# Wdrożenie wyłącznie planu zajęć

Instrukcja dotyczy produkcji i nie restartuje pozostałych baz danych ani usług
Shoguna. Polecenia wykonuj na serwerze z katalogu `deployment`.

## Składniki

Plan zajęć korzysta z:

- PostgreSQL `pj_postgres_schedule` z wolumenem `postgres_schedule_data`,
- API `.NET` `pj_schedule_api`,
- mikrofrontendu `pj_mfe_schedule`,
- hosta `pj_mfe_host`, który rejestruje trasę `/schedule`,
- istniejącego proxy `pj_proxy`, które wystawia `/api-schedule/` oraz
  `/mfe-schedule/`,
- istniejącego Keycloak i realmowej roli `planner` (alternatywnie `admin`).

## 1. Przygotowanie konfiguracji

W `.env.prod` ustaw silne, unikalne dane PostgreSQL:

```dotenv
SCHEDULE_POSTGRES_DB=pj_schedule
SCHEDULE_POSTGRES_USER=shogun_schedule
SCHEDULE_POSTGRES_PASSWORD=<silne_haslo>
```

Pliku `.env.prod` nie należy commitować.

Upewnij się, że wspólna sieć i Keycloak już działają:

```bash
docker network inspect shogun_network >/dev/null
docker ps --filter name=pj_keycloak
```

## 2. Utworzenie roli Keycloak

Konfiguracja Terraform zawiera realmową rolę `planner`. Zastosuj ją przed
udostępnieniem ekranu planistom:

```bash
cd ~/shogun_project/backend/infrastructure/keycloak
terraform init
terraform plan
terraform apply
```

Przypisz użytkownikom rolę `planner` w Keycloak. Rola `admin` również zapewnia
dostęp do planu zajęć.

## 3. Uruchomienie wyłącznie bazy planu

```bash
cd ~/shogun_project/deployment
docker compose \
  -f docker-compose.databases.prod.yml \
  --env-file .env.prod \
  up -d postgres-schedule
```

Sprawdź stan:

```bash
docker compose \
  -f docker-compose.databases.prod.yml \
  --env-file .env.prod \
  ps postgres-schedule

docker exec pj_postgres_schedule sh -c \
  'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Nie wykonuj na produkcji `down --volumes`. Usunięcie wolumenu
`postgres_schedule_data` usuwa wszystkie zapisane plany.

## 4. Build i uruchomienie komponentów planu

Zbuduj tylko API planu, mikrofrontend planu i host aplikacji:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  build schedule-api mfe-schedule mfe-host
```

Uruchom je bez dotykania pozostałych usług:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps schedule-api mfe-schedule mfe-host
```

API automatycznie stosuje oczekujące migracje EF Core podczas startu.

## 5. Przeładowanie proxy

Konfiguracja produkcyjnego nginx musi zawierać trasy planu. Odtwórz wyłącznie
proxy, nie uruchamiając jego zależności:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps --force-recreate proxy
```

## 6. Weryfikacja

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  ps schedule-api mfe-schedule mfe-host proxy

docker logs --tail 100 pj_schedule_api
curl -fsS https://shogun.pjwstk.edu.pl/api-schedule/health
curl -fsS https://shogun.pjwstk.edu.pl/mfe-schedule/remoteEntry.json >/dev/null
```

Następnie zaloguj się użytkownikiem z rolą `planner` i otwórz:

```text
https://shogun.pjwstk.edu.pl/schedule
```

Sprawdź utworzenie planu, zapis bloczka, odświeżenie oraz ponowny odczyt planu.

## Kolejna aktualizacja tylko planu zajęć

```bash
cd ~/shogun_project
git pull --ff-only
cd deployment

docker compose -f docker-compose.prod.yml --env-file .env.prod \
  build schedule-api mfe-schedule mfe-host

docker compose -f docker-compose.prod.yml --env-file .env.prod \
  up -d --no-deps schedule-api mfe-schedule mfe-host

docker compose -f docker-compose.prod.yml --env-file .env.prod \
  restart proxy
```

Aktualizacja API, frontendu i hosta nie usuwa ani nie odtwarza wolumenu
PostgreSQL.
