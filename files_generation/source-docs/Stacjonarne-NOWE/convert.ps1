Add-Type -AssemblyName System.IO.Compression.FileSystem

$inputDir = $PSScriptRoot
$outputDir = "$PSScriptRoot\json"
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

function Get-DocxLines($path) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    $entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xml = $reader.ReadToEnd()
    $reader.Close()
    $zip.Dispose()
    $doc = [xml]$xml
    $nsm = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
    $nsm.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
    $pars = $doc.SelectNodes("//w:p", $nsm)
    # zwracamy zwykla tablice PS - nie List[string]
    $lines = @()
    foreach ($p in $pars) {
        $t = $p.SelectNodes(".//w:t", $nsm)
        $line = ($t | ForEach-Object { $_.'#text' }) -join ""
        $lines += $line
    }
    return ,$lines
}

function FindIdx($lines, $pat, $from) {
    if ($null -eq $from) { $from = 0 }
    for ($i = [int]$from; $i -lt $lines.Length; $i++) {
        if (([string]$lines[$i]) -match $pat) { return $i }
    }
    return -1
}

function NextNE($lines, $from) {
    for ($i = [int]$from; $i -lt $lines.Length; $i++) {
        $v = ([string]$lines[$i]).Trim()
        if ($v -ne '') { return $v }
    }
    return ""
}

function CollectUntil($lines, $from, $stops) {
    $r = @()
    for ($i = [int]$from; $i -lt $lines.Length; $i++) {
        $ln = ([string]$lines[$i]).Trim()
        $stop = $false
        foreach ($s in $stops) { if ($ln -match $s) { $stop = $true; break } }
        if ($stop) { break }
        if ($ln -ne '') { $r += $ln }
    }
    return $r
}

function ParseDoc($lines) {
    $out = [ordered]@{}
    $n = $lines.Length

    # nazwa - szukamy po "Nazwa przedmiotu:"
    $out.nazwa_przedmiotu = ""
    $npi = FindIdx $lines 'Nazwa przedmiotu' 0
    if ($npi -ge 0) {
        $sameLine = ($lines[$npi] -replace 'Nazwa przedmiotu\s*:?\s*', '').Trim()
        if ($sameLine -ne '') {
            $out.nazwa_przedmiotu = $sameLine
        } else {
            $out.nazwa_przedmiotu = NextNE $lines ($npi + 1)
        }
    } else {
        for ($i = 0; $i -lt [Math]::Min(15, $n); $i++) {
            $ln = $lines[$i].Trim()
            if ($ln -ne '' -and $ln -notmatch 'Polsko-Japo|Kierunek|Profil|Tryb|Wersja') {
                $out.nazwa_przedmiotu = $ln; break
            }
        }
    }

    # kod
    $ki = FindIdx $lines 'Kod przedmiotu' 0
    $out.kod_przedmiotu = ""
    if ($ki -ge 0) {
        $v = NextNE $lines ($ki + 1)
        if ($v -notmatch 'Rok') { $out.kod_przedmiotu = $v }
    }

    # rok
    $ri = FindIdx $lines 'Rok studi' 0
    $out.rok_studiow = $null
    if ($ri -ge 0 -and $lines[$ri] -match 'Rok studi\S*\s*:\s*(.+)') {
        $v = $Matches[1].Trim()
        $num = 0
        if ([int]::TryParse($v, [ref]$num)) { $out.rok_studiow = $num }
        elseif ($v -eq 'I')   { $out.rok_studiow = 1 }
        elseif ($v -eq 'II')  { $out.rok_studiow = 2 }
        elseif ($v -eq 'III') { $out.rok_studiow = 3 }
        elseif ($v -eq 'IV')  { $out.rok_studiow = 4 }
    }

    # semestr
    $si = FindIdx $lines 'Semestr studi' 0
    $out.semestr_studiow = $null
    if ($si -ge 0 -and $lines[$si] -match 'Semestr studi\S*\s*:\s*(\S+)') {
        $v = $Matches[1].Trim()
        $num = 0
        if ([int]::TryParse($v, [ref]$num)) { $out.semestr_studiow = $num }
        elseif ($v -eq 'I')    { $out.semestr_studiow = 1 }
        elseif ($v -eq 'II')   { $out.semestr_studiow = 2 }
        elseif ($v -eq 'III')  { $out.semestr_studiow = 3 }
        elseif ($v -eq 'IV')   { $out.semestr_studiow = 4 }
        elseif ($v -eq 'V')    { $out.semestr_studiow = 5 }
        elseif ($v -eq 'VI')   { $out.semestr_studiow = 6 }
        elseif ($v -eq 'VII')  { $out.semestr_studiow = 7 }
    }

    # obligatoryjny
    $oi = FindIdx $lines 'obligatoryjn|obieraln' 0
    $out.obligatoryjny = $true
    if ($oi -ge 0) { $out.obligatoryjny = ($lines[$oi] -notmatch 'obieraln') }

    # godziny zajec
    $fi = FindIdx $lines 'Forma i liczba godzin' 0
    $wykl = $null; $cwicz = $null; $lab = $null
    if ($fi -ge 0) {
        $hasW = $false; $hasC = $false; $hasL = $false
        $nums = @()
        for ($i = $fi + 1; $i -lt [Math]::Min($fi + 18, $n); $i++) {
            $ln = $lines[$i].Trim()
            if     ($ln -match '^Wyk')                   { $hasW = $true }
            elseif ($ln -match 'wiczeni|Lektora|Seminar') { $hasC = $true }
            elseif ($ln -match '^Labor|^Proj')            { $hasL = $true }
            elseif ($ln -match '^\d+$')                   { $nums += [int]$ln }
            elseif ($ln -match 'Odpow')                   { break }
        }
        $ni = 0
        if ($hasW -and $ni -lt $nums.Count) { $wykl  = $nums[$ni]; $ni++ }
        if ($hasC -and $ni -lt $nums.Count) { $cwicz = $nums[$ni]; $ni++ }
        if ($hasL -and $ni -lt $nums.Count) { $lab   = $nums[$ni]; $ni++ }
        if (-not $hasW -and -not $hasC -and -not $hasL) {
            if ($nums.Count -ge 1) { $wykl  = $nums[0] }
            if ($nums.Count -ge 2) { $cwicz = $nums[1] }
            if ($nums.Count -ge 3) { $lab   = $nums[2] }
        }
    }
    $out.forma_i_liczba_godzin_zajec = [ordered]@{
        wyklady = $wykl
        cwiczenia_lektorat_seminarium = $cwicz
        laboratorium_projekt = $lab
    }

    # odpowiedzialny
    $ai = FindIdx $lines 'Odpow' 0
    $out.odpowiedzialny_za_przedmiot = ""
    if ($ai -ge 0) { $out.odpowiedzialny_za_przedmiot = NextNE $lines ($ai + 1) }

    # ECTS
    $ei = FindIdx $lines 'punkt\S* ECTS' 0
    $out.ects = $null
    if ($ei -ge 0) {
        $ln = $lines[$ei]
        if ($ln -match ':\s*(\d+)') { $out.ects = [int]$Matches[1] }
        elseif ($ln -match '(\d+)\s*$') { $out.ects = [int]$Matches[1] }
    }

    # godziny ECTS
    $ui = FindIdx $lines 'udzia.em prowadz' 0
    $pi = FindIdx $lines 'prac. w' 0
    $ci = FindIdx $lines 'kowita liczba godzin' 0
    $gU = $null; $gP = $null; $gC = $null
    if ($ui -ge 0 -and $lines[$ui] -match '(\d+)\s*h') { $gU = [int]$Matches[1] }
    if ($pi -ge 0 -and $lines[$pi] -match '(\d+)\s*h') { $gP = [int]$Matches[1] }
    if ($ci -ge 0) {
        if ($lines[$ci] -match ':\s*(\d+)') { $gC = [int]$Matches[1] }
        elseif ($lines[$ci] -match '(\d+)\s*$') { $gC = [int]$Matches[1] }
    }
    $out.godziny = [ordered]@{
        z_udzialem_prowadzacego_h = $gU
        praca_wlasna_studenta_h = $gP
        calkowita_liczba_godzin_h = $gC
    }

    # metody dydaktyczne
    $mi = FindIdx $lines 'Metody dydaktyczne' 0
    $met = [ordered]@{}
    if ($mi -ge 0) {
        $stopM = @('Element przedmiotu', 'Kryteria oceny')
        $sec = $null
        $items = @()
        for ($i = $mi + 1; $i -lt $n; $i++) {
            $ln = ([string]$lines[$i]).Trim()
            $stop = $false
            foreach ($s in $stopM) { if ($ln -match $s) { $stop = $true; break } }
            if ($stop) {
                if ($null -ne $sec -and $items.Count -gt 0) { $met[$sec] = $items }
                break
            }
            if ($ln -match '^Wyk' -and $ln.Length -le 10) {
                if ($null -ne $sec -and $items.Count -gt 0) { $met[$sec] = $items }
                $sec = 'wyklad'; $items = @()
            } elseif ($ln -match 'wiczeni' -and $ln.Length -le 12) {
                if ($null -ne $sec -and $items.Count -gt 0) { $met[$sec] = $items }
                $sec = 'cwiczenia'; $items = @()
            } elseif ($ln -match '^Labor' -and $ln.Length -le 13) {
                if ($null -ne $sec -and $items.Count -gt 0) { $met[$sec] = $items }
                $sec = 'laboratorium'; $items = @()
            } elseif ($ln -match '^Lektor' -and $ln.Length -le 9) {
                if ($null -ne $sec -and $items.Count -gt 0) { $met[$sec] = $items }
                $sec = 'lektorat'; $items = @()
            } elseif ($ln -match '^Projekt' -and $ln.Length -le 8) {
                if ($null -ne $sec -and $items.Count -gt 0) { $met[$sec] = $items }
                $sec = 'projekt'; $items = @()
            } elseif ($ln -ne '' -and $null -ne $sec -and $ln -notmatch '^Forma i spos|^Spos.b zalicz') {
                $items += $ln
            }
        }
        if ($null -ne $sec -and $items.Count -gt 0) { $met[$sec] = $items }
    }
    $out.metody_dydaktyczne = $met

    # zaliczenie - szukamy sekcji "Element przedmiotu" + "Sposob zaliczenia"
    $emi = FindIdx $lines 'Element przedmiotu' 0
    $zal = [ordered]@{}
    if ($emi -ge 0) {
        $i = $emi + 1
        while ($i -lt $n) {
            $ln = $lines[$i].Trim()
            if ($ln -match 'Kryteria oceny|Tre.ci program|Cel dydakt|Efekty') { break }
            if ($ln -match '^Laboratorium$|wiczenia$|^Wyk.ad$|^Lektorat$|^Projekt$|^Seminarium$') {
                $j = $i + 1
                while ($j -lt $n -and $lines[$j].Trim() -eq '') { $j++ }
                if ($j -lt $n) {
                    $nxt = $lines[$j].Trim()
                    if ($nxt -match 'zaliczen|egzamin|Nieoceniany') {
                        $zal[$ln] = [ordered]@{ sposob = $nxt }
                        $i = $j + 1; continue
                    }
                }
            }
            $i++
        }
    }
    $out.zaliczenie = $zal

    # kryteria oceny - tylko tekst po sekcji "Kryteria oceny", pomijamy naglowki
    $kri = FindIdx $lines 'Kryteria oceny' 0
    $kryt = @()
    if ($kri -ge 0) {
        $stopK = @('Okre.lenie przedm', 'Cel dydakt', 'Literatura', 'Efekty kszta', 'Tre.ci program')
        for ($i = $kri + 1; $i -lt $n; $i++) {
            $ln = $lines[$i].Trim()
            $stop = $false
            foreach ($s in $stopK) { if ($ln -match $s) { $stop = $true; break } }
            if ($stop) { break }
            # pomijamy naglowki sekcji (kończące się ':'), tabele zaliczenia i metody
            if ($ln -match '^Laboratorium$|wiczenia$|^Wyk.ad$|^Lektorat$|^Projekt$|^Seminarium$') { continue }
            if ($ln -match '^Forma i spos|^Element przedm|^Spos.b zalicz') { continue }
            if ($ln -match '^Wyk.ad:\s*$|wiczenia:\s*$|^Laboratorium:\s*$|^Lektorat:\s*$|^Projekt:\s*$') { continue }
            if ($ln -match '^Zaliczenie z|^Egzamin|^Nieoceniany|^metoda proj|^praca w grup|^dyskusja$|^rozwiaz') { continue }
            if ($ln -match '^wyk.ad z prez|^Rozwiaz|^wyk.ad konw|^wyk.ad z prez') { continue }
            if ($ln -ne '') { $kryt += $ln }
        }
    }
    $out.kryteria_oceny = $kryt

    # przedmioty wprowadzajace
    $pwi = FindIdx $lines 'przedmiot.w wprowadzaj' 0
    $pw = @()
    if ($pwi -ge 0) {
        $stopP = @('Cel dydakt', 'Literatura', 'Efekty kszta', 'Tre.ci program', 'Metody')
        $ds = $pwi + 1
        while ($ds -lt $n -and $lines[$ds] -match 'Nazwa przedmiotu|Wymagane zagadn') { $ds++ }
        $i = $ds
        while ($i -lt $n) {
            $ln = $lines[$i].Trim()
            $stop = $false
            foreach ($s in $stopP) { if ($ln -match $s) { $stop = $true; break } }
            if ($stop) { break }
            if ($ln -ne '') {
                $j = $i + 1
                while ($j -lt $n -and $lines[$j].Trim() -eq '') { $j++ }
                $req = ""
                if ($j -lt $n) {
                    $rln = $lines[$j].Trim()
                    $isStop = $false
                    foreach ($s in $stopP) { if ($rln -match $s) { $isStop = $true; break } }
                    if (-not $isStop -and $rln -notmatch 'Okre.lenie|Nazwa przedmiotu|Wymagane') {
                        $req = $rln; $i = $j + 1
                        $pw += [ordered]@{ nazwa = $ln; wymagania = $req }
                        continue
                    }
                }
                $pw += [ordered]@{ nazwa = $ln; wymagania = $req }
            }
            $i++
        }
    }
    $out.przedmioty_wprowadzajace = $pw

    # cel dydaktyczny
    $celi = FindIdx $lines 'Cel dydaktyczny' 0
    $out.cel_dydaktyczny = ""
    if ($celi -ge 0) {
        $stopC = @('Wykaz liter', 'Literatura podst', 'Efekty kszta', 'Tre.ci program')
        $cl = CollectUntil $lines ($celi + 1) $stopC
        $out.cel_dydaktyczny = ($cl -join " ").Trim()
    }

    # literatura
    $li = FindIdx $lines 'Wykaz literatury|Literatura podstawowa' 0
    $lPodst = @()
    $lUzup  = @()
    $lDoc   = [ordered]@{}
    if ($li -ge 0) {
        $stopL = @('Efekty kszta', 'Tre.ci program')
        $inP = $false; $inU = $false
        for ($i = $li; $i -lt $n; $i++) {
            $ln = $lines[$i].Trim()
            $stop = $false
            foreach ($s in $stopL) { if ($ln -match $s) { $stop = $true; break } }
            if ($stop) { break }
            if ($ln -match 'Literatura podstawowa|podstawowa .wymagana') { $inP = $true; $inU = $false; continue }
            if ($ln -match 'Literatura uzup') { $inP = $false; $inU = $true; continue }
            if ($ln -match 'Dokumentacja internetowa') { continue }
            if ($ln -ne '' -and $ln -notmatch 'Wykaz literatury') {
                if ($ln -match '(.+):\s*(https?://\S+)') {
                    $lDoc[($Matches[1]).Trim()] = ($Matches[2]).Trim()
                } elseif ($ln -match 'https?://\S+') {
                    $lDoc[$ln] = $ln
                } elseif ($inP) { $lPodst += $ln }
                elseif ($inU)   { $lUzup  += $ln }
            }
        }
    }
    $lit = [ordered]@{}
    if ($lPodst.Count -gt 0) { $lit.podstawowa = [ordered]@{ pozycje = $lPodst } }
    if ($lUzup.Count  -gt 0) { $lit.uzupelniajaca = [ordered]@{ pozycje = $lUzup } }
    if ($lDoc.Count   -gt 0) { $lit.dokumentacja_internetowa = $lDoc }
    $out.literatura = $lit

    # efekty ksztalcenia
    $efi = FindIdx $lines 'Efekty kszta' 0
    $wied = @(); $umie = @(); $komp = @()
    if ($efi -ge 0) {
        $cat = $null
        for ($i = $efi + 1; $i -lt $n; $i++) {
            $ln = $lines[$i].Trim()
            if ($ln -match 'Tre.ci program') { break }
            if      ($ln -match '^Wiedza\s*:')    { $cat = 'w'; continue }
            elseif  ($ln -match '^Umiej')         { $cat = 'u'; continue }
            elseif  ($ln -match '^Kompetencje')   { $cat = 'k'; continue }
            elseif ($ln -ne '') {
                if      ($cat -eq 'w') { $wied += $ln }
                elseif  ($cat -eq 'u') { $umie += $ln }
                elseif  ($cat -eq 'k') { $komp += $ln }
            }
        }
    }
    $out.efekty_ksztalcenia = [ordered]@{
        wiedza               = if ($wied.Count -gt 0) { $wied } else { $null }
        umiejetnosci         = if ($umie.Count -gt 0) { $umie } else { $null }
        kompetencje_spoleczne = if ($komp.Count -gt 0) { $komp } else { $null }
    }

    # tresci programowe
    $ti = FindIdx $lines 'Tre.ci program' 0
    $tr = @()
    if ($ti -ge 0) {
        for ($i = $ti + 1; $i -lt $n; $i++) {
            $ln = $lines[$i].Trim()
            if ($ln -ne '') { $tr += $ln }
        }
    }
    $out.tresci_programowe = $tr

    return $out
}

# MAIN
$files = Get-ChildItem -Path $inputDir -Filter "*.docx" | Where-Object { $_.Name -notlike "~*" }
$ok = 0; $err = 0

foreach ($f in $files) {
    $outName = $f.BaseName
    if ($outName -match '^(.+)st$')                        { $outName = $Matches[1] }
    elseif ($outName.Length -gt 3 -and $outName -match '^(.+)s$') { $outName = $Matches[1] }
    if ($f.Name -match 'ANG.*ANG1')    { $outName = 'ANG1-3' }
    elseif ($f.Name -match 'ANG.*LEK4\b') { $outName = 'LEK4-ANG' }
    elseif ($f.Name -match 'ANG.*LEK') { $outName = 'LEK1-4-ANG' }
    elseif ($f.Name -match 'MPRs\(1\)') { $outName = 'MPR2' }

    $outFile = Join-Path $outputDir "$outName.json"
    if ($outName -eq 'JAZ' -and (Test-Path $outFile)) {
        Write-Output "SKIP: $($f.Name)"
        $ok++; continue
    }

    try {
        $lines = Get-DocxLines $f.FullName
        $data  = ParseDoc $lines

        $result = [ordered]@{
            sylabus = [ordered]@{
                uczelnia                    = "Polsko-Japonska Akademia Technik Komputerowych Filia w Gdansku"
                jednostka                   = "Filia w Gdansku"
                kierunek                    = "INFORMATYKA"
                profil                      = "praktyczny"
                tryb_studiow                = "stacjonarny"
                wersja_z_dnia               = "15.02.2025"
                nazwa_przedmiotu            = $data.nazwa_przedmiotu
                kod_przedmiotu              = $data.kod_przedmiotu
                rok_studiow                 = $data.rok_studiow
                semestr_studiow             = $data.semestr_studiow
                obligatoryjny               = $data.obligatoryjny
                forma_i_liczba_godzin_zajec = $data.forma_i_liczba_godzin_zajec
                odpowiedzialny_za_przedmiot = $data.odpowiedzialny_za_przedmiot
                ects                        = $data.ects
                godziny                     = $data.godziny
                metody_dydaktyczne          = $data.metody_dydaktyczne
                zaliczenie                  = $data.zaliczenie
                kryteria_oceny              = $data.kryteria_oceny
                przedmioty_wprowadzajace    = $data.przedmioty_wprowadzajace
                cel_dydaktyczny             = $data.cel_dydaktyczny
                literatura                  = $data.literatura
                efekty_ksztalcenia          = $data.efekty_ksztalcenia
                tresci_programowe           = $data.tresci_programowe
            }
        }

        $json = $result | ConvertTo-Json -Depth 20
        # PS 5.1 escapes unicode - decode \uXXXX back to real UTF-8 chars
        $json = [System.Text.RegularExpressions.Regex]::Replace($json, '\\u([0-9a-fA-F]{4})', {
            param($m)
            [char][System.Convert]::ToInt32($m.Groups[1].Value, 16)
        })
        [System.IO.File]::WriteAllText($outFile, $json, [System.Text.Encoding]::UTF8)
        Write-Output "OK: $($f.Name) -> $outName.json"
        $ok++
    } catch {
        Write-Output "ERR: $($f.Name) -- $_"
        $err++
    }
}

Write-Output ""
Write-Output "Done: $ok OK, $err errors"

