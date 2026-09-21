# Wdrożenie generowania PDF sylabusów na produkcję

Instrukcja opisuje selektywne wdrożenie usługi `Shogun.SyllabusPdf.Api` oraz
mikrofrontendu sylabusów. Operacja nie wymaga migracji ani restartu baz danych.

Polecenia należy wykonywać na serwerze produkcyjnym z katalogu repozytorium.
W przykładach repozytorium znajduje się w `~/shogun_project`.

## 1. Zakres wdrożenia

Wdrożenie obejmuje:

- kontener `pj_syllabus_pdf` (`syllabus-pdf`),
- kontener `pj_mfe_syllabi` (`mfe-syllabi`),
- trasę nginx `/api-syllabus-pdf/`,
- odtworzenie kontenera `pj_proxy` w celu wczytania konfiguracji nginx.

Przepływ po wdrożeniu wygląda następująco:

```text
przeglądarka
  -> zapis JSON: /api/v1/syllabi
  -> generowanie: /api-syllabus-pdf/api/v1/syllabi/pdf
  -> pj_syllabus_pdf:8080/api/v1/syllabi/pdf
```

PDF jest generowany dopiero po udanym zapisie sylabusa w bazie MongoDB.

## 2. Wymagania

Przed rozpoczęciem sprawdź, czy:

- Docker oraz Docker Compose działają na serwerze,
- istnieje zewnętrzna sieć `shogun_network`,
- plik `deployment/.env.prod` jest obecny i zawiera dotychczasową konfigurację,
- certyfikaty TLS znajdują się w `deployment/certs/`,
- zmiany zostały zatwierdzone i wysłane do zdalnego repozytorium,
- na dysku jest co najmniej kilka GB wolnego miejsca na budowę obrazu z TeX Live.

Obraz generatora jest większy od typowego obrazu ASP.NET, ponieważ zawiera
PowerShell oraz pakiety LaTeX potrzebne do utworzenia dokumentu.

## 3. Wymagane elementy konfiguracji

Przed wdrożeniem commit powinien zawierać poniższe elementy.

### Usługa w `docker-compose.prod.yml`

Plik `deployment/docker-compose.prod.yml` musi zawierać usługę
`syllabus-pdf`, budowaną z:

```yaml
syllabus-pdf:
  build:
    context: ../backend/Shogun.SyllabusPdf
    dockerfile: Shogun.SyllabusPdf.Api/Dockerfile
  container_name: pj_syllabus_pdf
  restart: unless-stopped
  environment:
    ASPNETCORE_ENVIRONMENT: Production
    ASPNETCORE_URLS: http://+:8080
    GENERATOR__TIMEOUTSECONDS: 60
    GENERATOR__MAXCONCURRENCY: 2
  tmpfs:
    - /tmp:size=512m
  networks:
    - shogun
```

W `proxy.depends_on` powinna znajdować się pozycja:

```yaml
- syllabus-pdf
```

### Trasa w `nginx.prod.conf`

Plik `deployment/nginx.prod.conf` musi zawierać w serwerze HTTPS:

```nginx
location /api-syllabus-pdf/ {
    proxy_pass         http://pj_syllabus_pdf:8080/;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;
    client_max_body_size 2m;
}
```

Nie należy kierować generatora przez istniejącą lokalizację `/api/`, ponieważ
jest ona przeznaczona dla `pj_syllabi_api`.

## 4. Pobranie zmian i kontrola konfiguracji

```bash
cd ~/shogun_project
git status --short
git pull --ff-only
cd deployment
```

Repozytorium na serwerze powinno być czyste przed `git pull`. Następnie sprawdź
konfigurację Compose bez uruchamiania usług:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  config --quiet
```

Sprawdź obecność usługi i trasy:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  config --services | grep -Fx syllabus-pdf

grep -n "api-syllabus-pdf" nginx.prod.conf
```

Jeżeli któreś polecenie niczego nie zwróci, nie kontynuuj wdrożenia — najpierw
uzupełnij konfigurację w repozytorium.

## 5. Selektywne wdrożenie

Ta procedura przebudowuje wyłącznie generator PDF i mikrofrontend sylabusów.
Pozostałe API, bazy danych oraz Keycloak nie są restartowane.

### 5.1. Budowa obrazów

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  build syllabus-pdf mfe-syllabi
```

Pierwsza budowa `syllabus-pdf` może trwać dłużej z powodu instalacji TeX Live.
Budowa musi zakończyć się kodem `0`.

### 5.2. Uruchomienie generatora i mikrofrontendu

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps --force-recreate syllabus-pdf mfe-syllabi
```

### 5.3. Walidacja i odtworzenie proxy

Najpierw zweryfikuj składnię konfiguracji nginx w jednorazowym kontenerze:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  run --rm --no-deps proxy nginx -t
```

Po poprawnej walidacji odtwórz proxy. Sam `restart` może nie wystarczyć, jeśli
zmieniła się konfiguracja lub definicja Compose.

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps --force-recreate proxy
```

## 6. Weryfikacja wdrożenia

### Status kontenerów

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  ps syllabus-pdf mfe-syllabi proxy
```

Oczekiwany stan:

- `pj_syllabus_pdf` — `Up` i po chwili `healthy`,
- `pj_mfe_syllabi` — `Up`,
- `pj_proxy` — `Up`.

### Health-check przez publiczne proxy

```bash
DOMAIN=$(grep '^DOMAIN=' .env.prod | cut -d= -f2-)
test -n "$DOMAIN"

curl --fail --silent --show-error \
  "https://${DOMAIN}/api-syllabus-pdf/health/ready"
```

Oczekiwana odpowiedź to `Healthy` i kod HTTP `200`.

### Test wygenerowania PDF

Do testu można użyć istniejącego przykładowego sylabusa:

```bash
curl --fail --silent --show-error \
  -H "Content-Type: application/json" \
  --data-binary @../frontend/public/assets/syllabusy/ASD.json \
  "https://${DOMAIN}/api-syllabus-pdf/api/v1/syllabi/pdf" \
  --output /tmp/ASD.pdf

file /tmp/ASD.pdf
test -s /tmp/ASD.pdf
```

Plik powinien zostać rozpoznany jako dokument PDF i mieć niezerowy rozmiar.
Po teście można go usunąć:

```bash
rm -f /tmp/ASD.pdf
```

### Test w interfejsie

1. Zaloguj się do aplikacji.
2. Otwórz dodawanie nowego sylabusa.
3. Sprawdź obecność przycisku **Zapisz i pobierz PDF**.
4. Otwórz edycję istniejącego sylabusa i sprawdź ten sam przycisk.
5. Zapisz testową zmianę i sprawdź, czy przeglądarka pobiera plik PDF.
6. Potwierdź w bazie/API, że dane sylabusa zostały zapisane przed pobraniem.

Po wdrożeniu zalecane jest jednorazowe twarde odświeżenie (`Ctrl+F5`) otwartej
wcześniej aplikacji. Manifest `remoteEntry.json` ma wyłączone cache, ale karta
otwarta przed wdrożeniem może nadal przechowywać poprzedni graf modułów.

## 7. Diagnostyka

```bash
docker logs --tail 200 pj_syllabus_pdf
docker logs --tail 200 pj_mfe_syllabi
docker logs --tail 200 pj_proxy
```

Typowe problemy:

- `404` dla `/api-syllabus-pdf/...` — proxy nie zostało odtworzone albo brakuje
  lokalizacji w `nginx.prod.conf`;
- `host not found in upstream "pj_syllabus_pdf"` — generator nie działa lub nie
  jest podłączony do `shogun_network`;
- HTTP `422` — wejściowy JSON jest poprawny składniowo, ale generator LaTeX nie
  może utworzyć dokumentu; szczegóły znajdują się w logu generatora;
- HTTP `503` — przekroczono limit czasu generatora;
- zawieszanie wejścia w ekran po wdrożeniu — sprawdź `404` starych chunków w
  logu `pj_mfe_syllabi` i wykonaj `Ctrl+F5`;
- brak miejsca podczas budowy — sprawdź `df -h` i `docker system df`. Nie usuwaj
  obrazów ani wolumenów bez upewnienia się, że nie są potrzebne do rollbacku.

## 8. Pełne wdrożenie alternatywne

Jeśli planowane jest jednoczesne wdrożenie wszystkich zmian aplikacji:

```bash
cd ~/shogun_project/deployment
chmod +x deploy.sh
./deploy.sh
```

Pełne wdrożenie trwa dłużej i odtwarza cały główny stack aplikacji. Nie dotyka
oddzielnie uruchomionych baz danych ani Keycloak.

## 9. Wycofanie

Zmiana nie zawiera migracji bazy danych. Rollback polega na przywróceniu
poprzedniego commita/wersji kodu i przebudowaniu tych samych usług:

```bash
cd ~/shogun_project
git checkout <poprzedni-poprawny-tag-lub-commit>
cd deployment

docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  build syllabus-pdf mfe-syllabi

docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps --force-recreate syllabus-pdf mfe-syllabi proxy
```

Jeżeli poprzednia wersja nie zawierała usługi `syllabus-pdf`, zatrzymaj i usuń
wyłącznie jej kontener po przełączeniu kodu:

```bash
docker stop pj_syllabus_pdf
docker rm pj_syllabus_pdf
```

Nie używaj `docker compose down -v`: opcja `-v` może usunąć dane innych usług.
