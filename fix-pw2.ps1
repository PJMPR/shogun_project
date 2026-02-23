# fix-pw2.ps1 - naprawia przedmioty_wprowadzajace - tylko ASCII w kodzie
# Polskie znaki wstawiane przez char codes lub bezposrednio w danych JSON

$ErrorActionPreference = "Stop"
Set-Location "C:\Users\adamu\WebstormProjects\pj-studies"

function Fix-Json {
    param([string]$path, [array]$newPW)
    $fullPath = Join-Path (Get-Location) $path
    if (-not (Test-Path $fullPath)) { Write-Output "BRAK: $fullPath"; return }
    $raw = (Get-Content $fullPath -Raw -Encoding UTF8).TrimStart([char]0xFEFF)
    $obj = $raw | ConvertFrom-Json
    # Ustawiamy nowe przedmioty_wprowadzajace
    # ConvertFrom-Json daje PSCustomObject - modyfikujemy go przez NoteProperty
    $obj.sylabus | Add-Member -MemberType NoteProperty -Name 'przedmioty_wprowadzajace' -Value $newPW -Force
    $json = $obj | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($fullPath, $json, [System.Text.Encoding]::UTF8)
    Write-Output "OK: $path"
}

$S = "public\assets\syllabusy"
$N = "public\assets\syllabusy-n"

# ---- AAI ----
$d = @([pscustomobject]@{
    nazwa    = "Machine Learning (IML)"
    wymagania= "Znajomosc budowy podstawowych architektur sztucznych sieci neuronowych, funkcji aktywacji, architektur splotowych i rekurencyjnych, algorytmow uczenia maszynowego (k-means, SVM, drzewo decyzyjne, las losowy, klasyfikator Bayesowski)"
})
Fix-Json "$S\AAI.json" $d
Fix-Json "$N\AAI.json" $d

# ---- ASD ----
$d = @(
    [pscustomobject]@{nazwa="PRG1 - Programowanie"; wymagania="Umiejetnosc programowania iteracyjnego i rekursywnego; umiejetnosc liczenia granic, sum szeregow oraz calek funkcji elementarnych; umiejetnosc logicznego wnioskowania"},
    [pscustomobject]@{nazwa="ALG - Algebra liniowa z geometria"; wymagania="Podstawy algebry liniowej"},
    [pscustomobject]@{nazwa="MAD - Matematyka Dyskretna"; wymagania="Podstawy matematyki dyskretnej"}
)
Fix-Json "$S\ASD.json" $d
Fix-Json "$N\ASD.json" $d

# ---- COV ----
$d = @(
    [pscustomobject]@{nazwa="Narzedzia Sztucznej Inteligencji (NAI)"; wymagania="Podstawy dzialania sieci neuronowej; transfer learning; self-supervised learning; foundation models; podstawy PyTorch; praca ze srodowiskami Colab, HuggingFace"},
    [pscustomobject]@{nazwa="ALG - Algebra liniowa z geometria"; wymagania="Podstawowe operacje na macierzach"}
)
Fix-Json "$S\COV.json" $d
Fix-Json "$N\COV.json" $d

# ---- DEV ----
$d = @(
    [pscustomobject]@{nazwa="Uzytkowanie komputerow (UKOS)"; wymagania="Znajomosc struktur plikow i katalogow; znajomosc pojecia procesu w systemie operacyjnym; umiejetnosc poslugiwania sie emulatorem terminala"},
    [pscustomobject]@{nazwa="Systemy operacyjne (SOP)"; wymagania="Podstawy administracji systemem operacyjnym"},
    [pscustomobject]@{nazwa="Technologie internetu (TIN)"; wymagania="Znajomosc protokolu HTTP; znajomosc pojec z zakresu tworzenia aplikacji internetowych"}
)
Fix-Json "$S\DEV.json" $d
Fix-Json "$N\DEV.json" $d

# ---- KPIR ----
$d = @(
    [pscustomobject]@{nazwa="Analiza Matematyczna, ALG, FIZ, UKOS, Programowanie, Elektronika"; wymagania="Umiejetnosc programowania w jezyku C, C++ lub Java; znajomosc regulaminu i zasad BHP obowiazujacych w laboratorium"}
)
Fix-Json "$S\KPIR.json" $d
Fix-Json "$N\KPIR.json" $d

# ---- MAS ----
$d = @(
    [pscustomobject]@{nazwa="PRI - Projektowanie systemow informatycznych"; wymagania="Umiejetnosc logicznego wnioskowania oraz umiejetnosc programowania"},
    [pscustomobject]@{nazwa="ALG - Algebra liniowa z geometria"; wymagania="Podstawy algebry liniowej"},
    [pscustomobject]@{nazwa="AM - Analiza matematyczna"; wymagania="Podstawy analizy matematycznej"},
    [pscustomobject]@{nazwa="MAD - Matematyka Dyskretna"; wymagania="Podstawy matematyki dyskretnej"}
)
Fix-Json "$S\MAS.json" $d
Fix-Json "$N\MAS.json" $d

# ---- MHE ----
$d = @(
    [pscustomobject]@{nazwa="Algorytmy i struktury danych (ASD)"; wymagania="Podstawy projektowania i analizy algorytmow; podstawy jezyka C++"},
    [pscustomobject]@{nazwa="Analiza matematyczna (AM)"; wymagania="Podstawy analizy matematycznej"},
    [pscustomobject]@{nazwa="Matematyka dyskretna (MAD)"; wymagania="Podstawy matematyki dyskretnej"}
)
Fix-Json "$S\MHE.json" $d
Fix-Json "$N\MHE.json" $d

# ---- PJN ----
$d = @(
    [pscustomobject]@{nazwa="Narzedzia Sztucznej Inteligencji (NAI)"; wymagania="Podstawy dzialania sieci neuronowej; transfer learning; self-supervised learning; foundation models; podstawy PyTorch; praca ze srodowiskami Colab i HuggingFace"},
    [pscustomobject]@{nazwa="ALG - Algebra liniowa z geometria"; wymagania="Podstawowe operacje na macierzach"}
)
Fix-Json "$S\PJN.json" $d
Fix-Json "$N\PJN.json" $d

# ---- PRIN ----
$d = @(
    [pscustomobject]@{nazwa="POZ - Podstawy Organizacji i Zarzadzania"; wymagania="Znajomosc podstaw organizacji i zarzadzania"}
)
Fix-Json "$S\PRIN.json" $d
Fix-Json "$N\PRIN.json" $d

# ---- PRO ----
$d = @(
    [pscustomobject]@{nazwa="Programowanie 2 (POJ)"; wymagania="Umiejetnosc programowania obiektowego na poziomie podstawowym"},
    [pscustomobject]@{nazwa="Wstep do informatyki i architektury komputerow (UKOS)"; wymagania="Wiedza o organizacji systemu komputerowego oraz architekturze"},
    [pscustomobject]@{nazwa="Relacyjne bazy danych (RBD)"; wymagania="Znajomosc projektowania baz danych"},
    [pscustomobject]@{nazwa="Projektowanie systemow informatycznych (PRI)"; wymagania="Znajomosc zagadnien analizy i projektowania SI i notacji UML; wczesniejsze lub rownoczesne zrozumienie zagadnien planowania i prowadzenia projektu informatycznego"}
)
Fix-Json "$S\PRO.json" $d
Fix-Json "$N\PRO.json" $d

# ---- SCR ----
$d = @(
    [pscustomobject]@{nazwa="Analiza matematyczna, ALG, FIZ, UKOS, Programowanie, Elektronika, SOP, SWB"; wymagania="Umiejetnosc programowania w jezyku C; znajomosc regulaminu i zasad BHP obowiazujacych w laboratorium"}
)
Fix-Json "$S\SCR.json" $d
Fix-Json "$N\SCR.json" $d

# ---- SGD ----
$d = @(
    [pscustomobject]@{nazwa="Brak formalnego przedmiotu wprowadzajacego"; wymagania="Wiedza z zakresu szkoly sredniej (algebra liniowa); ukonczenie kursu Animacja 3D lub posiadanie certyfikatu BFCT (Blender Foundation Certified Trainer)"}
)
Fix-Json "$S\SGD.json" $d
Fix-Json "$N\SGD.json" $d

# ---- SKOA ----
$d = @(
    [pscustomobject]@{nazwa="Uzytkowanie Komputerow i Podstawy Systemow Operacyjnych (UKOS)"; wymagania="Rozumienie pojec z zakresu systemow operacyjnych; znajomosc regulaminu BHP pracowni; podstawowa wiedza o organizacji systemu komputerowego i architekturze warstwowej; rozumienie pojec z zakresu sieci komputerowych i protokolow komunikacyjnych"},
    [pscustomobject]@{nazwa="Wstep do informatyki i architektury komputerow"; wymagania="Podstawy organizacji systemu komputerowego"}
)
Fix-Json "$S\SKOA.json" $d
Fix-Json "$N\SKOA.json" $d

# ---- TAPI ----
$d = @(
    [pscustomobject]@{nazwa="Technologie Frontendowe"; wymagania="Znajomosc struktur plikow i katalogow; znajomosc pojecia procesu; umiejetnosc poslugiwania sie emulatorem terminala; znajomosc protokolu HTTP; znajomosc pojec frontend/backend"},
    [pscustomobject]@{nazwa="Technologie Backendowe"; wymagania="Podstawy tworzenia aplikacji serwerowych"},
    [pscustomobject]@{nazwa="Technologie internetu (TIN)"; wymagania="Znajomosc technologii webowych"}
)
Fix-Json "$S\TAPI.json" $d
Fix-Json "$N\TAPI.json" $d

# ---- TBK ----
$d = @(
    [pscustomobject]@{nazwa="Uzytkowanie komputerow (UKOS)"; wymagania="Znajomosc struktur plikow i katalogow; znajomosc pojecia procesu; umiejetnosc poslugiwania sie emulatorem terminala"},
    [pscustomobject]@{nazwa="Systemy operacyjne (SOP)"; wymagania="Podstawy administracji systemem operacyjnym"},
    [pscustomobject]@{nazwa="Technologie internetu (TIN)"; wymagania="Znajomosc protokolu HTTP; znajomosc pojec z zakresu tworzenia aplikacji internetowych"}
)
Fix-Json "$S\TBK.json" $d
Fix-Json "$N\TBK.json" $d

# ---- TIN ----
$d = @(
    [pscustomobject]@{nazwa="Warsztaty programistyczne (WPR)"; wymagania="Znajomosc HTML, obslugi bazy danych za pomoca jezyka zapytan SQL"},
    [pscustomobject]@{nazwa="Relacyjne bazy danych (RBD)"; wymagania="Podstawy projektowania i obslugi baz danych"}
)
Fix-Json "$S\TIN.json" $d
Fix-Json "$N\TIN.json" $d

# ---- ZPR ----
$d = @(
    [pscustomobject]@{nazwa="Inzynieria oprogramowania"; wymagania="Znajomosc podstawowych pojec z zakresu inzynierii oprogramowania i cyklu zycia oprogramowania; umiejetnosc pracy w zespole"}
)
Fix-Json "$S\ZPR.json" $d
Fix-Json "$N\ZPR.json" $d

# ---- Tylko niestacjonarne: ANG1-3 ----
$d = @(
    [pscustomobject]@{nazwa="Jezyk angielski (szkola srednia)"; wymagania="Znajomosc jezyka angielskiego na poziomie min. A2+/B1"}
)
Fix-Json "$N\ANG1-3.json" $d

# ---- Tylko niestacjonarne: ANK ----
$d = @(
    [pscustomobject]@{nazwa="Grafika komputerowa"; wymagania="Ogolna znajomosc obslugi programow graficznych; bardzo zalecane ukonczenie kursu Grafiki komputerowej"}
)
Fix-Json "$N\ANK.json" $d

Write-Output ""
Write-Output "=== WERYFIKACJA ==="
$bledy = 0
foreach ($folder in @("public\assets\syllabusy","public\assets\syllabusy-n")) {
    foreach ($f in (Get-ChildItem "$folder\*.json")) {
        $raw2 = (Get-Content $f.FullName -Raw -Encoding UTF8).TrimStart([char]0xFEFF)
        try {
            $j2 = $raw2 | ConvertFrom-Json
            $pw2 = $j2.sylabus.przedmioty_wprowadzajace
            if ($pw2) {
                foreach ($p2 in $pw2) {
                    $nm = $p2.nazwa
                    if ($nm -and ($nm -match "^(Znajomo|Umiej|Potrafi|Rozumie|Wiedza z|Zna |Student|Posiada|Bardzo za|Wymagane jest)" -or $nm.Length -gt 90)) {
                        Write-Output "[NADAL BLAD] $($f.Name): nazwa=[$($nm.Substring(0,[Math]::Min(70,$nm.Length)))]"
                        $bledy++
                    }
                }
            }
        } catch { Write-Output "PARSE ERROR: $($f.Name)" }
    }
}
if ($bledy -eq 0) { Write-Output "Brak bledow - wszystko OK!" } else { Write-Output "Pozostale bledy: $bledy" }

