# Deployment — Wdrożenie systemu Shogun na GDA-Shogun

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
| `check-install-tools.ps1` | Instaluje Docker, git, make na serwerze przez SSH (uruchamiany lokalnie) |
| `docker-compose.prod.yml` | Produkcyjny stack — wszystkie serwisy w jednej sieci Docker |
| `nginx.prod.conf` | Konfiguracja nginx z Let's Encrypt TLS |
| `.env.prod.example` | Szablon zmiennych środowiskowych produkcji |
| `deploy.sh` | Skrypt wdrożeniowy (uruchamiany na serwerze) |

---

## Krok 1 — Zainstaluj narzędzia na serwerze

Wykonywane **lokalnie** (Windows, PowerShell):

```powershell
# Uzupelnij dane SSH
Copy-Item deployment\.env.example deployment\.env
notepad deployment\.env

# Uruchom skrypt
powershell -ExecutionPolicy Bypass -File deployment\check-install-tools.ps1
```

Skrypt zainstaluje: Docker, Docker Compose plugin, git, make.

---

## Krok 2 — Sklonuj repozytorium na serwer

Wykonywane **na serwerze** (SSH):

```bash
ssh shogun@194.92.77.80
git clone <url-repozytorium> ~/shogun_project
cd ~/shogun_project
```

---

## Krok 3 — Wygeneruj certyfikat TLS (Let's Encrypt)

Wykonywane **na serwerze**:

```bash
# Instalacja Certbota
sudo apt-get install -y certbot

# Wygenerowanie certyfikatu (port 80 musi byc wolny)
sudo certbot certonly --standalone \
  -d shogun.pjwstk.edu.pl \
  -d shogun.pja.edu.pl \
  --non-interactive --agree-tos -m admin@pjwstk.edu.pl

# Skopiowanie certyfikatow do folderu deployment
mkdir -p ~/shogun_project/deployment/certs
sudo cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/fullchain.pem ~/shogun_project/deployment/certs/
sudo cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/privkey.pem  ~/shogun_project/deployment/certs/
sudo chown $USER:$USER ~/shogun_project/deployment/certs/*.pem
```

**Automatyczne odnawianie** (dopisz do crontab):

```bash
# Edytuj crontab
sudo crontab -e

# Dodaj wpis (odnawia o 3:00 w kazda niedziele)
0 3 * * 0 certbot renew --quiet && \
  cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/fullchain.pem /home/shogun/shogun_project/deployment/certs/ && \
  cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/privkey.pem  /home/shogun/shogun_project/deployment/certs/ && \
  docker compose -f /home/shogun/shogun_project/deployment/docker-compose.prod.yml --env-file /home/shogun/shogun_project/deployment/.env.prod restart proxy
```

---

## Krok 4 — Uzupełnij zmienne środowiskowe

Wykonywane **na serwerze**:

```bash
cd ~/shogun_project/deployment
cp .env.prod.example .env.prod
nano .env.prod
```

Uzupełnij wszystkie wartości. `USERS_SERVICE_CLIENT_SECRET` pobierz **lokalnie**:

```powershell
# Lokalnie (Windows)
cd backend\infrastructure\keycloak
terraform output -raw users_service_client_secret
```

---

## Krok 5 — Skonfiguruj Keycloak przez Terraform

Wykonywane **lokalnie** po tym jak serwer jest uruchomiony (krok 6):

```powershell
cd backend\infrastructure\keycloak
# Ustaw URL produkcyjny w terraform.tfvars:
# keycloak_url = "https://shogun.pjwstk.edu.pl/auth"
terraform apply
```

> **Uwaga:** Terraform musi miec dostep do produkcyjnego Keycloak (port 443 musi byc juz otwarty).
> Alternatywnie: uruchom Keycloak tymczasowo na porcie 8180 (bez proxy) i skonfiguruj przez `http://194.92.77.80:8180/auth`.

---

## Krok 6 — Pierwsze wdrożenie

Wykonywane **na serwerze**:

```bash
cd ~/shogun_project/deployment
chmod +x deploy.sh
./deploy.sh
```

Skrypt:
1. Aktualizuje kod z git
2. Zatrzymuje poprzednią wersję
3. Buduje i uruchamia wszystkie kontenery
4. Wyświetla status

---

## Krok 7 — Aktualizacje (kolejne wdrożenia)

```bash
# Na serwerze
cd ~/shogun_project/deployment
./deploy.sh           # z przebudowaniem obrazow (po zmianach kodu)
./deploy.sh --no-build  # bez rebuildu (np. po zmianie konfiguracji)
```

---

## Bezpieczeństwo

- Pliki `.env`, `.env.prod` są w `.gitignore` — **nigdy nie commituj ich do repozytorium**
- Po pierwszym logowaniu zmień hasło tymczasowe: `passwd`
- Skonfiguruj klucz SSH i wyłącz logowanie hasłem:
  ```bash
  # Lokalnie
  ssh-copy-id shogun@194.92.77.80
  # Na serwerze
  sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  sudo systemctl restart sshd
  ```

---

## Architektura produkcyjna

```
Internet (80/443)
       │
  ┌────┴────┐
  │  nginx  │ pj_proxy  (Let's Encrypt TLS)
  └────┬────┘
       │ Docker network: shogun_network
  ┌────┼──────────────────────────────────┐
  │    ├── pj_keycloak  (auth)            │
  │    ├── pj_syllabi_api                 │
  │    ├── pj_assignments_api             │
  │    ├── pj_users_api                   │
  │    ├── pj_mfe_host/program/syllabi/.. │
  │    ├── pj_mariadb   (shogun_users,    │
  │    │                 pj_assignments)  │
  │    └── pj_mongo     (pj_sylabi)       │
  └───────────────────────────────────────┘
```
