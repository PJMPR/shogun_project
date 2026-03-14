# build-program.ps1
# Generuje program_stacjonarne.pdf i program_niestacjonarne.pdf
# Wzorowany na build-all-syllabi.ps1

$MIKTEX_BIN = "C:\Users\adamu\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
$env:PATH   = "$MIKTEX_BIN;$env:PATH"

$root   = $PSScriptRoot
$outDir = "$root\output"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# 1) Wygeneruj pliki .tex z JSON
Write-Host "==> Generowanie plikow .tex..." -ForegroundColor Cyan
node "$root\generate-tex.mjs"
if ($LASTEXITCODE -ne 0) { Write-Error "Blad generate-tex.mjs"; exit 1 }
Write-Host "    OK" -ForegroundColor Green

function Compile-Tex([string]$texFile, [string]$outD) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($texFile)
    Write-Host "`n==> Kompilacja: $name" -ForegroundColor Cyan

    # pdflatex rozwiazuje sciezki wzgledem CWD, nie lokalizacji pliku .tex.
    # Wchodzimy do katalogu z plikiem .tex, zeby ../latex/... dzialalo poprawnie.
    $prevLocation = Get-Location
    Set-Location (Split-Path $texFile -Parent)
    $texFileName = Split-Path $texFile -Leaf

    for ($i = 1; $i -le 2; $i++) {
        $result = & "$MIKTEX_BIN\pdflatex.exe" `
            -interaction=nonstopmode `
            -halt-on-error `
            "-output-directory=$outD" `
            "$texFileName" 2>&1

        if ($LASTEXITCODE -ne 0) {
            Set-Location $prevLocation
            Write-Host "    BLAD (przebieg $i):" -ForegroundColor Red
            $result | Select-String "^!" | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
            return $false
        }
    }

    Set-Location $prevLocation

    # Sprzatanie
    foreach ($ext in @("aux","log","out","toc","lof","lot")) {
        $f = "$outD\$name.$ext"
        if (Test-Path $f) { Remove-Item $f -Force }
    }

    $pdf = "$outD\$name.pdf"
    if (Test-Path $pdf) {
        $size = [math]::Round((Get-Item $pdf).Length / 1KB, 1)
        Write-Host "    OK: $name.pdf ($size KB)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "    BLAD: brak $name.pdf" -ForegroundColor Red
        return $false
    }
}

# 2) Kompiluj
Compile-Tex "$root\program_stacjonarne.tex"    $outDir
Compile-Tex "$root\program_niestacjonarne.tex" $outDir

# 3) Kopiuj PDF-y do public/assets/files
$publicFilesDir = "$root\..\public\assets\files"
New-Item -ItemType Directory -Force -Path $publicFilesDir | Out-Null

Write-Host "`n==> Kopiowanie PDF-ow do public\assets\files..." -ForegroundColor Cyan
$copied = 0
Get-ChildItem "$outDir\*.pdf" | ForEach-Object {
    $dest = "$publicFilesDir\$($_.Name)"
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
