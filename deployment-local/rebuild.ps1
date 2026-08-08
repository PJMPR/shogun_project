#Requires -Version 5.1
<#
.SYNOPSIS
    Przebudowuje i restartuje wybrany serwis (lub wszystkie API/frontendy).

.DESCRIPTION
    Uzycie:
      .\rebuild.ps1 api                    # przebuduj Syllabi API
      .\rebuild.ps1 assignments-api        # przebuduj Assignments API
      .\rebuild.ps1 users-api              # przebuduj Users API
      .\rebuild.ps1 mfe-host               # przebuduj MFE host
      .\rebuild.ps1 mfe-program            # przebuduj MFE program
      .\rebuild.ps1 mfe-syllabi            # przebuduj MFE syllabi
      .\rebuild.ps1 mfe-assignements       # przebuduj MFE assignements
      .\rebuild.ps1 mfe-users              # przebuduj MFE users
      .\rebuild.ps1 mfe-lecturers-assignments
      .\rebuild.ps1 mfe-lecturer-schedule
      .\rebuild.ps1 proxy                  # przeladuj nginx (bez rebuild)
      .\rebuild.ps1 all                    # przebuduj wszystko
#>

param(
    [Parameter(Mandatory)][string]$Service
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$envFile   = Join-Path $scriptDir ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "[!] Brak .env.local -- uruchom najpierw setup-local.ps1" -ForegroundColor Red
    exit 1
}

Push-Location $scriptDir

if ($Service -eq 'all') {
    Write-Host "[*] Przebudowywanie wszystkich serwisow aplikacji..." -ForegroundColor Cyan
    docker compose --env-file .env.local up -d --build
}
elseif ($Service -eq 'proxy') {
    Write-Host "[*] Przeladowywanie nginx..." -ForegroundColor Cyan
    docker compose --env-file .env.local up -d proxy
}
else {
    Write-Host "[*] Przebudowywanie serwisu: $Service..." -ForegroundColor Cyan
    docker compose --env-file .env.local up -d --build $Service
}

Pop-Location

Write-Host "[+] Gotowe." -ForegroundColor Green
