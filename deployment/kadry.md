# Kadry — wdrożenie produkcyjne

Instrukcja dotyczy wdrożenia modułu Kadry wraz z eksportem plików XLSX na środowisko produkcyjne.

## Zakres wdrożenia

| Element | Usługa Compose | Kontener | Rola |
| --- | --- | --- | --- |
| Backend Kadry | `schedule-api` | `pj_schedule_api` | Dane Kadry, filtry, obciążenia i przydziały prowadzących |
| Eksport Kadry | `export-api` | `pj_export_api` | Generowanie programu studiów i listy prowadzących XLSX |
| Frontend Kadry | `mfe-faculty` | `pj_mfe_faculty` | Interfejs modułu Kadry |
| Routing | `proxy` | `pj_proxy` | HTTPS oraz trasy `/api-schedule/` i `/api-export/` |

Eksport korzysta dodatkowo z Keycloak, bazy PostgreSQL Kadry, `syllabi-api` (`pj_syllabi_api`) oraz sieci Docker `shogun_network`.

Frontend nie przekazuje do eksportu gotowych wierszy ani obliczonych godzin. Zakres eksportu jest przekazywany do `export-api`, który pobiera aktualne dane z API źródłowych.

## Wymagania wstępne

Na serwerze produkcyjnym muszą być dostępne:

- Docker z Docker Compose v2,
- repozytorium projektu z katalogiem `deployment`,
- plik `deployment/.env.prod`,
- certyfikaty `deployment/certs/fullchain.pem` i `deployment/certs/privkey.pem`,
- uruchomione zależności: Keycloak, PostgreSQL Kadry, `syllabi-api`, Users API oraz pozostałe usługi wymagane przez główny Compose,
- zewnętrzna sieć Docker `shogun_network`.

Konto użytkownika musi mieć rolę `admin` albo `dezyderaty`. Eksport nie wymaga dodatkowych uprawnień do edycji planów ani sylabusów.

Nie należy publikować portów wewnętrznych API Kadry ani eksportu do Internetu. Publiczny dostęp powinien prowadzić wyłącznie przez HTTPS i kontener `proxy`.

## Konfiguracja produkcyjna

Przejdź do katalogu deploymentu:

```bash
cd /ścieżka/do/shogun_project/deployment
```

Sprawdź wymagane pliki:

```bash
test -f .env.prod
test -f certs/fullchain.pem
test -f certs/privkey.pem
```

W `.env.prod` ustaw co najmniej `DOMAIN`, dane baz PostgreSQL, dane i sekrety Keycloak, `USERS_SERVICE_CLIENT_SECRET`, `EMAIL_API_KEY` oraz pozostałe dane SMTP wymagane przez istniejące wdrożenie.

`docker-compose.prod.yml` ustawia wewnętrzne adresy usług eksportu:

```text
SCHEDULEAPIBASEURL=http://pj_schedule_api:8080/
PROGRAMDATAAPIBASEURL=http://pj_syllabi_api:8080/
```

Jeżeli zmieni się nazwa kontenera albo sieć Docker, trzeba zaktualizować te adresy oraz konfigurację nginx.

Przed wdrożeniem sprawdź wynikową konfigurację Compose. Nie wyświetlaj jej bezpośrednio w terminalu, ponieważ zawiera sekrety z `.env.prod`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod config > /tmp/shogun-compose.prod.yml
```

W konfiguracji nginx muszą istnieć trasy `/api-schedule/` do `pj_schedule_api:8080` oraz `/api-export/` do `pj_export_api:8080`.

## Pierwsze wdrożenie lub pełne wdrożenie

Najprostsza metoda używa skryptu wdrożeniowego:

```bash
cd /ścieżka/do/shogun_project/deployment
./deploy.sh
```

Skrypt wykonuje aktualizację kodu, zatrzymuje poprzedni zestaw kontenerów, buduje obrazy i uruchamia środowisko. Przed użyciem sprawdź, czy lokalne zmiany na serwerze są zapisane lub odłożone.

Jeżeli kod został już pobrany, a chcesz pominąć `git pull`, użyj bezpośrednio Compose:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Przy problemie z kolejnością startu proxy można uruchomić najpierw usługi Kadry, a następnie proxy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build schedule-api export-api mfe-faculty
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d proxy
```

## Aktualizacja tylko Kadry

Po wdrożeniu zmian dotyczących Kadry, eksportu lub frontendu nie trzeba przebudowywać wszystkich usług:

```bash
cd /ścieżka/do/shogun_project/deployment

docker compose -f docker-compose.prod.yml --env-file .env.prod build schedule-api export-api mfe-faculty
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps schedule-api export-api mfe-faculty
docker compose -f docker-compose.prod.yml --env-file .env.prod restart proxy
```

`--no-deps` chroni działające bazy, Keycloak i pozostałe usługi przed niepotrzebnym restartem. Restart proxy jest potrzebny po zmianie konfiguracji nginx albo gdy proxy wystartowało przed `export-api`.

## Weryfikacja po wdrożeniu

Sprawdź stan kontenerów:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps schedule-api export-api mfe-faculty proxy
```

Sprawdź logi usług Kadry:

```bash
docker logs --tail=100 pj_schedule_api
docker logs --tail=100 pj_export_api
docker logs --tail=100 pj_mfe_faculty
docker logs --tail=100 pj_proxy
```

Sprawdź dostępność przez publiczną domenę:

```bash
curl -fsS https://DOMENA/api-schedule/health
curl -fsS https://DOMENA/api-export/health
curl -fsSI https://DOMENA/
```

Jeżeli endpoint health nie jest wystawiony w danej wersji API, brak odpowiedzi `200` należy zweryfikować w logach i przez test zalogowanego użytkownika, a nie traktować automatycznie jako awarię usługi.

## Test funkcjonalny Kadry

Po zalogowaniu na konto z rolą `admin` lub `dezyderaty`:

1. Otwórz moduł Kadry.
2. Wybierz rok akademicki i kierunek.
3. Sprawdź dane dla trybu stacjonarnego.
4. Otwórz okno `Eksportuj` i sprawdź, czy przejęty rok oraz kierunek są prawidłowe.
5. Pobierz `Program studiów` oraz `Listę prowadzących ze stopniami i tytułami naukowymi`.
6. Otwórz oba pliki XLSX i sprawdź polskie znaki, nagłówki, obramowania, żółte dynamiczne kolumny, scalenia oraz dane dla wielu prowadzących.
7. Powtórz test dla trybu niestacjonarnego, jeżeli są dla niego dane.

Żądania eksportu powinny mieć postać:

```text
GET /api-export/api/v1/exports/study-program?academicYear=2026%2F2027&facultyCode=WI&studyMode=stationary
GET /api-export/api/v1/exports/lecturers?academicYear=2026%2F2027&facultyCode=WI&studyMode=stationary
```

W odpowiedzi powinien pojawić się plik XLSX oraz nagłówek `Content-Disposition` z nazwą zawierającą typ eksportu, kierunek, rok i tryb.

Sprawdź także, że użytkownik bez wymaganej roli otrzymuje `403`, niezalogowany użytkownik `401`, brak danych daje czytelny komunikat zamiast pustego pliku, a awaria API źródłowego jest widoczna jako błąd eksportu.

## Diagnostyka

### `502 Bad Gateway` albo `host not found`

Sprawdź, czy kontener istnieje i jest w tej samej sieci:

```bash
docker ps --filter name=pj_export_api
docker network inspect shogun_network
```

Jeżeli proxy uruchomiło się przed `export-api`, uruchom `export-api`, a następnie zrestartuj proxy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d export-api
docker compose -f docker-compose.prod.yml --env-file .env.prod restart proxy
```

### `401` albo `403`

Sprawdź rolę użytkownika w Keycloak, zgodność issuerów w `KEYCLOAK__VALIDISSUERS__0` z publiczną domeną, dostęp API źródłowych do przekazanego tokenu oraz logi `pj_schedule_api` i `pj_export_api`.

### `500` przy generowaniu XLSX

```bash
docker logs --tail=200 pj_export_api
```

Sprawdź, czy działają `pj_schedule_api` i `pj_syllabi_api`, oraz czy zakres roku, kierunku i trybu zawiera dane. Brak jednoznacznego sylabusa powinien pozostawić dane programowe do ręcznej weryfikacji; nie jest tym samym co awaria API.

### Nieprawidłowe kolumny lub format XLSX

Sprawdź, czy obraz `export-api` został zbudowany z aktualnego repozytorium i zawiera aktualne szablony:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache export-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps export-api
```

## Wycofanie wdrożenia

Wycofanie wykonuj do znanego, wcześniej działającego commita lub obrazu. Przed zmianą zachowaj logi:

```bash
docker logs pj_schedule_api > /tmp/pj_schedule_api-before-rollback.log
docker logs pj_export_api > /tmp/pj_export_api-before-rollback.log
```

Po przełączeniu repozytorium na poprzednią wersję uruchom ponownie tylko zmienione usługi:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build schedule-api export-api mfe-faculty
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps schedule-api export-api mfe-faculty
docker compose -f docker-compose.prod.yml --env-file .env.prod restart proxy
```

Nie usuwaj baz danych ani wolumenów podczas rollbacku. Kod Kadry i eksportu nie powinien wymagać osobnej bazy eksportowej.

## Lista kontrolna operatora

- [ ] `.env.prod` i certyfikaty są obecne i nie są śledzone w Git.
- [ ] Keycloak, PostgreSQL Kadry i `syllabi-api` działają.
- [ ] `shogun_network` istnieje.
- [ ] `schedule-api`, `export-api`, `mfe-faculty` i `proxy` mają stan `running`.
- [ ] HTTPS oraz trasy `/api-schedule/` i `/api-export/` odpowiadają.
- [ ] Konto testowe ma rolę `admin` albo `dezyderaty`.
- [ ] Pobrano i otwarto oba pliki XLSX.
- [ ] Sprawdzono dynamiczne kolumny, żółte nagłówki, obramowania i scalenia.
- [ ] Sprawdzono logi po teście i nie ma błędów źródeł.

