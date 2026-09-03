# Wdrożenie Shogun Email API na produkcję

Instrukcja dotyczy serwera VPS z istniejącym produkcyjnym stosem Shogun. Serwis jest zdefiniowany w `docker-compose.prod.yml` jako `email-api`, działa wyłącznie w sieci Docker `shogun_network` i jest udostępniany przez Nginx pod adresem:

```text
POST https://shogun.pjwstk.edu.pl/api-email/emails
```

## 1. Przygotuj konto Google

Do logowania SMTP używane jest główne prywatne konto Google. Adres `shogun@pjwstk.edu.pl` jest adresem nadawcy (aliasem), a nie loginem SMTP.

1. Zaloguj się na główne konto Google.
2. Włącz weryfikację dwuetapową konta.
3. W ustawieniach bezpieczeństwa Google utwórz hasło aplikacji dla serwisu Shogun.
4. Zapisz wygenerowane hasło aplikacji. Nie zapisuj go w repozytorium ani w dokumentacji.
5. W Gmailu sprawdź, czy `shogun@pjwstk.edu.pl` jest skonfigurowany i zweryfikowany jako adres „Wyślij pocztę jako”.
6. Wyślij z interfejsu Gmaila testową wiadomość z tego aliasu i sprawdź pole `From` u odbiorcy.

Zwykłe hasło do konta Google nie powinno być używane jako `SMTP_PASSWORD`.

## 2. Wygeneruj wewnętrzny klucz API

Na serwerze wygeneruj długi losowy sekret:

```bash
openssl rand -hex 32
```

Zapisz wynik w bezpiecznym miejscu. Ten sam sekret musi później trafić do backendu wywołującego Email API.

Nie umieszczaj tego klucza w kodzie mikrofrontendu ani w plikach JavaScript dostarczanych do przeglądarki. Użytkownik przeglądarki może odczytać każdy sekret zapisany we frontendzie.

## 3. Zaktualizuj repozytorium na VPS

Zmiany zawierające katalog `backend/Shogun.Email` oraz aktualizacje katalogu `deployment` muszą być wcześniej zatwierdzone i wysłane do zdalnego repozytorium.

Na serwerze przejdź do katalogu projektu i pobierz zmiany:

```bash
cd /ścieżka/do/shogun_project
git pull --ff-only
```

Jeżeli projekt jest wdrażany przez `deployment/deploy.sh`, skrypt sam wykona `git pull --ff-only`. Ręczne pobranie zmian pozwala jednak wcześniej uzupełnić i sprawdzić konfigurację.

## 4. Uzupełnij produkcyjny plik środowiskowy

Przejdź do katalogu wdrożenia:

```bash
cd deployment
```

Jeśli `.env.prod` jeszcze nie istnieje, utwórz go na podstawie przykładu:

```bash
cp .env.prod.example .env.prod
chmod 600 .env.prod
```

Jeżeli plik już istnieje, nie zastępuj go. Dopisz lub uzupełnij następujące wartości:

```dotenv
SMTP_USERNAME=adres-glownego-konta@gmail.com
SMTP_PASSWORD=haslo-aplikacji-google
EMAIL_API_KEY=losowy-sekret-wygenerowany-przez-openssl
```

Znaczenie zmiennych:

- `SMTP_USERNAME` — adres głównego prywatnego konta Google, nie alias;
- `SMTP_PASSWORD` — hasło aplikacji Google;
- `EMAIL_API_KEY` — losowy sekret wymagany w nagłówku `X-Internal-Api-Key`.

Ten sam `EMAIL_API_KEY` jest automatycznie przekazywany przez Compose do Schedule API. Dzięki temu powiadomienia o oznaczeniach są wysyłane serwer–serwer, bez ujawniania sekretu w mikrofrontendzie.

Adres nadawcy `shogun@pjwstk.edu.pl`, nazwa `Shogun`, host `smtp.gmail.com`, port `587` i trzy próby wysyłki są już ustawione w `docker-compose.prod.yml`.

Sprawdź, czy zmienne występują dokładnie raz, bez spacji wokół znaku `=`:

```bash
grep -nE '^(SMTP_USERNAME|SMTP_PASSWORD|EMAIL_API_KEY)=' .env.prod
```

Polecenie pokaże również sekrety, dlatego wykonuj je wyłącznie w prywatnej sesji terminala i nie kopiuj jego wyniku do logów lub zgłoszeń.

## 5. Sprawdź konfigurację Compose

Sprawdź rozwiniętą konfigurację bez uruchamiania kontenerów:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  config --quiet
```

Brak komunikatu i kod zakończenia `0` oznaczają poprawną składnię. Błąd o wymaganej zmiennej oznacza, że jedna z wartości w `.env.prod` nie została ustawiona.

Nie zapisuj wyniku pełnego `docker compose config` do logów — rozwinięta konfiguracja zawiera hasło SMTP i klucz API.

## 6. Wdróż cały produkcyjny stos

Zalecana metoda korzysta z istniejącego skryptu wdrożeniowego:

```bash
chmod +x deploy.sh
./deploy.sh
```

Skrypt:

1. sprawdzi `.env.prod` i certyfikaty TLS;
2. pobierze aktualny kod;
3. zatrzyma główny stos aplikacji;
4. przebuduje obrazy;
5. uruchomi kontenery i wyświetli ich status.

Opcji `--no-build` nie należy używać przy pierwszym wdrożeniu Email API ani po zmianie jego kodu.

### Wdrożenie tylko Email API

Jeżeli pełne zatrzymanie stosu nie jest pożądane, można zbudować i uruchomić wyłącznie nowy serwis, a następnie odtworzyć proxy z aktualną konfiguracją:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --build --no-deps email-api

docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --no-deps --force-recreate proxy
```

## 7. Sprawdź stan kontenera

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  ps email-api proxy
```

Oba kontenery powinny mieć stan `Up`.

Sprawdź ostatnie logi Email API:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  logs --tail=100 email-api
```

Serwis nie loguje treści wiadomości ani nazw i adresów odbiorców. Loguje jedynie liczbę sukcesów, liczbę błędów i techniczny typ błędu.

## 8. Sprawdź endpoint zdrowia wewnątrz sieci Docker

Endpoint `/health` nie jest publicznie wystawiony przez Nginx. Można go sprawdzić tymczasowym kontenerem w sieci produkcyjnej:

```bash
docker run --rm \
  --network shogun_network \
  curlimages/curl:8.12.1 \
  --fail --silent --show-error \
  http://pj_email_api:8080/health
```

Oczekiwany wynik:

```text
Healthy
```

Ten test sprawdza działanie procesu API, ale celowo nie loguje się do Gmaila i nie wysyła wiadomości.

## 9. Wykonaj kontrolowaną wysyłkę testową

Wczytaj klucz z `.env.prod` bez wypisywania go na ekran:

```bash
set -a
source ./.env.prod
set +a
```

Wyślij jedną wiadomość na własny adres testowy:

```bash
curl --fail-with-body \
  -X POST 'https://shogun.pjwstk.edu.pl/api-email/emails' \
  -H 'Content-Type: application/json' \
  -H "X-Internal-Api-Key: ${EMAIL_API_KEY}" \
  --data '{
    "subject": "Test Shogun Email API",
    "heading": "Wiadomość testowa",
    "message": "To jest test produkcyjnego serwisu wysyłki wiadomości.",
    "comments": ["Po potwierdzeniu odbioru test można uznać za zakończony."],
    "link": "https://shogun.pjwstk.edu.pl",
    "linkText": "Otwórz Shogun",
    "recipients": [
      {
        "name": "Administrator Shogun",
        "email": "TU_WPISZ_WLASNY_ADRES_TESTOWY"
      }
    ]
  }'
```

Oczekiwana odpowiedź HTTP `200`:

```json
{"sent":1,"failed":0}
```

Po teście sprawdź:

1. czy wiadomość dotarła, również w folderze spam;
2. czy nadawcą jest `Shogun <shogun@pjwstk.edu.pl>`;
3. czy treść HTML, komentarz i przycisk są poprawnie wyświetlane;
4. czy odpowiedź na wiadomość nie jest elementem oczekiwanego procesu biznesowego.

Następnie sprawdź integrację z planem zajęć: dodaj komentarz lub notatkę, wpisz `@`, wybierz użytkownika posiadającego adres e-mail i zapisz. Przy edycji powiadomienie otrzymają wyłącznie nowo oznaczone osoby. Błąd wysyłki nie wycofuje zapisanego komentarza lub notatki; szczegóły techniczne pojawią się w logach `schedule-api` i `email-api`.

Usuń zmienne zaimportowane do bieżącej powłoki:

```bash
unset SMTP_USERNAME SMTP_PASSWORD EMAIL_API_KEY
```

## 10. Interpretacja odpowiedzi API

- `200 OK` — wysłano wszystkie wiadomości;
- `400 Bad Request` — kontrakt lub limity danych są nieprawidłowe;
- `401 Unauthorized` — brak lub niepoprawny `X-Internal-Api-Key`;
- `413 Payload Too Large` — żądanie przekracza 1 MB;
- `502 Bad Gateway` — co najmniej jedna wiadomość nie została wysłana po trzech próbach.

Przykład częściowego błędu:

```json
{"sent":2,"failed":1}
```

Każdy odbiorca otrzymuje osobną wiadomość, więc adresy innych odbiorców nie są ujawniane.

## 11. Najczęstsze problemy

### Błąd uwierzytelnienia SMTP

Sprawdź, czy:

- włączono weryfikację dwuetapową;
- `SMTP_PASSWORD` jest hasłem aplikacji, a nie hasłem konta;
- `SMTP_USERNAME` wskazuje główne konto Google;
- hasło aplikacji nie zostało cofnięte lub unieważnione.

Po zmianie `.env.prod` odtwórz kontener:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate email-api
```

### Wiadomość przychodzi z niewłaściwego adresu

Sprawdź konfigurację „Wyślij pocztę jako” w Gmailu. Alias `shogun@pjwstk.edu.pl` musi być zweryfikowany dla konta podanego jako `SMTP_USERNAME`.

### Odpowiedź `401`

Porównaj wartość nagłówka `X-Internal-Api-Key` z `EMAIL_API_KEY` w `.env.prod`, a następnie odtwórz kontener po każdej zmianie sekretu.

### Odpowiedź `502`

Sprawdź logi:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=200 email-api
```

Serwis podejmuje trzy próby z rosnącym opóźnieniem. Typowe przyczyny to błędne dane SMTP, brak zweryfikowanego aliasu, blokada konta Google albo problem z połączeniem VPS do `smtp.gmail.com:587`.

## 12. Aktualizacja serwisu

Po kolejnych zmianach kodu:

```bash
cd /ścieżka/do/shogun_project
git pull --ff-only
cd deployment
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --no-deps email-api
```

Zmiana wyłącznie `nginx.prod.conf` wymaga odtworzenia kontenera proxy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate proxy
```

## 13. Rotacja sekretów

W przypadku podejrzenia ujawnienia sekretu:

1. unieważnij stare hasło aplikacji w koncie Google;
2. utwórz nowe hasło aplikacji;
3. wygeneruj nowy `EMAIL_API_KEY`;
4. zmień wartości w `.env.prod`;
5. zaktualizuj klucz po stronie uprawnionego backendu;
6. odtwórz kontener `email-api`;
7. wykonaj kontrolowaną wysyłkę testową.

Plik `.env.prod` nie może zostać zatwierdzony w Git. Repozytorium ignoruje ten plik; wersjonowany jest wyłącznie `.env.prod.example` bez prawdziwych sekretów.
