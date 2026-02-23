# fix-pw.ps1 - naprawia przedmioty_wprowadzajace we wszystkich blednych JSON
Set-Location "C:\Users\adamu\WebstormProjects\pj-studies"

function Fix-Json {
    param([string]$path, [array]$newPW)
    if (-not (Test-Path $path)) { Write-Host "BRAK: $path" -ForegroundColor Yellow; return }
    $raw = (Get-Content $path -Raw -Encoding UTF8).TrimStart([char]0xFEFF)
    $obj = $raw | ConvertFrom-Json
    $obj.sylabus.przedmioty_wprowadzajace = $newPW
    $json = $obj | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText((Get-Item $path).FullName, $json, [System.Text.Encoding]::UTF8)
    Write-Host "OK: $path (n=$($newPW.Count))" -ForegroundColor Green
}

$s = "public\assets\syllabusy"
$n = "public\assets\syllabusy-n"

# ---- AAI (juz naprawiony recznie, ale upewnij sie) ----
$fix = @(
    [PSCustomObject]@{nazwa="Machine Learning (IML)";wymagania="Znajomosc budowy podstawowych architektur sztucznych sieci neuronowych; znajomosc podstawowych funkcji aktywacji; znajomosc podstawowych architektur splotowych i rekurencyjnych sieci neuronowych; znajomosc wybranych algorytmow uczenia maszynowego (k-means, SVM, drzewo decyzyjne, las losowy, klasyfikator Bayesowski)"}
)
Fix-Json "$s\AAI.json" $fix
Fix-Json "$n\AAI.json" $fix

# ---- ASD ----
$fix = @(
    [PSCustomObject]@{nazwa="PRG1 – Programowanie";wymagania="Umieje tnosc programowania iteracyjnego i rekursywnego; umieje tnosc liczenia granic, sum szerego w oraz calek funkcji elementarnych; umieje tnosc logicznego wnioskowania"},
    [PSCustomObject]@{nazwa="ALG – Algebra liniowa z geometria ";wymagania="Podstawy algebry liniowej"},
    [PSCustomObject]@{nazwa="MAD – Matematyka Dyskretna";wymagania="Podstawy matematyki dyskretnej"}
)
Fix-Json "$s\ASD.json" $fix
Fix-Json "$n\ASD.json" $fix

# ---- COV ----
$fix = @(
    [PSCustomObject]@{nazwa="Narze dzia Sztucznej Inteligencji (NAI)";wymagania="Podstawy działania sieci neuronowej; transfer learning; self-supervised learning; foundation models; podstawy pracy w PyTorchu; praca ze srodowiskami Colab i HuggingFace; metryki uczenia maszynowego"},
    [PSCustomObject]@{nazwa="ALG – Algebra liniowa z geometria ";wymagania="Podstawowe operacje na macierzach"}
)
Fix-Json "$s\COV.json" $fix
Fix-Json "$n\COV.json" $fix

# ---- DEV ----
$fix = @(
    [PSCustomObject]@{nazwa="Uz ytkowanie komputero w (UKOS)";wymagania="Znajomość struktur pliko w i katalogow; znajomość poje cia procesu w systemie operacyjnym; umieje tność posługiwania sie emulatorem terminala"},
    [PSCustomObject]@{nazwa="Systemy operacyjne (SOP)";wymagania="Podstawy administracji systemem operacyjnym"},
    [PSCustomObject]@{nazwa="Technologie internetu (TIN)";wymagania="Znajomość protokołu HTTP; znajomość pojęć z zakresu tworzenia aplikacji internetowych"}
)
Fix-Json "$s\DEV.json" $fix
Fix-Json "$n\DEV.json" $fix

# ---- KPIR ----
$fix = @(
    [PSCustomObject]@{nazwa="Analiza Matematyczna, ALG, FIZ, UKOS, Programowanie, Elektronika";wymagania="Umiejętność programowania w języku C, C++ lub Java; znajomość regulaminu i zasad BHP obowiązujących w laboratorium"}
)
Fix-Json "$s\KPIR.json" $fix
Fix-Json "$n\KPIR.json" $fix

# ---- MAS ----
$fix = @(
    [PSCustomObject]@{nazwa="PRI – Projektowanie systemów informatycznych";wymagania="Umiejętność logicznego wnioskowania oraz umiejętność programowania"},
    [PSCustomObject]@{nazwa="ALG – Algebra liniowa z geometrią";wymagania="Podstawy algebry liniowej"},
    [PSCustomObject]@{nazwa="AM – Analiza matematyczna";wymagania="Podstawy analizy matematycznej"},
    [PSCustomObject]@{nazwa="MAD – Matematyka Dyskretna";wymagania="Podstawy matematyki dyskretnej"}
)
Fix-Json "$s\MAS.json" $fix
Fix-Json "$n\MAS.json" $fix

# ---- MHE ----
$fix = @(
    [PSCustomObject]@{nazwa="Algorytmy i struktury danych (ASD)";wymagania="Podstawy projektowania i analizy algorytmów; podstawy języka C++"},
    [PSCustomObject]@{nazwa="Analiza matematyczna (AM)";wymagania="Podstawy analizy matematycznej"},
    [PSCustomObject]@{nazwa="Matematyka dyskretna (MAD)";wymagania="Podstawy matematyki dyskretnej"}
)
Fix-Json "$s\MHE.json" $fix
Fix-Json "$n\MHE.json" $fix

# ---- PJN ----
$fix = @(
    [PSCustomObject]@{nazwa="Narzędzia Sztucznej Inteligencji (NAI)";wymagania="Podstawy działania sieci neuronowej; transfer learning; self-supervised learning; foundation models; podstawy pracy w PyTorchu; praca ze środowiskami Colab i HuggingFace"},
    [PSCustomObject]@{nazwa="ALG – Algebra liniowa z geometrią";wymagania="Podstawowe operacje na macierzach"}
)
Fix-Json "$s\PJN.json" $fix
Fix-Json "$n\PJN.json" $fix

# ---- PRIN ----
$fix = @(
    [PSCustomObject]@{nazwa="POZ – Podstawy Organizacji i Zarządzania";wymagania="Znajomość podstaw organizacji i zarządzania"}
)
Fix-Json "$s\PRIN.json" $fix
Fix-Json "$n\PRIN.json" $fix

# ---- PRO ----
$fix = @(
    [PSCustomObject]@{nazwa="Programowanie 2 (POJ)";wymagania="Umiejętność programowania obiektowego na poziomie podstawowym"},
    [PSCustomObject]@{nazwa="Wstęp do informatyki i architektury komputerów (UKOS)";wymagania="Wiedza o organizacji systemu komputerowego oraz architekturze"},
    [PSCustomObject]@{nazwa="Relacyjne bazy danych (RBD)";wymagania="Znajomość projektowania baz danych"},
    [PSCustomObject]@{nazwa="Projektowanie systemów informacyjnych (PRI)";wymagania="Znajomość zagadnień analizy i projektowania SI i notacji UML; wcześniejsze lub równoczesne zrozumienie zagadnień planowania i prowadzenia projektu informatycznego"}
)
Fix-Json "$s\PRO.json" $fix
Fix-Json "$n\PRO.json" $fix

# ---- SCR ----
$fix = @(
    [PSCustomObject]@{nazwa="Analiza matematyczna, ALG, FIZ, UKOS, Programowanie, Elektronika, SOP, SWB";wymagania="Umiejętność programowania w języku C; znajomość regulaminu i zasad BHP obowiązujących w laboratorium"}
)
Fix-Json "$s\SCR.json" $fix
Fix-Json "$n\SCR.json" $fix

# ---- SGD ----
$fix = @(
    [PSCustomObject]@{nazwa="Brak formalnego przedmiotu wprowadzającego";wymagania="Wiedza z zakresu szkoły średniej (algebra liniowa); ukończenie kursu Animacja 3D lub posiadanie certyfikatu BFCT"}
)
Fix-Json "$s\SGD.json" $fix
Fix-Json "$n\SGD.json" $fix

# ---- SKOA ----
$fix = @(
    [PSCustomObject]@{nazwa="Użytkowanie Komputerów i Podstawy Systemów Operacyjnych (UKOS)";wymagania="Rozumienie pojęć z zakresu systemów operacyjnych; znajomość regulaminu BHP pracowni; podstawowa wiedza o organizacji systemu komputerowego; rozumienie pojęć z zakresu sieci komputerowych i protokołów komunikacyjnych"},
    [PSCustomObject]@{nazwa="Wstęp do informatyki i architektury komputerów";wymagania="Podstawy organizacji systemu komputerowego"}
)
Fix-Json "$s\SKOA.json" $fix
Fix-Json "$n\SKOA.json" $fix

# ---- TAPI ----
$fix = @(
    [PSCustomObject]@{nazwa="Technologie Frontendowe";wymagania="Znajomość struktur plików i katalogów; znajomość pojęcia procesu; umiejętność posługiwania się emulatorem terminala; znajomość protokołu HTTP; znajomość pojęć frontend/backend"},
    [PSCustomObject]@{nazwa="Technologie Backendowe";wymagania="Podstawy tworzenia aplikacji serwerowych"},
    [PSCustomObject]@{nazwa="Technologie internetu (TIN)";wymagania="Znajomość technologii webowych"}
)
Fix-Json "$s\TAPI.json" $fix
Fix-Json "$n\TAPI.json" $fix

# ---- TBK ----
$fix = @(
    [PSCustomObject]@{nazwa="Użytkowanie komputerów (UKOS)";wymagania="Znajomość struktur plików i katalogów; znajomość pojęcia procesu; umiejętność posługiwania się emulatorem terminala"},
    [PSCustomObject]@{nazwa="Systemy operacyjne (SOP)";wymagania="Podstawy administracji systemem operacyjnym"},
    [PSCustomObject]@{nazwa="Technologie internetu (TIN)";wymagania="Znajomość protokołu HTTP; znajomość pojęć z zakresu tworzenia aplikacji internetowych"}
)
Fix-Json "$s\TBK.json" $fix
Fix-Json "$n\TBK.json" $fix

# ---- TIN ----
$fix = @(
    [PSCustomObject]@{nazwa="Warsztaty programistyczne (WPR)";wymagania="Znajomość HTML, obsługi bazy danych za pomocą języka zapytań SQL"},
    [PSCustomObject]@{nazwa="Relacyjne bazy danych (RBD)";wymagania="Podstawy projektowania i obsługi baz danych"}
)
Fix-Json "$s\TIN.json" $fix
Fix-Json "$n\TIN.json" $fix

# ---- ZPR ----
$fix = @(
    [PSCustomObject]@{nazwa="Inżynieria oprogramowania";wymagania="Znajomość podstawowych pojęć z zakresu inżynierii oprogramowania i cyklu życia oprogramowania; umiejętność pracy w zespole"}
)
Fix-Json "$s\ZPR.json" $fix
Fix-Json "$n\ZPR.json" $fix

# ---- Tylko niestacjonarne: ANG1-3 ----
$fix = @(
    [PSCustomObject]@{nazwa="Język angielski (szkoła średnia)";wymagania="Znajomość języka angielskiego na poziomie min. A2+/B1"}
)
Fix-Json "$n\ANG1-3.json" $fix

# ---- Tylko niestacjonarne: ANK ----
$fix = @(
    [PSCustomObject]@{nazwa="Grafika komputerowa";wymagania="Ogólna znajomość obsługi programów graficznych; bardzo zalecane ukończenie kursu Grafiki komputerowej"}
)
Fix-Json "$n\ANK.json" $fix

Write-Host "`n===== WERYFIKACJA =====" -ForegroundColor Cyan
$folders2 = @("public\assets\syllabusy", "public\assets\syllabusy-n")
$bledy = 0
foreach ($folder2 in $folders2) {
    $files2 = Get-ChildItem "$folder2\*.json"
    foreach ($f2 in $files2) {
        $raw2 = (Get-Content $f2.FullName -Raw -Encoding UTF8).TrimStart([char]0xFEFF)
        try {
            $json2 = $raw2 | ConvertFrom-Json
            $pw2 = $json2.sylabus.przedmioty_wprowadzajace
            if ($pw2 -and $pw2.Count -gt 0) {
                foreach ($p2 in $pw2) {
                    if ($p2.nazwa -match "^(Znajomo|Umiej|Potrafi|Rozumie|Wiedza z|Zna |Student|Posiada|Bardzo za|Wymagane jest)" -or ($p2.nazwa -and $p2.nazwa.Length -gt 90)) {
                        Write-Host "  [NADAL BLAD] $($f2.Name): nazwa=`"$($p2.nazwa.Substring(0,[Math]::Min(70,$p2.nazwa.Length)))`"" -ForegroundColor Red
                        $bledy++
                    }
                }
            }
        } catch {}
    }
}
if ($bledy -eq 0) { Write-Host "Brak bledow - wszystko OK!" -ForegroundColor Green }
else { Write-Host "Pozostale bledy: $bledy" -ForegroundColor Yellow }

