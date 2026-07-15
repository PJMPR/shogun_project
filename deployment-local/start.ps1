#Requires -Version 5.1
<#
.SYNOPSIS
    Uruchamia wszystkie serwisy srodowiska lokalnego Shogun.

.DESCRIPTION
    Kolejnosc:
      1. Bazy danych (MariaDB + MongoDB)
      2. Keycloak
      3. Aplikacja (API + frontendy + nginx)

    Uzycie:
      .\start.ps1              # uruchom wszystko
      .\start.ps1 -NoBuild     # bez przebudowania obrazow Docker
#>

param(
    [switch]$NoBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$envFile   = Join-Path $scriptDir ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "[!] Brak .env.local -- uruchom najpierw setup-local.ps1" -ForegroundColor Red
    exit 1
}

function Write-Step { param([string]$Msg) Write-Host "`n[*] $Msg..." -ForegroundColor Cyan }

Push-Location $scriptDir

Write-Step "Bazy danych"
docker compose -f docker-compose.databases.yml --env-file .env.local up -d

Write-Step "Keycloak"
docker compose -f docker-compose.keycloak.yml --env-file .env.local up -d

Write-Step "Aplikacja"
if ($NoBuild) {
    docker compose --env-file .env.local up -d
}
else {
    docker compose --env-file .env.local up -d --build
}

Pop-Location

Write-Host ""
Write-Host "[+] Gotowe. Aplikacja dostepna pod: https://shogun.pjwstk.edu.pl:8443" -ForegroundColor Green
Write-Host "    Keycloak Admin:                  http://localhost:8180/auth/admin" -ForegroundColor Gray
