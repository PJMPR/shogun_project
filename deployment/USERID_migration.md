# Migracja identyfikacji wykładowców na Keycloak `userId`

Instrukcja wdrożenia zmiany, która zastępuje e-mail jako identyfikator wykładowcy wartością claimu `sub` z Keycloak. E-mail pozostaje opcjonalnym snapshotem. Migracja obejmuje dezyderaty, wpisy planu, komentarze oraz pola audytowe.

## Co zostanie wykonane

- Assignments API doda nullable `LecturerUserId` do `lecturer_assignments` w MariaDB i dopuści `NULL` w `LecturerEmail`.
- Schedule API zastosuje migrację EF `20260810201902_AddKeycloakUserIdentity` w PostgreSQL.
- Oba API spróbują uzupełnić stare rekordy przez Keycloak Admin API, dopasowując jednoznaczny e-mail do Keycloak `userId`.
- Rekordy bez jednoznacznego dopasowania nie są usuwane ani nadpisywane; ich `userId` pozostaje pusty.
- Przy wejściu wykładowcy do własnych dezyderatów stare rekordy bez `userId` są dodatkowo, bezpiecznie wiązane z `sub` na podstawie e-maila z jego tokena.

## Wymagania przed wdrożeniem

Wykonuj polecenia na serwerze z katalogu repozytorium, przykładowo:

```bash
cd ~/shogun_project
```

Sprawdź, czy działają bazy i Keycloak:

```bash
docker ps --filter name=pj_mariadb --filter name=pj_postgres_schedule --filter name=pj_keycloak
docker exec pj_mariadb healthcheck.sh --connect --innodb_initialized
docker exec pj_postgres_schedule pg_isready
```

Plik `deployment/.env.prod` musi zawierać niepusty `USERS_SERVICE_CLIENT_SECRET`. Nie wyświetlaj sekretu w terminalu:

```bash
grep -qE '^USERS_SERVICE_CLIENT_SECRET=.+$' deployment/.env.prod || {
  echo 'Brak USERS_SERVICE_CLIENT_SECRET'
  exit 1
}
```

Konto serwisowe klienta `shogun-users-service` musi mieć co najmniej rolę klienta `realm-management/view-users`. Konfiguracja Terraform w repozytorium już nadaje tę rolę. Jeżeli produkcyjny Keycloak nie był synchronizowany z aktualnym Terraformem, wykonaj przed wdrożeniem:

```bash
cd backend/infrastructure/keycloak
terraform init
terraform plan
terraform apply
cd ../../..
```

Po `terraform apply` upewnij się, że aktualny sekret jest wpisany do `deployment/.env.prod`:

```bash
cd backend/infrastructure/keycloak
terraform output -raw users_service_client_secret
```

Nie zapisuj wyniku w historii poleceń ani w repozytorium.

## 1. Backup przed migracją

Uruchom logiczny backup MariaDB i PostgreSQL:

```bash
docker compose \
  -f deployment/docker-compose.databases.prod.yml \
  --env-file deployment/.env.prod \
  exec db-backup /app/backup.sh
```

Zweryfikuj najnowsze pliki i sumy kontrolne w katalogu wskazanym przez `BACKUP_DIR`:

```bash
docker exec pj_db_backup find /backups -maxdepth 2 -type f -ls
docker exec pj_db_backup sh -c \
  'find /backups -name "*.sha256" -execdir sha256sum -c "{}" \;'
```

Nie kontynuuj, jeśli backup lub weryfikacja zakończyły się błędem.

## 2. Pobranie kodu i kontrola konfiguracji

```bash
git pull --ff-only

docker compose \
  -f deployment/docker-compose.prod.yml \
  --env-file deployment/.env.prod \
  config --quiet
```

Sprawdź, czy `assignments-api` i `schedule-api` otrzymują ustawienia `KEYCLOAK__ADMINBASEURL`, `KEYCLOAK__REALM`, `KEYCLOAK__CLIENTID` i `KEYCLOAK__CLIENTSECRET`. Nie używaj `docker compose config` bez filtrowania na współdzielonym terminalu, ponieważ rozwinięta konfiguracja może zawierać sekrety.

## 3. Budowa obrazów

Zmiana dotyczy dwóch API oraz frontendów korzystających z nowego kontraktu:

```bash
docker compose \
  -f deployment/docker-compose.prod.yml \
  --env-file deployment/.env.prod \
  build \
    assignments-api \
    schedule-api \
    mfe-host \
    mfe-assignements \
    mfe-lecturers-assignments \
    mfe-schedule \
    mfe-lecturer-schedule
```

## 4. Uruchomienie migracji i nowych kontenerów

```bash
docker compose \
  -f deployment/docker-compose.prod.yml \
  --env-file deployment/.env.prod \
  up -d --no-deps \
    assignments-api \
    schedule-api \
    mfe-host \
    mfe-assignements \
    mfe-lecturers-assignments \
    mfe-schedule \
    mfe-lecturer-schedule
```

Nginx rozwiązuje nazwy upstreamów podczas startu. Po odtworzeniu kontenerów ich adresy IP mogą się zmienić, dlatego odtwórz proxy:

```bash
docker compose \
  -f deployment/docker-compose.prod.yml \
  --env-file deployment/.env.prod \
  up -d --no-deps --force-recreate proxy
```

Schedule API stosuje migracje EF automatycznie przed rozpoczęciem obsługi żądań. Assignments API wykonuje idempotentną zmianę schematu MariaDB przy starcie.

## 5. Weryfikacja migracji i backfillu

Sprawdź status i brak pętli restartów:

```bash
docker compose \
  -f deployment/docker-compose.prod.yml \
  --env-file deployment/.env.prod \
  ps

docker inspect pj_assignments_api pj_schedule_api \
  --format '{{.Name}} status={{.State.Status}} restarts={{.RestartCount}}'
```

Sprawdź logi. Nie powinno być odpowiedzi `401`/`403` z Keycloak podczas backfillu:

```bash
docker logs --since 10m pj_assignments_api 2>&1 | \
  grep -E 'Backfill|Uzupełniono|401|403|Application started'

docker logs --since 10m pj_schedule_api 2>&1 | \
  grep -E 'AddKeycloakUserIdentity|Backfill|Uzupełniono|401|403|Application started'
```

Oczekiwane są komunikaty o zastosowaniu migracji albo o braku oczekujących migracji oraz informacja o liczbie uzupełnionych identyfikatorów. Jeśli Keycloak był chwilowo niedostępny, backfill zostanie ponowiony przy następnym restarcie API:

```bash
docker compose \
  -f deployment/docker-compose.prod.yml \
  --env-file deployment/.env.prod \
  restart assignments-api schedule-api
```

Zweryfikuj kolumny bez wyświetlania danych użytkowników:

```bash
docker exec pj_mariadb sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -N -e "
    SELECT COLUMN_NAME, IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = '\''pj_assignments'\''
      AND TABLE_NAME = '\''lecturer_assignments'\''
      AND COLUMN_NAME IN ('\''LecturerUserId'\'', '\''LecturerEmail'\'');"'

docker exec pj_postgres_schedule sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "
    SELECT \"MigrationId\"
    FROM \"__EFMigrationsHistory\"
    WHERE \"MigrationId\" = '\''20260810201902_AddKeycloakUserIdentity'\'';"'
```

Sprawdź endpointy:

```bash
DOMAIN=$(grep '^DOMAIN=' deployment/.env.prod | cut -d= -f2-)
curl -fsS "https://${DOMAIN}/api-assignments/health"
curl -fsS "https://${DOMAIN}/api-schedule/health"
curl -fsS "https://${DOMAIN}/mfe-assignements/remoteEntry.json" >/dev/null
curl -fsS "https://${DOMAIN}/mfe-schedule/remoteEntry.json" >/dev/null
curl -fsS "https://${DOMAIN}/mfe-lecturer-schedule/remoteEntry.json" >/dev/null
curl -fsS "https://${DOMAIN}/mfe-lecturers-assignments/remoteEntry.json" >/dev/null
```

Manifesty `remoteEntry.json` muszą zwracać `Cache-Control: no-store`, a nieistniejący plik JavaScript powinien zwracać `404`, nigdy `index.html` z typem `text/html`. Przykładowa kontrola podglądu planu wykładowcy:

```bash
curl -fsSI "https://${DOMAIN}/mfe-lecturer-schedule/remoteEntry.json" | \
  grep -iE 'HTTP/|content-type|cache-control'

test "$(curl -sS -o /dev/null -w '%{http_code}' \
  "https://${DOMAIN}/mfe-lecturer-schedule/nieistniejacy-plik.js")" = "404"
```

## 6. Test funkcjonalny

Wykonaj co najmniej następujące testy:

1. Zaloguj wykładowcę mającego wcześniejsze dezyderaty. Poprzednio wybrane przedmioty i dostępność powinny być zaznaczone.
2. Zapisz dezyderat użytkownika bez e-maila i sprawdź, czy pojawia się ponownie po odświeżeniu.
3. W planie wybierz wykładowcę z dezyderatu, zapisz plan i ponownie go otwórz.
4. W widoku wykładowcy wybierz „Mój plan” i sprawdź filtrowanie po zalogowanym koncie.
5. Dodaj, edytuj i usuń własny komentarz. Administrator powinien nadal móc usunąć dowolny komentarz.

## Niejednoznaczne lub niedopasowane rekordy

Automatyczny backfill celowo pomija e-maile, które nie występują dokładnie u jednego użytkownika Keycloak. Dane pozostają dostępne, ale taki rekord wymaga ręcznej analizy. Nie wpisuj losowego `userId` i nie usuwaj starego rekordu.

W przypadku starych dezyderatów użytkownik z poprawnym e-mailem w tokenie zwiąże swoje rekordy automatycznie podczas pierwszego otwarcia modułu. Dla wpisów planów i komentarzy niedopasowane rekordy pozostają historyczne do czasu ręcznego przypisania.

## Rollback

Dodane kolumny są kompatybilne wstecz i nie są usuwane podczas zwykłego rollbacku obrazu. Nie uruchamiaj automatycznie migracji `Down` na produkcji.

Jeżeli trzeba wycofać aplikację przed zapisaniem danych użytkowników bez e-maila, uruchom poprzednie obrazy/kod i odtwórz proxy. Po zapisaniu rekordów bez e-maila stara wersja aplikacji nie jest już w pełni kompatybilna — pełny rollback wymaga przywrócenia obu baz z backupu wykonanego przed migracją. Procedury odtwarzania znajdują się w `database/backup/README.md`.

## Czy skrypty deploymentowe wymagają zmiany?

- `deployment/docker-compose.prod.yml` wymaga przekazania konfiguracji Keycloak Admin API do `assignments-api` i `schedule-api`. Ta zmiana jest już zawarta w repozytorium.
- `deployment/.env.prod.example` już zawiera `USERS_SERVICE_CLIENT_SECRET`; na serwerze trzeba jedynie zachować jego rzeczywistą wartość w `.env.prod`.
- Terraform już nadaje `shogun-users-service` rolę `realm-management/view-users`, więc dla aktualnego środowiska nie wymaga zmiany kodu; może wymagać ponownego `terraform apply`, jeśli stan produkcyjny jest starszy.
- `deployment/deploy.sh` nie wymaga zmiany funkcjonalnej. Pełne `./deployment/deploy.sh` przebuduje i odtworzy cały stack wraz z proxy. Procedura selektywna opisana wyżej daje krótszą przerwę i jawnie kontroluje migrację.
- Skrypty baz danych i Keycloak nie wymagają restartu ani przebudowy na potrzeby tej migracji.
