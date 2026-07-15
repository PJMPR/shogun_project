# Deployment-Local - srodowisko deweloperskie Shogun

Folder zawiera skrypty i konfiguracje do uruchomienia pelnego stosu aplikacji Shogun lokalnie na Windows z Docker Desktop.

## Wymagania wstepne

| Narzedzie | Wersja | Instalacja |
|---|---|---|
| Docker Desktop | 4.x+ | https://www.docker.com/products/docker-desktop/ |
| Terraform | 1.x+ | https://developer.hashicorp.com/terraform/install |
| winget | — | wbudowany w Windows 10/11 |

mkcert zostanie zainstalowany automatycznie przez `setup-local.ps1`.

---

## Pierwsze uruchomienie

### Jeden krok (automatyczny setup)

Uruchom terminal **jako Administrator** w folderze `deployment-local`:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-local.ps1
```

Skrypt wykona kolejno:
1. Zainstaluje mkcert i wygeneruje certyfikat TLS dla `shogun.pjwstk.edu.pl`
2. Doda wpis `127.0.0.1 shogun.pjwstk.edu.pl` do `C:\Windows\System32\drivers\etc\hosts`
3. Skopiuje `.env.local.example` → `.env.local`
4. Uruchomi bazy danych i Keycloak
5. Przeprowadzi przez konfiguracje Terraform (realm Keycloak)
6. Uruchomi glowny stack aplikacji

### Po zakonczeniu

| Serwis | Adres |
|---|---|
| Aplikacja | https://shogun.pjwstk.edu.pl:8443 |
| Keycloak Admin | http://localhost:8180/auth/admin |
| MariaDB | localhost:3306 |
| MongoDB | localhost:27017 |

---

## Opis plikow

| Plik | Opis |
|---|---|
| `setup-local.ps1` | Jednorazowy setup -- pierwsze uruchomienie |
| `start.ps1` | Uruchamia wszystkie serwisy (kolejne uruchomienia) |
| `stop.ps1` | Zatrzymuje wszystkie serwisy |
| `rebuild.ps1` | Przebudowuje wybrany serwis bez restartowania calego stosu |
| `docker-compose.databases.yml` | Bazy danych: MariaDB (3306) + MongoDB (27017) |
| `docker-compose.keycloak.yml` | Keycloak (8180) |
| `docker-compose.yml` | API, mikrofrontendy, pliki statyczne, nginx proxy (8080/8443) |
| `nginx.local.conf` | Konfiguracja nginx z TLS na porcie 8443 |
| `.env.local.example` | Szablon zmiennych srodowiskowych |
| `certs/` | Certyfikaty TLS (generowane przez setup-local.ps1, nie commitowane) |

---

## Codzienne uzycie

### Uruchomienie (po restarcie PC)

```powershell
cd deployment-local
.\start.ps1
```

Bez przebudowania obrazow (szybszy restart):

```powershell
.\start.ps1 -NoBuild
```

### Zatrzymanie

```powershell
.\stop.ps1
```

Zatrzymanie z usunieciem wszystkich danych (UWAGA: nieodwracalne):

```powershell
.\stop.ps1 -RemoveData
```

### Przebudowanie pojedynczego serwisu

Po zmianach kodu backendu lub frontendu nie musisz restartowac calego stosu:

```powershell
.\rebuild.ps1 api                   # Syllabi API
.\rebuild.ps1 assignments-api       # Assignments API
.\rebuild.ps1 users-api             # Users API
.\rebuild.ps1 mfe-host              # host Angular
.\rebuild.ps1 mfe-program           # MFE program
.\rebuild.ps1 mfe-syllabi           # MFE syllabi
.\rebuild.ps1 mfe-assignements      # MFE assignements
.\rebuild.ps1 mfe-users             # MFE users
.\rebuild.ps1 mfe-lecturers-assignments
.\rebuild.ps1 proxy                 # przeladuj nginx (bez rebuild)
.\rebuild.ps1 all                   # przebuduj wszystko
```

---

## Architektura lokalna

```text
Przegladarka
      |
  https://shogun.pjwstk.edu.pl:8443
      |
  pj_proxy (nginx, port 8443)
      |
Docker network: shogun_local_network
      |
      +-- pj_keycloak           (port 8180 na hoście)
      +-- pj_syllabi_api
      +-- pj_assignments_api
      +-- pj_users_api
      +-- pj_mfe_host
      +-- pj_mfe_program
      +-- pj_mfe_syllabi
      +-- pj_mfe_assignements
      +-- pj_mfe_users
      +-- pj_mfe_lecturers_assignments
      +-- pj_files
      +-- pj_mariadb            (port 3306 na hoście)
      +-- pj_mongo              (port 27017 na hoście)
```

Wszystkie kontenery sa w jednej sieci Docker `shogun_local_network`.
Bazy danych sa eksponowane na porty hosta (DBeaver, MongoDB Compass).

---

## Konfiguracja zmiennych

Plik `.env.local` (kopiowany z `.env.local.example`):

| Zmienna | Domyslna | Opis |
|---|---|---|
| `MARIADB_ROOT_PASSWORD` | `password` | Haslo root MariaDB |
| `MONGO_USER` | `admin` | Uzytkownik MongoDB |
| `MONGO_PASS` | `haslo123` | Haslo MongoDB |
| `MONGO_DB` | `pj_sylabi` | Nazwa bazy MongoDB |
| `KC_DB_USER` | `root` | Uzytkownik Keycloak do MariaDB |
| `KC_DB_PASS` | `password` | Haslo Keycloak do MariaDB |
| `KC_ADMIN_USER` | `admin` | Login do Keycloak Admin Console |
| `KC_ADMIN_PASS` | `admin_pass` | Haslo do Keycloak Admin Console |
| `USERS_SERVICE_CLIENT_SECRET` | — | Uzupelniany po `terraform apply` |

---

## Konfiguracja Terraform (Keycloak realm)

Terraform konfiguruje realm `shogun` w Keycloaku (klientow, role, Google OAuth).

### Wymagania

- Keycloak dziala pod `http://localhost:8180/auth`
- Google Cloud OAuth Client ID i Secret (patrz nizej)

### Konfiguracja Google OAuth

1. Wejdz na https://console.cloud.google.com/
2. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
3. Typ aplikacji: **Web application**
4. Authorized JavaScript origins:
   ```
   https://shogun.pjwstk.edu.pl:8443
   ```
5. Authorized redirect URIs:
   ```
   https://shogun.pjwstk.edu.pl:8443/auth/realms/shogun/broker/google/endpoint
   ```
6. Skopiuj **Client ID** i **Client Secret** do `terraform.tfvars`

### Plik terraform.tfvars

Lokalizacja: `backend/infrastructure/keycloak/terraform.tfvars`

```hcl
keycloak_url             = "http://127.0.0.1:8180/auth"
keycloak_admin_user      = "admin"
keycloak_admin_pass      = "admin_pass"
keycloak_admin_client_id = "admin-cli"
keycloak_admin_client_secret = ""
google_client_id         = "<twoj-google-client-id>"
google_client_secret     = "<twoj-google-client-secret>"
```

### Reczne uruchomienie Terraform

```powershell
cd ..\backend\infrastructure\keycloak
terraform init
terraform plan
terraform apply
terraform output -raw users_service_client_secret
```

Skopiuj wynik do `USERS_SERVICE_CLIENT_SECRET` w `.env.local`, nastepnie:

```powershell
cd ..\..\..\..\deployment-local
.\rebuild.ps1 users-api
```

---

## Rozwiazywanie problemow

### Keycloak nie startuje

Sprawdz logi:

```powershell
docker logs pj_keycloak -f
```

Najczestsze przyczyny:
- MariaDB nie jest jeszcze gotowy -- poczekaj 30 sekund i sprobuj ponownie
- Baza `shogun_users` nie istnieje -- winna `docker-compose.databases.yml`

### nginx zwraca 502 Bad Gateway

Serwis docelowy nie jest gotowy. Sprawdz:

```powershell
docker compose --env-file .env.local ps
docker logs pj_syllabi_api -f
```

### Przegladarka nie ufa certyfikatowi

Uruchom ponownie `mkcert -install` jako Administrator i zrestartuj przegladarke.

### Status wszystkich kontenerow

```powershell
docker compose -f docker-compose.databases.yml --env-file .env.local ps
docker compose -f docker-compose.keycloak.yml --env-file .env.local ps
docker compose --env-file .env.local ps
```

### Logi serwisu

```powershell
docker logs pj_syllabi_api -f
docker logs pj_assignments_api -f
docker logs pj_users_api -f
docker logs pj_proxy -f
docker logs pj_keycloak -f
docker logs pj_mariadb -f
docker logs pj_mongo -f
```

---

## Bezpieczenstwo

- Pliki `.env.local`, `certs/*.pem` i `terraform.tfvars` nie sa commitowane (`.gitignore`).
- Domyslne hasla (`password`, `haslo123`) sa akceptowalne tylko lokalnie -- nie uzywaj ich w zadnym innym srodowisku.
