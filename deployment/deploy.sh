#!/usr/bin/env bash
# deploy.sh
# Skrypt wdrozeniowy dla serwera GDA-Shogun (Ubuntu 22.04/24.04).
# Uruchamiany na serwerze docelowym po pierwszej konfiguracji.
#
# Uzycie:
#   chmod +x deploy.sh
#   ./deploy.sh             # pelne wdrozenie (build + start)
#   ./deploy.sh --no-build  # restart bez przebudowania obrazow

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$REPO_DIR/deployment"
ENV_FILE="$DEPLOY_DIR/.env.prod"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
BUILD_FLAG="--build"

# Parsowanie argumentow
for arg in "$@"; do
    case $arg in
        --no-build) BUILD_FLAG="" ;;
    esac
done

echo "=============================================="
echo "  Wdrozenie Shogun"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="

# 1. Sprawdzenie wymaganych plikow
if [[ ! -f "$ENV_FILE" ]]; then
    echo "[!] Brak pliku $ENV_FILE"
    echo "    Skopiuj .env.prod.example jako .env.prod i uzupelnij wartosci."
    exit 1
fi

if [[ ! -f "$DEPLOY_DIR/certs/fullchain.pem" ]] || [[ ! -f "$DEPLOY_DIR/certs/privkey.pem" ]]; then
    echo "[!] Brak certyfikatow TLS w $DEPLOY_DIR/certs/"
    echo "    Uruchom najpierw: sudo certbot certonly --standalone -d shogun.pjwstk.edu.pl"
    echo "    Nastepnie: sudo cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/fullchain.pem $DEPLOY_DIR/certs/"
    echo "               sudo cp /etc/letsencrypt/live/shogun.pjwstk.edu.pl/privkey.pem  $DEPLOY_DIR/certs/"
    exit 1
fi

# 2. Aktualizacja kodu
echo ""
echo "[*] Aktualizacja repozytorium..."
cd "$REPO_DIR"
git pull --ff-only

# 3. Zatrzymanie starych kontenerow glownego stacka (jesli dzialaja)
echo ""
echo "[*] Zatrzymywanie poprzedniej wersji..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true

# 4. Uruchomienie nowej wersji
echo ""
echo "[*] Uruchamianie aplikacji (${BUILD_FLAG:-bez rebuildu})..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d $BUILD_FLAG

# 5. Weryfikacja
echo ""
echo "[*] Status kontenerow:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "[+] Wdrozenie zakonczone!"
echo "    Aplikacja dostepna pod: https://$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)"
