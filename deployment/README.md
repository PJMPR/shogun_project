# Deployment - wdrozenie systemu Shogun na GDA-Shogun

## Maszyna docelowa

| | |
|---|---|
| Adres lokalny | `172.19.80.1` |
| Adres publiczny | `194.92.77.80` |
| Domeny | `shogun.pjwstk.edu.pl`, `shogun.pja.edu.pl` |
| Wystawione porty | `80`, `443` |
| System operacyjny | Ubuntu 22.04 / 24.04 |

## Pliki w tym folderze

| Plik | Opis |
|---|---|
| `check-install-tools.ps1` | Instaluje Docker, git i make na serwerze przez SSH; uruchamiany lokalnie |
| `docker-compose.databases.prod.yml` | Produkcyjne bazy danych: MariaDB, MongoDB i jednorazowy init MongoDB |
| `docker-compose.keycloak.prod.yml` | Produkcyjny Keycloak, uruchamiany osobno po bazach danych |
| `docker-compose.prod.yml` | Produkcyjne API, frontendy, pliki statyczne i nginx proxy; bez baz danych i Keycloak |
| `nginx.prod.conf` | Konfiguracja nginx z TLS i reverse proxy do aplikacji oraz Keycloak |
| `.env.prod.example` | Szablon zmiennych srodowiskowych produkcji |
| `deploy.sh` | Redeploy glownego stacka aplikacji; nie sluzy do pierwszego uruchomienia baz ani Keycloak |

---

## Przygotowanie serwera

### 1. Zainstaluj narzedzia na serwerze

Wykonywane lokalnie na Windows w PowerShell:

```powershell
Copy-Item deployment\.env.example deployment\.env
notepad deployment\.env

powershell -ExecutionPolicy Bypass -File deployment\check-install-tools.ps1
```

Skrypt instaluje Docker, Docker Compose plugin, git i make.

### 2. Sklonuj repozytorium na serwer

Wykonywane na serwerze przez SSH:

```bash
ssh shogun@194.92.77.80
git clone <url-repozytorium> ~/shogun_project
cd ~/shogun_project
```

### 3. Wygeneruj certyfikat TLS

Wykonywane na serwerze. Port `80` musi byc wolny na czas generowania certyfikatu:

```bash
sudo apt-get update
sudo apt-get install -y certbot

sudo certbot certonly --standalone \
  -d shogun.pjwstk.edu.pl \
  -d shogun.pja.edu.pl \
  --non-interactive --agree-tos -m admin@pjwstk.edu.pl

mkdir -p ~/shogun_project/deployment/certs
sudo cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/fullchain.pem ~/shogun_project/deployment/certs/
sudo cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/privkey.pem  ~/shogun_project/deployment/certs/
sudo chown $USER:$USER ~/shogun_project/deployment/certs/*.pem
```

Automatyczne odnawianie certyfikatu:

```bash
sudo crontab -e
```

Dodaj wpis:

```cron
0 3 * * 0 certbot renew --quiet && \
  cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/fullchain.pem /home/shogun/shogun_project/deployment/certs/ && \
  cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/privkey.pem  /home/shogun/shogun_project/deployment/certs/ && \
  docker compose -f /home/shogun/shogun_project/deployment/docker-compose.prod.yml --env-file /home/shogun/shogun_project/deployment/.env.prod restart proxy
```

### 4. Przygotuj `.env.prod`

Wykonywane na serwerze:

```bash
cd ~/shogun_project/deployment
cp .env.prod.example .env.prod
nano .env.prod
```

Na tym etapie uzupelnij co najmniej:

- `DOMAIN`
- `MARIADB_ROOT_PASSWORD`
- `MONGO_USER`
- `MONGO_PASS`
- `MONGO_DB`
- `KC_ADMIN_USER`
- `KC_ADMIN_PASS`

`USERS_SERVICE_CLIENT_SECRET` uzupelnisz dopiero po wykonaniu Terraform dla Keycloak.

---

## Proces deploymentowy

### 1. Deployment baz danych

Wykonywane na serwerze:

```bash
cd ~/shogun_project/deployment
docker compose -f docker-compose.databases.prod.yml --env-file .env.prod up -d
docker compose -f docker-compose.databases.prod.yml --env-file .env.prod ps
```

Ten krok tworzy siec `shogun_network`, wolumeny `mariadb_data` i `mongo_data`, uruchamia MariaDB oraz MongoDB i wykonuje jednorazowy init MongoDB.

Nie uruchamiaj na produkcji:

```bash
docker compose -f docker-compose.databases.prod.yml --env-file .env.prod down --volumes
```

### 2. Deployment Keycloak i Terraform

Najpierw uruchom Keycloak na serwerze:

```bash
cd ~/shogun_project/deployment
docker compose -f docker-compose.keycloak.prod.yml --env-file .env.prod up -d
docker compose -f docker-compose.keycloak.prod.yml --env-file .env.prod ps
docker logs pj_keycloak -f
```

Keycloak wystawia port `8180` tylko na `127.0.0.1` serwera. Terraform uruchamiaj lokalnie przez tunel SSH:

```powershell
ssh -N -L 8180:127.0.0.1:8180 shogun@194.92.77.80
```

W drugim oknie PowerShell, lokalnie w repozytorium:

```powershell
cd backend\infrastructure\keycloak
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
```

Ustaw w `terraform.tfvars`:

```hcl
keycloak_url             = "http://localhost:8180/auth"
keycloak_admin_user      = "<wartosc KC_ADMIN_USER z .env.prod>"
keycloak_admin_pass      = "<wartosc KC_ADMIN_PASS z .env.prod>"
keycloak_admin_client_id = "admin-cli"
keycloak_admin_client_secret = ""
google_client_id         = "<uzupelnij>"
google_client_secret     = "<uzupelnij>"
```

Nastepnie wykonaj:

```powershell
terraform init
terraform plan
terraform apply
terraform output -raw users_service_client_secret
```

Skopiuj wynik `terraform output -raw users_service_client_secret` do `USERS_SERVICE_CLIENT_SECRET` w `~/shogun_project/deployment/.env.prod` na serwerze.

### 3. Deployment reszty serwisow

Wykonywane na serwerze po bazach danych, Keycloaku, Terraformie i uzupelnieniu `USERS_SERVICE_CLIENT_SECRET`:

```bash
cd ~/shogun_project/deployment
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Ten krok uruchamia:

- API sylabusow
- API assignments
- API users
- mikrofrontendy
- serwis plikow
- nginx proxy na portach `80` i `443`

Po uruchomieniu aplikacja powinna byc dostepna pod:

```text
https://shogun.pjwstk.edu.pl
```

---

## Aktualizacje

Kod aplikacji aktualizuj na serwerze:

```bash
cd ~/shogun_project
git pull --ff-only
cd deployment
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Bez przebudowania obrazow, np. po zmianie konfiguracji nginx:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Bazy danych i Keycloak sa osobnymi stackami. Aktualizacja glownego stacka aplikacji nie wymaga ich restartu.

---

## Podstawowe komendy operacyjne

Status baz danych:

```bash
docker compose -f docker-compose.databases.prod.yml --env-file .env.prod ps
```

Status Keycloak:

```bash
docker compose -f docker-compose.keycloak.prod.yml --env-file .env.prod ps
docker logs pj_keycloak -f
```

Status aplikacji:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker logs pj_proxy -f
```

Zatrzymanie glownego stacka aplikacji:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod stop
```

---

## Bezpieczenstwo

- Pliki `.env`, `.env.prod` i `terraform.tfvars` zawieraja sekrety i nie powinny byc commitowane.
- Po pierwszym logowaniu zmien haslo tymczasowe poleceniem `passwd`.
- Skonfiguruj klucz SSH i wylacz logowanie haslem.

Lokalnie:

```bash
ssh-copy-id shogun@194.92.77.80
```

Na serwerze:

```bash
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## Architektura produkcyjna

```text
Internet (80/443)
       |
   pj_proxy (nginx, TLS)
       |
Docker network: shogun_network
       |
       +-- pj_keycloak
       +-- pj_syllabi_api
       +-- pj_assignments_api
       +-- pj_users_api
       +-- pj_mfe_host
       +-- pj_mfe_program
       +-- pj_mfe_syllabi
       +-- pj_mfe_assignements
       +-- pj_mfe_users
       +-- pj_files
       +-- pj_mariadb
       +-- pj_mongo
```
