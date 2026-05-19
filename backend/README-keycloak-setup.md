# Konfiguracja Keycloak + Google OAuth

## Wymagania wstępne

1. Wpis w pliku hosts (`C:\Windows\System32\drivers\etc\hosts` / `/etc/hosts`):
   ```
   127.0.0.1  shogun.pjwstk.edu.pl
   ```
2. Bazy danych na lokalnym serwerze MariaDB:
   ```sql
   CREATE DATABASE shogun_users   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE pj_assignments CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Certyfikat TLS (mkcert) — wymagany dla PKCE / Web Crypto API (Keycloak 26):
   ```powershell
   winget install FiloSottile.mkcert   # jednorazowa instalacja
   # uruchom nowy terminal, następnie:
   mkcert -install                      # dodaj lokalny CA do zaufanych przeglądarek
   cd backend/proxy/certs
   mkcert shogun.pjwstk.edu.pl         # generuje .pem i -key.pem
   ```
4. Uruchomiony stack Docker:
   ```bash
   cd backend
   docker compose --env-file .env up -d
   ```

Keycloak Admin Console dostępna pod:
- **https://shogun.pjwstk.edu.pl:8443/auth/admin** (przez nginx HTTPS)
- **http://localhost:8180/auth/admin** (bezpośrednio, do diagnostyki)

---

## Krok 1 – Konfiguracja Google Cloud (OAuth Client)

1. Wejdź na https://console.cloud.google.com/
2. Utwórz nowy projekt lub użyj istniejącego.
3. Przejdź do **APIs & Services → Credentials**.
4. Kliknij **Create Credentials → OAuth 2.0 Client ID**.
5. Typ aplikacji: **Web application**.
6. Dodaj **Authorized JavaScript origins:**
   ```
   https://shogun.pjwstk.edu.pl:8443
   ```
7. Dodaj **Authorized redirect URIs:**
   ```
   https://shogun.pjwstk.edu.pl:8443/auth/realms/shogun/broker/google/endpoint
   ```
8. Zapisz – skopiuj **Client ID** i **Client Secret**.

---

## Krok 2 – Utworzenie Realm w Keycloak

1. Otwórz **https://shogun.pjwstk.edu.pl:8443/auth/admin**
2. Zaloguj się: login i hasło z `backend/.env` (`KC_ADMIN_USER` / `KC_ADMIN_PASS`).
3. Kliknij dropdown **master** (górny lewy róg) → **Create realm**.
4. **Realm name:** `shogun`
5. Kliknij **Create**.

---

## Krok 3 – Dodanie Google jako Identity Provider

1. W realm `shogun` → **Identity Providers → Add provider → Google**.
2. Wypełnij:
   - **Client ID:** (z Kroku 1)
   - **Client Secret:** (z Kroku 1)
3. W sekcji **Advanced settings:**
   - **Scopes:** `openid email profile`
4. Zapisz.

### Mapowanie imienia, nazwiska i e-mail

Keycloak domyślnie mapuje profil Google automatycznie. Sprawdź w zakładce **Mappers**, że istnieją:

| Name | Mapper Type | Claim | User Attribute |
|---|---|---|---|
| `first name` | Attribute Importer | `given_name` | `firstName` |
| `last name` | Attribute Importer | `family_name` | `lastName` |
| `email` | Attribute Importer | `email` | `email` |

Jeśli brakuje – kliknij **Add mapper** i utwórz powyższe.

---

## Krok 4 – Ograniczenie do domeny uczelni

### Metoda A: Hosted Domain (najprostsza, jedna domena)

W konfiguracji Google Identity Provider (realm `shogun` → Identity Providers → Google → Settings):
- Wyszukaj pole **Hosted Domain** (lub **Extra config → hostedDomain**)
- Wpisz: `pjwstk.edu.pl`

Google odrzuci logowanie z innych domen przed przekierowaniem do Keycloak. Dla dwóch domen jednocześnie użyj Metody B.

### Metoda B: Authentication Flow z walidacją (dwie domeny)

1. Przejdź do **Authentication → Flows**.
2. Przy flow `first broker login` kliknij **⋮ → Duplicate** → nazwa np. `shogun-broker-login`.
3. Do zduplikowanego flow dodaj krok **Condition - User Attribute** lub **Script Authenticator**.
4. Ustaw ten flow jako **First Login Flow** w konfiguracji Identity Provider Google.

Przykładowy skrypt walidacji domeny (Keycloak Script Authenticator):
```javascript
var email = user.getEmail();
var allowed = ['pjwstk.edu.pl', 'pjatk.edu.pl'];
var domain  = email ? email.split('@')[1] : '';
if (!allowed.includes(domain)) {
    context.failure(AuthenticationFlowError.ACCESS_DENIED,
        javax.ws.rs.core.Response.status(403).entity('Brak dostępu: niedozwolona domena.').build());
} else {
    context.success();
}
```

---

## Krok 5 – Utworzenie klienta Angular (shogun-web)

1. W realm `shogun` → **Clients → Create client**.
2. **Client ID:** `shogun-web`
3. **Client type:** OpenID Connect → **Next**
4. Włącz **Standard flow** → **Next**
5. Ustaw:
   - **Valid redirect URIs:** `https://shogun.pjwstk.edu.pl:8443/*`
   - **Web origins:** `https://shogun.pjwstk.edu.pl:8443`
6. **Save**.

### Wymuszenie zgody użytkownika (Consent)

1. W ustawieniach klienta `shogun-web` → zakładka **Login**.
2. Włącz **Consent required**: **ON**.
3. W zakładce **Client scopes** upewnij się, że scope `profile` i `email` mają ustawione **Display On Consent Screen: ON** (ustawienia poszczególnych scope-ów w menu **Client Scopes**).

---

## Krok 6 – Weryfikacja

1. Otwórz **https://shogun.pjwstk.edu.pl:8443** – aplikacja powinna natychmiast przekierować do Keycloak.
2. Kliknij **Sign in with Google**.
3. Zaloguj się kontem `@pjwstk.edu.pl` lub `@pjatk.edu.pl`.
4. Wyraź zgodę na udostępnienie imienia, nazwiska i e-maila.
5. Po zalogowaniu dane użytkownika (imię, nazwisko, e-mail) są widoczne w dolnej części sidebara.

---

## Zmienne środowiskowe (backend/.env)

| Zmienna | Domyślna | Opis |
|---|---|---|
| `KC_DB_USER` | `root` | Użytkownik bazy MariaDB dla Keycloak |
| `KC_DB_PASS` | `password` | Hasło bazy MariaDB dla Keycloak |
| `KC_ADMIN_USER` | `admin` | Login admina Keycloak |
| `KC_ADMIN_PASS` | `admin_pass` | Hasło admina Keycloak |

---

## Zmiana dozwolonej domeny

Domena jest konfigurowana wyłącznie w Keycloak – bez zmian w kodzie aplikacji:
- **Metoda A:** zmień wartość pola `hostedDomain` w konfiguracji Identity Provider Google.
- **Metoda B:** zmień tablicę `allowed` w skrypcie Authentication Flow.

---

## Deployment na innej domenie

Przy zmianie domeny zaktualizuj:

1. `backend/proxy/nginx.conf` → `server_name` i URL przekierowania HTTP→HTTPS
2. `backend/docker-compose.yml` → `KEYCLOAK__VALIDISSUERS__0` (oba serwisy API)
3. `backend/proxy/certs/` → wygeneruj nowy certyfikat: `mkcert <nowa-domena>`
4. Keycloak Admin → klient `shogun-web`: **Valid redirect URIs** i **Web origins**
5. Google Cloud Console → **Authorized redirect URIs** i **Authorized JavaScript origins**
