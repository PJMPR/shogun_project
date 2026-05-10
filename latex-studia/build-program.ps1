# build-program.ps1
# Generuje program_stacjonarne.pdf i program_niestacjonarne.pdf
# Wzorowany na build-all-syllabi.ps1
# Ulepszenia: wykrywanie MiKTeX/pdflatex, sprawdzenie node, czytelniejsze komunikaty i wyjscie z kodem bledu.

# Pozwól nadpisać lokalizację MiKTeX przez zmienną środowiskową MIKTEX_BIN
if ($env:MIKTEX_BIN) {
    $MIKTEX_BIN = $env:MIKTEX_BIN
} else {
    # Kilka typowych lokalizacji MiKTeX na Windows
    $candidates = @(
        "$env:LocalAppData\Programs\MiKTeX\miktex\bin\x64",
        "$env:ProgramFiles\MiKTeX\miktex\bin\x64",
        "C:\Program Files\MiKTeX\miktex\bin\x64",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
    )
    $MIKTEX_BIN = $null
    foreach ($c in $candidates) {
        if (Test-Path $c) { $MIKTEX_BIN = $c; break }
    }
}

# Jeśli pdflatex nie jest w $MIKTEX_BIN, spróbuj znaleźć w PATH
$pdflatexPath = $null
if ($MIKTEX_BIN) {
    $candidateExe = Join-Path $MIKTEX_BIN 'pdflatex.exe'
    if (Test-Path $candidateExe) { $pdflatexPath = $candidateExe }
}

if (-not $pdflatexPath) {
    $cmd = Get-Command pdflatex -ErrorAction SilentlyContinue
    if ($cmd) { $pdflatexPath = $cmd.Source }
}

# Sprawdz node
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "ERROR: Nie znaleziono 'node' w PATH. Zainstaluj Node.js (https://nodejs.org/) lub dodaj do PATH." -ForegroundColor Red
    exit 2
}

if (-not $pdflatexPath) {
    Write-Host "ERROR: Nie znaleziono 'pdflatex'. Zainstaluj MiKTeX i upewnij się, że pdflatex.exe jest w PATH lub ustaw zmienną srodowiskowa MIKTEX_BIN." -ForegroundColor Red
    Write-Host "Proponowane MIKTEX_BIN: $($candidates -join ', ')" -ForegroundColor Yellow
    exit 3
}

# Dodaj MIKTEX_BIN do PATH (jeśli jest ustawione), by subprocessy mogly korzystac
if ($MIKTEX_BIN) { $env:PATH = "$MIKTEX_BIN;$env:PATH" }

$root   = $PSScriptRoot
$outDir = Join-Path $root 'output'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# 1) Wygeneruj pliki .tex z JSON
Write-Host "==> Generowanie plikow .tex..." -ForegroundColor Cyan
$genScript = Join-Path $root 'generate-tex.mjs'
if (-not (Test-Path $genScript)) {
    Write-Host "ERROR: Brak pliku generujacego .tex: $genScript" -ForegroundColor Red
    exit 4
}

& "$($nodeCmd.Source)" "$genScript"
if ($LASTEXITCODE -ne 0) { Write-Host "Blad generate-tex.mjs (kod: $LASTEXITCODE)" -ForegroundColor Red; exit 5 }
Write-Host "    OK" -ForegroundColor Green

function Compile-Tex([string]$texFile, [string]$outD) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($texFile)
    Write-Host "`n==> Kompilacja: $name" -ForegroundColor Cyan

    if (-not (Test-Path $texFile)) {
        Write-Host "    BLAD: Nie znaleziono pliku .tex: $texFile" -ForegroundColor Red
        return $false
    }

    # pdflatex rozwiazuje sciezki wzgledem CWD, nie lokalizacji pliku .tex.
    # Uzywamy Push/Pop-Location aby bezpiecznie przywrocic katalog roboczy.
    Push-Location (Split-Path $texFile -Parent)
    $texFileName = Split-Path $texFile -Leaf

    for ($i = 1; $i -le 2; $i++) {
        Write-Host "    Uruchamiam: $pdflatexPath -output-directory=$outD $texFileName" -ForegroundColor DarkCyan
        $result = & "$pdflatexPath" `
            -interaction=nonstopmode `
            -halt-on-error `
            "-output-directory=$outD" `
            "$texFileName" 2>&1

        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            Write-Host "    BLAD (przebieg $i):" -ForegroundColor Red
            $result | Select-String "^!" | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
            return $false
        }
    }

    Pop-Location

    # Sprzatanie
    foreach ($ext in @("aux","log","out","toc","lof","lot")) {
        $f = Join-Path $outD "$name.$ext"
        if (Test-Path $f) { Remove-Item $f -Force }
    }

    $pdf = Join-Path $outD "$name.pdf"
    if (Test-Path $pdf) {
        $size = [math]::Round((Get-Item $pdf).Length / 1KB, 1)
        Write-Host "    OK: $name.pdf ($size KB)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "    BLAD: brak $name.pdf" -ForegroundColor Red
        return $false
    }
}

# 2) Kompiluj (PL)
if (-not (Compile-Tex (Join-Path $root 'program_stacjonarne.tex') $outDir)) { Write-Host "Kompilacja program_stacjonarne.tex nie powiodla sie." -ForegroundColor Red; exit 6 }
if (-not (Compile-Tex (Join-Path $root 'program_niestacjonarne.tex') $outDir)) { Write-Host "Kompilacja program_niestacjonarne.tex nie powiodla sie." -ForegroundColor Red; exit 7 }

# 3) Kompiluj (EN)
Write-Host "`n==> Kompilacja wersji anglojezycznych..." -ForegroundColor Cyan
if (-not (Compile-Tex (Join-Path $root 'program_stacjonarne_en.tex') $outDir)) { Write-Host "Kompilacja program_stacjonarne_en.tex nie powiodla sie." -ForegroundColor Red; exit 8 }
if (-not (Compile-Tex (Join-Path $root 'program_niestacjonarne_en.tex') $outDir)) { Write-Host "Kompilacja program_niestacjonarne_en.tex nie powiodla sie." -ForegroundColor Red; exit 9 }

# 4) Kopiuj PDF-y do public/assets/files
$publicFilesDir = Join-Path $root '..\public\assets\files' -Resolve
New-Item -ItemType Directory -Force -Path $publicFilesDir | Out-Null

Write-Host "`n==> Kopiowanie PDF-ow do public\assets\files..." -ForegroundColor Cyan
$copied = 0
Get-ChildItem (Join-Path $outDir '*.pdf') -ErrorAction SilentlyContinue | ForEach-Object {
    $dest = Join-Path $publicFilesDir $_.Name
    Copy-Item $_.FullName -Destination $dest -Force
    $size = [math]::Round($_.Length / 1KB, 1)
    Write-Host "    OK: $($_.Name) ($size KB)  ->  public\assets\files\" -ForegroundColor Green
    $copied++
}
if ($copied -eq 0) {
    Write-Host "    WARN: brak PDF-ow do skopiowania" -ForegroundColor Yellow
}

Write-Host "`nGotowe! PDF-y w: $outDir" -ForegroundColor Green
Write-Host "        Kopia w: $publicFilesDir" -ForegroundColor Green
