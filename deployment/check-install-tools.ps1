#Requires -Version 5.1
<#
.SYNOPSIS
    Sprawdza i instaluje wymagane narzedzia (Docker, Docker Compose, git, make)
    na zdalnej maszynie Ubuntu przez SSH.

.DESCRIPTION
    Skrypt:
      1. Wczytuje dane polaczenia z pliku .env (obok skryptu lub wskazanego w -EnvFile).
      2. Pobiera plink.exe (PuTTY CLI) jesli brakuje -- obsluguje keyboard-interactive.
      3. Laczy sie przez SSH do maszyny GDA-Shogun.
      4. Sprawdza obecnosc: docker, docker compose plugin, git, make.
      5. Instaluje brakujace narzedzia (bez interakcji uzytkownika).
      6. Wyswietla weryfikacje koncowa.

.PARAMETER EnvFile
    Sciezka do pliku .env z danymi polaczenia.
    Domyslnie: .env (obok skryptu).

.EXAMPLE
    .\check-install-tools.ps1
    .\check-install-tools.ps1 -EnvFile C:\secrets\shogun.env

.NOTES
    Wymagania: PowerShell 5.1+, dostep do internetu (plink pobierany automatycznie).
    Maszyna docelowa: Ubuntu 22.04 / 24.04.
#>

param(
    [string]$EnvFile = "$PSScriptRoot\.env"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# 1. plink.exe (PuTTY CLI) -- obsluguje keyboard-interactive bez problemow
# ---------------------------------------------------------------------------
$plinkPath = "$PSScriptRoot\plink.exe"

if (-not (Test-Path $plinkPath)) {
    Write-Host "[*] Pobieranie plink.exe (PuTTY)..." -ForegroundColor Cyan
    try {
        $plinkUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe"
        Invoke-WebRequest -Uri $plinkUrl -OutFile $plinkPath -UseBasicParsing -ErrorAction Stop
        Write-Host "[+] plink.exe pobrany." -ForegroundColor Green
    }
    catch {
        Write-Error "Nie udalo sie pobrac plink.exe: $_"
        exit 1
    }
}

# ---------------------------------------------------------------------------
# 2. Wczytaj .env
# ---------------------------------------------------------------------------
if (-not (Test-Path $EnvFile)) {
    Write-Error "Nie znaleziono pliku: $EnvFile. Skopiuj .env.example jako .env i uzupelnij dane."
    exit 1
}

$cfg = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.+?)\s*$') {
        $cfg[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
    }
}

$sshHost = if ($cfg['SSH_HOST']) { $cfg['SSH_HOST'] } else { '194.92.77.80' }
$sshUser = if ($cfg['SSH_USER']) { $cfg['SSH_USER'] } else { 'shogun' }
$sshPass = $cfg['SSH_PASS']
$sshPort = if ($cfg['SSH_PORT']) { [int]$cfg['SSH_PORT'] } else { 22 }

if (-not $sshPass) { Write-Error "Brak SSH_PASS w $EnvFile"; exit 1 }

# ---------------------------------------------------------------------------
# 3. Test polaczenia i akceptacja klucza hosta
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[*] Laczenie z ${sshHost}:${sshPort} jako $sshUser..." -ForegroundColor Cyan

$testOut = "y" | & $plinkPath -ssh -pw $sshPass -P $sshPort "$sshUser@$sshHost" "echo CONNECTED" 2>&1
if ($LASTEXITCODE -ne 0 -and ($testOut -notmatch 'CONNECTED')) {
    Write-Error "Nie udalo sie polaczyc SSH:`n$($testOut -join "`n")"
    exit 1
}
Write-Host "[+] Polaczono." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. Pomocnicze funkcje
# ---------------------------------------------------------------------------
function Invoke-Remote {
    param(
        [Parameter(Mandatory)][string]$Command,
        [switch]$Sudo,
        [int]$TimeoutSec = 300
    )
    if ($Sudo) {
        $escaped = $Command -replace "'", "'\'''"
        $full    = "echo '$sshPass' | sudo -S bash -c '$escaped' 2>/dev/null"
    }
    else {
        $full = $Command
    }
    $out = & $plinkPath -ssh -pw $sshPass -batch -P $sshPort "$sshUser@$sshHost" $full 2>&1
    return [PSCustomObject]@{
        ExitStatus = $LASTEXITCODE
        Output     = ($out | Out-String).Trim()
        Error      = ''
    }
}

function Write-ToolStatus {
    param([string]$Name, [bool]$Installed, [string]$Version = '')
    if ($Installed) {
        $ver = if ($Version) { "  ($Version)" } else { '' }
        Write-Host ("  [OK]  {0,-22}{1}" -f $Name, $ver) -ForegroundColor Green
    }
    else {
        Write-Host ("  [--]  {0,-22}nie zainstalowany" -f $Name) -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# 5. Sprawdzenie biezacego stanu
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Sprawdzanie narzedzi ===" -ForegroundColor Cyan

$missing = [System.Collections.Generic.List[string]]::new()

$r = Invoke-Remote "docker --version 2>/dev/null || echo NOT_FOUND"
$dockerOk  = ($r.ExitStatus -eq 0) -and ($r.Output -notmatch 'NOT_FOUND')
$dockerVer = if ($dockerOk) { ($r.Output -split "`n")[0].Trim() } else { '' }
Write-ToolStatus "docker" $dockerOk $dockerVer
if (-not $dockerOk) { $missing.Add('docker') }

$r = Invoke-Remote "docker compose version 2>/dev/null || echo NOT_FOUND"
$composeOk  = ($r.ExitStatus -eq 0) -and ($r.Output -notmatch 'NOT_FOUND')
$composeVer = if ($composeOk) { ($r.Output -split "`n")[0].Trim() } else { '' }
Write-ToolStatus "docker compose (plugin)" $composeOk $composeVer
if (-not $composeOk -and $dockerOk) { $missing.Add('docker-compose-plugin') }

$r = Invoke-Remote "git --version 2>/dev/null || echo NOT_FOUND"
$gitOk  = ($r.ExitStatus -eq 0) -and ($r.Output -notmatch 'NOT_FOUND')
$gitVer = if ($gitOk) { ($r.Output -split "`n")[0].Trim() } else { '' }
Write-ToolStatus "git" $gitOk $gitVer
if (-not $gitOk) { $missing.Add('git') }

$r = Invoke-Remote "make --version 2>/dev/null || echo NOT_FOUND"
$makeOk  = ($r.ExitStatus -eq 0) -and ($r.Output -notmatch 'NOT_FOUND')
$makeVer = if ($makeOk) { ($r.Output -split "`n")[0].Trim() } else { '' }
Write-ToolStatus "make" $makeOk $makeVer
if (-not $makeOk) { $missing.Add('make') }

# ---------------------------------------------------------------------------
# 6. Instalacja brakujacych narzedzi
# ---------------------------------------------------------------------------
if ($missing.Count -eq 0) {
    Write-Host ""; Write-Host "[+] Wszystkie wymagane narzedzia sa zainstalowane." -ForegroundColor Green
}
else {
    Write-Host ""; Write-Host "=== Instalacja brakujacych narzedzi ===" -ForegroundColor Cyan
    Write-Host "    Do zainstalowania: $($missing -join ', ')" -ForegroundColor Yellow

    Write-Host ""
    Write-Host "[*] apt-get update..."
    Invoke-Remote "DEBIAN_FRONTEND=noninteractive apt-get update -qq" -Sudo | Out-Null

    if ($missing.Contains('docker')) {
        Write-Host "[*] Instalowanie Docker (get.docker.com)..." -ForegroundColor Cyan
        $r = Invoke-Remote "curl -fsSL https://get.docker.com | DEBIAN_FRONTEND=noninteractive sh" -Sudo -TimeoutSec 600
        if ($r.ExitStatus -eq 0) {
            Invoke-Remote "usermod -aG docker $sshUser" -Sudo | Out-Null
            Invoke-Remote "systemctl enable --now docker" -Sudo | Out-Null
            Write-Host "[+] Docker zainstalowany." -ForegroundColor Green
            $missing.Remove('docker-compose-plugin') | Out-Null
        }
        else {
            Write-Host "[!] Blad Docker (kod $($r.ExitStatus)):" -ForegroundColor Red
            Write-Host $r.Output -ForegroundColor Red
        }
    }

    if ($missing.Contains('docker-compose-plugin')) {
        Write-Host "[*] Instalowanie Docker Compose plugin..." -ForegroundColor Cyan
        $r = Invoke-Remote "DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin" -Sudo
        if ($r.ExitStatus -eq 0) { Write-Host "[+] Docker Compose plugin zainstalowany." -ForegroundColor Green }
        else { Write-Host "[!] Blad: $($r.Output)" -ForegroundColor Red }
    }

    $aptPkgs = @(@('git', 'make') | Where-Object { $missing.Contains($_) })
    if ($aptPkgs.Count -gt 0) {
        $pkgList = $aptPkgs -join ' '
        Write-Host "[*] Instalowanie: $pkgList..." -ForegroundColor Cyan
        $r = Invoke-Remote "DEBIAN_FRONTEND=noninteractive apt-get install -y $pkgList" -Sudo
        if ($r.ExitStatus -eq 0) { Write-Host "[+] $pkgList zainstalowane." -ForegroundColor Green }
        else { Write-Host "[!] Blad: $($r.Output)" -ForegroundColor Red }
    }
}

# ---------------------------------------------------------------------------
# 7. Weryfikacja koncowa
# ---------------------------------------------------------------------------
Write-Host ""; Write-Host "=== Weryfikacja koncowa ===" -ForegroundColor Cyan

$allOk = $true
foreach ($chk in @(
    @{ Cmd = "docker --version";       Label = "docker"                  },
    @{ Cmd = "docker compose version"; Label = "docker compose (plugin)" },
    @{ Cmd = "git --version";          Label = "git"                     },
    @{ Cmd = "make --version";         Label = "make"                    }
)) {
    $r   = Invoke-Remote "$($chk.Cmd) 2>/dev/null || echo NOT_FOUND"
    $ok  = ($r.ExitStatus -eq 0) -and ($r.Output -notmatch 'NOT_FOUND')
    $ver = if ($ok) { ($r.Output -split "`n")[0].Trim() } else { 'BRAK' }
    Write-ToolStatus $chk.Label $ok $ver
    if (-not $ok) { $allOk = $false }
}

Write-Host ""
if ($allOk) {
    Write-Host "[+] Gotowe. Srodowisko jest kompletne." -ForegroundColor Green
    if ($missing.Contains('docker')) {
        Write-Host "[!] Uwaga: aby uzywac 'docker' bez sudo, wyloguj sie i zaloguj ponownie na $sshUser." -ForegroundColor Yellow
    }
}
else {
    Write-Host "[!] Niektore narzedzia wciaz niedostepne -- sprawdz bledy powyzej." -ForegroundColor Red
    exit 1
}