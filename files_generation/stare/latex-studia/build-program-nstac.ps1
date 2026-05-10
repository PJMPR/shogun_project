# build-program-nstac.ps1
# Generuje program_niestacjonarny_stary.pdf ze starego programu niestacjonarnego
# Dane JSON: public/assets/stary/nstac/

$MIKTEX_BIN = "C:\Users\aurbanow\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
$env:PATH   = "$MIKTEX_BIN;$env:PATH"

$root   = $PSScriptRoot
$outDir = "$root\output"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# 1) Wygeneruj plik .tex z JSON
Write-Host "==> Generowanie pliku .tex..." -ForegroundColor Cyan
node "$root\generate-tex-nstac.mjs"
if ($LASTEXITCODE -ne 0) { Write-Error "Blad generate-tex-nstac.mjs"; exit 1 }
Write-Host "    OK" -ForegroundColor Green

function Compile-Tex([string]$texFile, [string]$outD) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($texFile)
    Write-Host "`n==> Kompilacja: $name" -ForegroundColor Cyan

    for ($i = 1; $i -le 2; $i++) {
        $result = & "$MIKTEX_BIN\pdflatex.exe" `
            -interaction=nonstopmode `
            -halt-on-error `
            "-output-directory=$outD" `
            "$texFile" 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Host "    BLAD (przebieg $i):" -ForegroundColor Red
            $result | Select-String "^!" | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
            return $false
        }
    }

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
Compile-Tex "$root\program_niestacjonarny_stary.tex" $outDir

Write-Host "`nGotowe! PDF w: $outDir" -ForegroundColor Green
