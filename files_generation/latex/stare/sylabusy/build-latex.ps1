# build-latex.ps1
# Kompiluje pliki .tex z folderu syllabusy/ do PDF w folderze output/
# Użycie:
#   .\build-latex.ps1              – kompiluje wszystkie pliki .tex
#   .\build-latex.ps1 ASD          – kompiluje tylko ASD.tex
#   .\build-latex.ps1 ASD -open    – kompiluje i otwiera PDF

param(
    [string]$File = "",
    [switch]$Open
)

$MIKTEX_BIN = "C:\Users\adamu\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
$env:PATH = "$MIKTEX_BIN;$env:PATH"

$LATEX_DIR   = "$PSScriptRoot\syllabusy"
$OUTPUT_DIR  = "$PSScriptRoot\output"
$TEXINPUTS   = "$PSScriptRoot\szablony;;"

New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

function Compile-Tex($texFile) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($texFile)
    Write-Host "`n==> Kompilacja: $name.tex" -ForegroundColor Cyan

    # Dwukrotna kompilacja (dla referencji, TOC itp.)
    for ($i = 1; $i -le 2; $i++) {
        $result = & "$MIKTEX_BIN\pdflatex.exe" `
            -interaction=nonstopmode `
            -halt-on-error `
            -output-directory="$OUTPUT_DIR" `
            "$texFile" 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Host "BLAD kompilacji $name (przebieg $i):" -ForegroundColor Red
            $result | Select-String "^!" | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
            return $false
        }
    }

    # Sprzatanie plikow pomocniczych
    @("aux","log","out","toc","lof","lot","fls","fdb_latexmk") | ForEach-Object {
        $aux = "$OUTPUT_DIR\$name.$_"
        if (Test-Path $aux) { Remove-Item $aux -Force }
    }

    $pdf = "$OUTPUT_DIR\$name.pdf"
    if (Test-Path $pdf) {
        $size = [math]::Round((Get-Item $pdf).Length / 1KB, 1)
        Write-Host "OK: $name.pdf ($size KB)" -ForegroundColor Green
        return $true
    }
    return $false
}

# Wybor plikow do kompilacji
if ($File -ne "") {
    $texFiles = @("$LATEX_DIR\$File.tex")
    if (-not (Test-Path $texFiles[0])) {
        Write-Host "Nie znaleziono pliku: $texFiles[0]" -ForegroundColor Red
        exit 1
    }
} else {
    $texFiles = Get-ChildItem "$LATEX_DIR\*.tex" | Select-Object -ExpandProperty FullName
    if ($texFiles.Count -eq 0) {
        Write-Host "Brak plikow .tex w $LATEX_DIR" -ForegroundColor Yellow
        exit 0
    }
}

$ok = 0; $err = 0
foreach ($tex in $texFiles) {
    if (Compile-Tex $tex) { $ok++ } else { $err++ }
}

Write-Host "`n=== Podsumowanie: $ok OK, $err bledow ===" -ForegroundColor $(if ($err -eq 0) {"Green"} else {"Yellow"})

# Otwieranie PDF po kompilacji
if ($Open -and $File -ne "") {
    $pdf = "$OUTPUT_DIR\$File.pdf"
    if (Test-Path $pdf) {
        Write-Host "Otwieram $pdf..." -ForegroundColor Cyan
        Start-Process $pdf
    }
}

