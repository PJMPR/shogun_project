#Requires -Version 5.1
<#
.SYNOPSIS
    Zatrzymuje wszystkie serwisy srodowiska lokalnego Shogun.

.DESCRIPTION
    Uzycie:
      .\stop.ps1               # zatrzymaj kontenery (dane zachowane)
      .\stop.ps1 -RemoveData   # UWAGA: usuwa wolumeny (utrata danych baz!)
#>

param(
    [switch]$RemoveData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot

function Write-Step { param([string]$Msg) Write-Host "[*] $Msg..." -ForegroundColor Cyan }

if ($RemoveData) {
    Write-Host "[!] UWAGA: Opcja -RemoveData usuwa wolumeny baz danych!" -ForegroundColor Red
    $confirm = Read-Host "Czy na pewno chcesz usunac dane? (wpisz 'tak' aby potwierdzic)"
    if ($confirm -ne 'tak') {
        Write-Host "Anulowano." -ForegroundColor Yellow
        exit 0
    }
}

Push-Location $scriptDir

Write-Step "Zatrzymywanie aplikacji"
docker compose --env-file .env.local down $(if ($RemoveData) { '--volumes' })

Write-Step "Zatrzymywanie Keycloak"
docker compose -f docker-compose.keycloak.yml --env-file .env.local down

Write-Step "Zatrzymywanie baz danych"
if ($RemoveData) {
    docker compose -f docker-compose.databases.yml --env-file .env.local down --volumes
}
else {
    docker compose -f docker-compose.databases.yml --env-file .env.local down
}

Pop-Location

Write-Host ""
if ($RemoveData) {
    Write-Host "[+] Wszystkie kontenery i dane usuniete." -ForegroundColor Yellow
}
else {
    Write-Host "[+] Wszystkie kontenery zatrzymane. Dane baz danych zachowane." -ForegroundColor Green
    Write-Host "    Aby uruchomic ponownie: .\start.ps1" -ForegroundColor Gray
}
