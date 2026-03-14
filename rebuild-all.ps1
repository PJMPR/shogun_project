# rebuild-all.ps1
# Uruchamia pelny rebuild:
#   1) PDF sylabusow  (latex\build-all-syllabi.ps1)
#   2) Word sylabusow (sylabus-word\generate_syllabus.py)
#   3) PDF programow  (latex-studia\build-program.ps1)
#
# Uzycie:
#   .\rebuild-all.ps1                            # wszystko, wszystkie tryby
#   .\rebuild-all.ps1 -Mode s                    # tylko stacjonarne
#   .\rebuild-all.ps1 -Mode n                    # tylko niestacjonarne
#   .\rebuild-all.ps1 -Codes "PAI,RBD"           # wybrane kody, wszystkie tryby
#   .\rebuild-all.ps1 -Codes "PAI RBD" -Mode s   # wybrane kody, tryb stacjonarny

param(
    [string]$Codes = "",
    [string]$Mode  = "all"
)

$ROOT = $PSScriptRoot

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ("=" * 66) -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 66) -ForegroundColor Cyan
}

function Write-OK([string]$msg)  { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-ERR([string]$msg) { Write-Host "  [ERR] $msg" -ForegroundColor Red }

# Walidacja parametru Mode
$validModes = @("all","s","n")
if ($Mode -notin $validModes) {
    Write-ERR "Nieznany tryb: '$Mode'. Dopuszczalne wartosci: all, s, n"
    exit 1
}

# Normalizacja listy kodow
$CodesArray = @()
if ($Codes -and $Codes.Trim() -ne "") {
    $CodesArray = $Codes -split '[,\s]+' | Where-Object { $_ -ne "" }
}
$CodesStr   = $CodesArray -join ","

Write-Host ""
Write-Host "====  rebuild-all.ps1  ====" -ForegroundColor Yellow
Write-Host "  Mode  : $Mode"
if ($CodesArray.Count -gt 0) {
    Write-Host "  Codes : $($CodesArray -join ', ')"
} else {
    Write-Host "  Codes : (wszystkie)"
}
Write-Host ""

$errors = @()

# ==========================================================================
# KROK 1 - PDF sylabusow
# ==========================================================================
Write-Step "KROK 1/3: Budowanie PDF sylabusow  (latex\build-all-syllabi.ps1)"

$pdfParams = @{ Mode = $Mode }
if ($CodesStr -ne "") { $pdfParams["Codes"] = $CodesStr }

try {
    & "$ROOT\latex\build-all-syllabi.ps1" @pdfParams
    if (-not $?) { throw "Skrypt zakonczyl sie z bledem" }
    Write-OK "PDF sylabusow - gotowe"
} catch {
    Write-ERR "PDF sylabusow - BLAD: $_"
    $errors += "KROK 1 (PDF sylabusow): $_"
}

# ==========================================================================
# KROK 2 - Word sylabusow
# ==========================================================================
Write-Step "KROK 2/3: Budowanie Word sylabusow (sylabus-word\generate_syllabus.py)"

$pyScript = "$ROOT\sylabus-word\generate_syllabus.py"
$pyArgs   = @("--mode", $Mode)
if ($CodesArray.Count -gt 0) { $pyArgs += $CodesArray }


try {
    & python $pyScript @pyArgs
    if ($LASTEXITCODE -ne 0) { throw "Skrypt zakonczyl sie kodem $LASTEXITCODE" }
    Write-OK "Word sylabusow - gotowe"
} catch {
    Write-ERR "Word sylabusow - BLAD: $_"
    $errors += "KROK 2 (Word sylabusow): $_"
}

# ==========================================================================
# KROK 3 - PDF programow studiow
# ==========================================================================
Write-Step "KROK 3/3: Budowanie PDF programow (latex-studia\build-program.ps1)"

try {
    & "$ROOT\latex-studia\build-program.ps1"
    if (-not $?) { throw "Skrypt zakonczyl sie z bledem" }
    Write-OK "PDF programow - gotowe"
} catch {
    Write-ERR "PDF programow - BLAD: $_"
    $errors += "KROK 3 (PDF programow): $_"
}

# ==========================================================================
# Podsumowanie
# ==========================================================================
Write-Host ""
Write-Host ("=" * 66) -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "  ZAKONCZONE POMYSLNIE (wszystkie 3 kroki)" -ForegroundColor Green
} else {
    Write-Host "  ZAKONCZONE Z BLEDAMI:" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "    - $e" -ForegroundColor Red
    }
}
Write-Host ("=" * 66) -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -gt 0) { exit 1 }
