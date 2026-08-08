# Wdrożenie podglądu planu zajęć na produkcję

Instrukcja wdraża nowy mikrofrontend podglądu planu, aktualizację hosta oraz
Schedule API. Nie usuwa danych i nie odtwarza wolumenu PostgreSQL. Polecenia
wykonuj na serwerze produkcyjnym z repozytorium `shogun_project`.

## Co zostanie wdrożone

- `pj_mfe_lecturer_schedule` — podgląd opublikowanego planu,
- `pj_mfe_host` — trasa `/plan-zajec` i pozycja w menu,
- `pj_schedule_api` — endpointy opublikowanych planów, uprawnienia i poprawiona
  reguła publikacji,
- `pj_proxy` — routing `/mfe-lecturer-schedule/`.

Schedule API podczas startu automatycznie zastosuje migrację EF Core
`RestoreScheduleSelectionUniqueness`. Po migracji jeden plan odpowiada jednej
kombinacji: wydział + rok akademicki + semestr + tryb studiów.

## 1. Wymagania przed wdrożeniem

Sprawdź obecność konfiguracji, certyfikatów, sieci i bazy planu:

```bash
cd ~/shogun_project/deployment

test -f .env.prod
test -f certs/fullchain.pem
test -f certs/privkey.pem
docker network inspect shogun_network >/dev/null
docker ps --filter name=pj_postgres_schedule
docker ps --filter name=pj_keycloak
```

W `.env.prod` muszą być ustawione istniejące dane bazy planu:

```dotenv
DOMAIN=shogun.pjwstk.edu.pl
SCHEDULE_POSTGRES_DB=pj_schedule
SCHEDULE_POSTGRES_USER=shogun_schedule
SCHEDULE_POSTGRES_PASSWORD=<silne_haslo>
```

Nie zmieniaj tych danych podczas aktualizacji działającej bazy. Nie wykonuj
`down --volumes` — usunęłoby to zapisane plany i komentarze.

## 2. Pobranie kodu

```bash
cd ~/shogun_project
git pull --ff-only
cd deployment
```

## 3. Kontrola konfiguracji Compose

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  config --quiet
```

Polecenie powinno zakończyć się kodem `0` i bez komunikatu o błędzie.

## 4. Build zmienionych komponentów

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  build schedule-api mfe-host mfe-lecturer-schedule
```

Nie ma potrzeby przebudowywania MFE planisty — korzysta ono z tego samego API
i wspólnych komentarzy, ale jego kod nie jest częścią tego deploymentu.

## 5. Uruchomienie bez zatrzymywania pozostałych usług

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps schedule-api mfe-host mfe-lecturer-schedule
```

Schedule API może przez kilka sekund stosować migrację bazy. Sprawdź log:

```bash
docker logs --tail 150 pj_schedule_api
```

Nie kontynuuj, jeśli migracja zakończyła się błędem. W szczególności komunikat
o zduplikowanym kluczu oznacza, że w bazie istnieje więcej niż jeden plan dla
tej samej kombinacji wydziału, roku, semestru i trybu; dane trzeba wtedy
zweryfikować przed ponowieniem migracji.

## 6. Odtworzenie proxy

Po odtworzeniu kontenerów trzeba odtworzyć nginx. Samo `restart proxy` może
zachować stare adresy IP upstreamów i skierować ruch do niewłaściwego MFE.

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps --force-recreate proxy
```

## 7. Weryfikacja techniczna

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  ps schedule-api mfe-host mfe-lecturer-schedule proxy

curl -fsS https://shogun.pjwstk.edu.pl/api-schedule/health
curl -fsS https://shogun.pjwstk.edu.pl/mfe-lecturer-schedule/remoteEntry.json >/dev/null
curl -fsSI https://shogun.pjwstk.edu.pl/plan-zajec
```

Oczekiwany wynik: wszystkie cztery kontenery mają status `Up`, health API
zwraca HTTP `200`, a manifest MFE jest dostępny.

## 8. Weryfikacja funkcjonalna

Otwórz:

```text
https://shogun.pjwstk.edu.pl/plan-zajec
```

Po wdrożeniu wykonaj pełne odświeżenie przeglądarki (`Ctrl+F5`). Sprawdź:

1. Logowanie jako wykładowca oraz dostęp do „Podglądu planu”.
2. Wybór wydziału, roku akademickiego, semestru i trybu studiów.
3. Widoki „Cały plan” i „Mój plan”.
4. Dodanie komentarza do bloczka.
5. Widoczność komentarza w module planisty `/schedule`.
6. Edycję i usunięcie własnego komentarza.
7. Brak możliwości edycji, przesuwania lub publikowania planu z podglądu.

## Pełny deployment całej aplikacji

Standardowy skrypt produkcyjny automatycznie używa
`docker-compose.prod.yml`, dlatego po dodaniu nowej usługi obejmie również
podgląd planu:

```bash
cd ~/shogun_project/deployment
chmod +x deploy.sh
./deploy.sh
```

Skrypt wykonuje `git pull`, zatrzymuje główny stack, buduje obrazy i uruchamia
całą aplikację. Bazy danych i Keycloak są utrzymywane przez oddzielne pliki
Compose i nie są przez ten skrypt usuwane.

## Szybka kolejna aktualizacja podglądu

```bash
cd ~/shogun_project
git pull --ff-only
cd deployment

docker compose -f docker-compose.prod.yml --env-file .env.prod \
  build schedule-api mfe-host mfe-lecturer-schedule

docker compose -f docker-compose.prod.yml --env-file .env.prod \
  up -d --no-deps schedule-api mfe-host mfe-lecturer-schedule

docker compose -f docker-compose.prod.yml --env-file .env.prod \
  up -d --no-deps --force-recreate proxy
```

## Diagnostyka

```bash
docker logs --tail 200 pj_schedule_api
docker logs --tail 200 pj_mfe_lecturer_schedule
docker logs --tail 200 pj_mfe_host
docker logs --tail 200 pj_proxy
```

Jeżeli przeglądarka zgłasza `NG0203`, sprawdź, czy host i nowe MFE zostały
zbudowane z tego samego commita oraz czy proxy zostało odtworzone. Nowe MFE
jest przypięte do Angulara `21.2.12`, zgodnego z hostem produkcyjnym.
