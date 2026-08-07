#Requires -Version 5.1
<#
.SYNOPSIS
    Jednorazowy setup srodowiska lokalnego Shogun.

.DESCRIPTION
    Skrypt wykonuje kroki wymagane przed pierwszym uruchomieniem:
      1. Sprawdza dostepnosc Docker Desktop.
      2. Instaluje mkcert (przez winget) i generuje lokalny certyfikat TLS.
      3. Dodaje wpis shogun.pjwstk.edu.pl do pliku hosts.
      4. Kopiuje .env.local.example -> .env.local (jesli nie istnieje).
      5. Uruchamia bazy danych i Keycloak.
      6. Prowadzi przez konfiguracje Terraform (realm shogun).
      7. Uruchamia glowny stack aplikacji.

    Po zakonczeniu aplikacja bedzie dostepna pod:
      https://shogun.pjwstk.edu.pl:8443

.NOTES
    Wymaga uprawnien administratora (modyfikacja hosts i mkcert -install).
    Uruchom z poziomu folderu deployment-local.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Step { param([string]$Msg) Write-Host "`n=== $Msg ===" -ForegroundColor Cyan }
function Write-OK   { param([string]$Msg) Write-Host "[+] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "[!] $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red }

function Confirm-Continue {
    param([string]$Prompt = "Nacisnij Enter, aby kontynuowac...")
    Read-Host $Prompt | Out-Null
}

# ---------------------------------------------------------------------------
# 0. Sprawdzenie uprawnien administratora
# ---------------------------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Err "Skrypt wymaga uprawnien administratora (modyfikacja hosts, mkcert -install)."
    Write-Warn "Uruchom terminal jako Administrator i ponow probe."
    exit 1
}

# ---------------------------------------------------------------------------
# 1. Docker
# ---------------------------------------------------------------------------
Write-Step "Sprawdzanie Docker"
try {
    $dockerVersion = docker --version 2>&1
    Write-OK "Docker: $dockerVersion"
}
catch {
    Write-Err "Docker nie jest zainstalowany lub nie dziala."
    Write-Warn "Zainstaluj Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
}

# ---------------------------------------------------------------------------
# 2. mkcert -- instalacja i generowanie certyfikatu
# ---------------------------------------------------------------------------
Write-Step "mkcert -- lokalny certyfikat TLS"

$certsDir = Join-Path $scriptDir "certs"
$certFile = Join-Path $certsDir "shogun.pjwstk.edu.pl.pem"
$keyFile  = Join-Path $certsDir "shogun.pjwstk.edu.pl-key.pem"

if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
}

if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    Write-OK "Certyfikat juz istnieje -- pomijam generowanie."
}
else {
    # Sprawdz mkcert
    $mkcertOk = $null -ne (Get-Command mkcert -ErrorAction SilentlyContinue)
    if (-not $mkcertOk) {
        Write-Host "[*] Instalowanie mkcert przez winget..." -ForegroundColor Yellow
        winget install --id FiloSottile.mkcert --silent --accept-package-agreements --accept-source-agreements
        # Odswiez PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("PATH", "User")
        $mkcertOk = $null -ne (Get-Command mkcert -ErrorAction SilentlyContinue)
        if (-not $mkcertOk) {
            Write-Err "mkcert nie zostal znaleziony po instalacji. Zainstaluj recznie i ponow."
            exit 1
        }
    }

    Write-Host "[*] Instalowanie lokalnego CA do przegladarek (mkcert -install)..."
    mkcert -install

    Write-Host "[*] Generowanie certyfikatu dla shogun.pjwstk.edu.pl..."
    Push-Location $certsDir
    mkcert shogun.pjwstk.edu.pl
    Pop-Location

    Write-OK "Certyfikat wygenerowany w $certsDir"
}

# ---------------------------------------------------------------------------
# 3. Wpis w hosts
# ---------------------------------------------------------------------------
Write-Step "Plik hosts"

$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsEntry = "127.0.0.1  shogun.pjwstk.edu.pl"
$hostsContent = Get-Content $hostsFile -Raw

if ($hostsContent -match "shogun\.pjwstk\.edu\.pl") {
    Write-OK "Wpis shogun.pjwstk.edu.pl juz istnieje w hosts."
}
else {
    Add-Content -Path $hostsFile -Value "`n$hostsEntry"
    Write-OK "Dodano wpis: $hostsEntry"
}

# ---------------------------------------------------------------------------
# 4. Plik .env.local
# ---------------------------------------------------------------------------
Write-Step "Plik .env.local"

$envExample = Join-Path $scriptDir ".env.local.example"
$envLocal   = Join-Path $scriptDir ".env.local"

if (Test-Path $envLocal) {
    Write-OK ".env.local juz istnieje -- nie nadpisuje."
}
else {
    Copy-Item $envExample $envLocal
    Write-OK "Skopiowano .env.local.example -> .env.local"
    Write-Warn "Mozesz zmienic hasla w .env.local przed uruchomieniem (domyslne sa wystarczajace lokalnie)."
}

# ---------------------------------------------------------------------------
# 5. Uruchomienie baz danych
# ---------------------------------------------------------------------------
Write-Step "Uruchamianie baz danych (MariaDB + MongoDB + PostgreSQL)"

Push-Location $scriptDir
docker compose -f docker-compose.databases.yml --env-file .env.local up -d
Write-OK "Bazy danych uruchomione."

Write-Host "[*] Oczekiwanie na gotowos baz danych (30 s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# ---------------------------------------------------------------------------
# 6. Uruchomienie Keycloak
# ---------------------------------------------------------------------------
Write-Step "Uruchamianie Keycloak"

docker compose -f docker-compose.keycloak.yml --env-file .env.local up -d
Write-OK "Keycloak uruchomiony."

Write-Host ""
Write-Warn "Keycloak potrzebuje ok. 60 sekund na pierwsze uruchomienie."
Write-Host "    Admin Console: http://localhost:8180/auth/admin"
Write-Host "    Login / haslo: (z .env.local: KC_ADMIN_USER / KC_ADMIN_PASS)"
Write-Host ""
Confirm-Continue "Poczekaj az Keycloak bedzie dostepny pod http://localhost:8180/auth/admin, nastepnie nacisnij Enter..."

# ---------------------------------------------------------------------------
# 7. Terraform -- konfiguracja realm Keycloak
# ---------------------------------------------------------------------------
Write-Step "Terraform -- konfiguracja realmu Keycloak"

$tfDir = Join-Path $scriptDir "..\backend\infrastructure\keycloak"
$tfVarsExample = Join-Path $tfDir "terraform.tfvars.example"
$tfVars        = Join-Path $tfDir "terraform.tfvars"

Write-Host ""
Write-Host "Terraform skonfiguruje realm 'shogun' w Keycloaku." -ForegroundColor White
Write-Host ""

if (-not (Test-Path $tfVars)) {
    Copy-Item $tfVarsExample $tfVars
    Write-OK "Skopiowano terraform.tfvars.example -> terraform.tfvars"
}

# Wczytaj wartosci z .env.local do terraform.tfvars
$envVars = @{}
Get-Content $envLocal | ForEach-Object {
    if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.+?)\s*$') {
        $envVars[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
    }
}

$tfContent = Get-Content $tfVars -Raw
$adminUser = if ($envVars['KC_ADMIN_USER']) { $envVars['KC_ADMIN_USER'] } else { 'admin' }
$adminPass = if ($envVars['KC_ADMIN_PASS']) { $envVars['KC_ADMIN_PASS'] } else { 'admin_pass' }

$tfContent = $tfContent -replace 'keycloak_admin_user\s*=\s*".*?"', "keycloak_admin_user      = `"$adminUser`""
$tfContent = $tfContent -replace 'keycloak_admin_pass\s*=\s*".*?"', "keycloak_admin_pass      = `"$adminPass`""
Set-Content -Path $tfVars -Value $tfContent

Write-Warn "Uzupelnij Google OAuth w terraform.tfvars (google_client_id, google_client_secret):"
Write-Host "    Plik: $tfVars" -ForegroundColor Gray
Write-Host ""
Confirm-Continue "Uzupelnij google_client_id i google_client_secret, zapisz plik, nastepnie nacisnij Enter..."

# Sprawdz terraform
$tfOk = $null -ne (Get-Command terraform -ErrorAction SilentlyContinue)
if (-not $tfOk) {
    Write-Warn "Terraform nie jest zainstalowany. Zainstaluj ze strony https://developer.hashicorp.com/terraform/install"
    Write-Warn "Nastepnie uruchom recznie:"
    Write-Host "  cd `"$tfDir`""
    Write-Host "  terraform init"
    Write-Host "  terraform apply"
    Write-Host "  terraform output -raw users_service_client_secret"
    Write-Host ""
    Confirm-Continue "Po zainstalowaniu Terraform i wykonaniu powyzszych krokow nacisnij Enter..."
}
else {
    Push-Location $tfDir
    Write-Host "[*] terraform init..."
    terraform init -upgrade
    Write-Host "[*] terraform apply..."
    terraform apply -auto-approve
    $clientSecret = terraform output -raw users_service_client_secret 2>$null
    Pop-Location

    if ($clientSecret) {
        Write-OK "Client secret: $clientSecret"
        # Wpisz do .env.local
        $envContent = Get-Content $envLocal -Raw
        if ($envContent -match 'USERS_SERVICE_CLIENT_SECRET=\s*$') {
            $envContent = $envContent -replace 'USERS_SERVICE_CLIENT_SECRET=\s*$', "USERS_SERVICE_CLIENT_SECRET=$clientSecret"
            Set-Content -Path $envLocal -Value $envContent.TrimEnd()
            Write-OK "Wpisano USERS_SERVICE_CLIENT_SECRET do .env.local"
        }
        else {
            Write-Warn "Ustaw recznie USERS_SERVICE_CLIENT_SECRET=$clientSecret w .env.local"
        }
    }
}

# ---------------------------------------------------------------------------
# 8. Uruchomienie glownego stacka aplikacji
# ---------------------------------------------------------------------------
Write-Step "Uruchamianie aplikacji (API + frontendy + nginx)"

docker compose --env-file .env.local up -d --build
Write-OK "Aplikacja uruchomiona."

Pop-Location

# ---------------------------------------------------------------------------
# 9. Podsumowanie
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup zakonczony!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Aplikacja:     https://shogun.pjwstk.edu.pl:8443"
Write-Host "  Keycloak:      http://localhost:8180/auth/admin"
Write-Host "  MariaDB:       localhost:3306 (root / z .env.local)"
Write-Host "  MongoDB:       localhost:27017 (admin / z .env.local)"
Write-Host "  PostgreSQL:    localhost:5432 (Schedule API / z .env.local)"
Write-Host ""
Write-Host "Kolejne uruchomienia (po restarcie PC):"
Write-Host "  cd deployment-local"
Write-Host "  .\start.ps1"
Write-Host ""
