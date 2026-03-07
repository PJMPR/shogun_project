# build-all-syllabi.ps1
# Generuje pliki TEX z JSON-ow sylabusow i kompiluje do PDF
# Uzycie:
#   .\build-all-syllabi.ps1         - kompiluje wszystkie
#   .\build-all-syllabi.ps1 -Mode s - tylko stacjonarne
#   .\build-all-syllabi.ps1 -Mode n - tylko niestacjonarne

param(
    [string]$Mode = "all",
    [string]$Codes = ""
)

# Parsuj Codes do tablicy (np. "PRZ1,PRZ2" lub "PRZ1 PRZ2")
$CodesArray = @()
if ($Codes -and $Codes.Trim() -ne "") {
    $CodesArray = $Codes -split '[,\s]+' | Where-Object { $_ -ne "" }
}

$MIKTEX_BIN = "C:\Users\adamu\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
$env:PATH   = "$MIKTEX_BIN;$env:PATH"

$SCRIPT_DIR = $PSScriptRoot
$PROJECT    = "C:\Users\adamu\WebstormProjects\pj-studies"
$ASSETS_S   = "$PROJECT\public\assets\syllabusy"
$ASSETS_N   = "$PROJECT\public\assets\syllabusy-n"
$OUTPUT_S   = "$PROJECT\public\assets\files\stacjonarne"
$OUTPUT_N   = "$PROJECT\public\assets\files\niestacjonarne"
$TEMP_DIR   = "$SCRIPT_DIR\_tex_temp"

New-Item -ItemType Directory -Force -Path $OUTPUT_S | Out-Null
New-Item -ItemType Directory -Force -Path $OUTPUT_N | Out-Null
New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null

function Escape-Latex([string]$text) {
    if (-not $text) { return '' }
    # Usuń niewidzialne znaki unicode (LTR/RTL marks, zero-width space itp.)
    $text = $text -replace '[^\x09\x0A\x0D\x20-\x7E\x80-\xFF\u0100-\uD7FF]', ''
    # Zamień znaki nowej linii na spację (unikamy niezamkniętych makr w LaTeX)
    $text = $text -replace '\r\n', ' '
    $text = $text -replace '\r',   ' '
    $text = $text -replace '\n',   ' '
    $text = $text -replace '\\', '\textbackslash{}'
    $text = $text -replace '&',  '\&'
    $text = $text -replace '%',  '\%'
    $text = $text -replace '\$', '\$'
    $text = $text -replace '#',  '\#'
    $text = $text -replace '_',  '\_'
    $text = $text -replace '~',  '\textasciitilde{}'
    $text = $text -replace '\^', '\textasciicircum{}'
    $text = $text -replace '"',  "''"
    return $text
}

function Generate-Tex($s, [string]$code) {
    $nl = "`n"
    $amp = [char]38

    $nazwa     = Escape-Latex $s.nazwa_przedmiotu
    $kodPrzed  = Escape-Latex $s.kod_przedmiotu
    $tryb      = Escape-Latex $s.tryb_studiow
    $rok       = $s.rok_studiow
    $sem       = $s.semestr_studiow
    $charakter = if ($s.obligatoryjny) { "obowi" + [char]0x105 + "zkowy" } else { "obieralny" }
    $odpow     = Escape-Latex $s.odpowiedzialny_za_przedmiot
    $wersja    = Escape-Latex $s.wersja_z_dnia
    $ects      = $s.ects

    $wyk = if ($s.forma_i_liczba_godzin_zajec.wyklady)
                { "$($s.forma_i_liczba_godzin_zajec.wyklady) h" } else { "---" }
    $cwi = if ($s.forma_i_liczba_godzin_zajec.cwiczenia_lektorat_seminarium)
                { "$($s.forma_i_liczba_godzin_zajec.cwiczenia_lektorat_seminarium) h" } else { "---" }
    $lab = if ($s.forma_i_liczba_godzin_zajec.laboratorium_projekt)
                { "$($s.forma_i_liczba_godzin_zajec.laboratorium_projekt) h" } else { "---" }
    $zP  = if ($s.godziny.z_udzialem_prowadzacego_h)
                { "$($s.godziny.z_udzialem_prowadzacego_h) h" } else { "---" }
    $wl  = if ($s.godziny.praca_wlasna_studenta_h)
                { "$($s.godziny.praca_wlasna_studenta_h) h" } else { "---" }
    $lac = if ($s.godziny.calkowita_liczba_godzin_h)
                { "$($s.godziny.calkowita_liczba_godzin_h) h" } else { "---" }
    $pracaWlasnaStuOpis = if ($s.godziny.praca_wlasna_studenta) { Escape-Latex $s.godziny.praca_wlasna_studenta } else { "" }

    # Forma zaliczenia
    $dbs = "\\"   # double backslash dla LaTeX
    $zalRows = ""
    if ($s.zaliczenie) {
        foreach ($key in $s.zaliczenie.PSObject.Properties.Name) {
            $sp = Escape-Latex $s.zaliczenie.$key.sposob
            $fo = Escape-Latex $key
            $zalRows += "  $fo $amp $sp $dbs$nl"
        }
    }

    # Cel dydaktyczny
    $cel    = Escape-Latex $s.cel_dydaktyczny
    $celEng = Escape-Latex $s.cel_dydaktyczny_eng

    # Przedmioty wprowadzajace
    $pwRows = ""
    if ($s.przedmioty_wprowadzajace -and $s.przedmioty_wprowadzajace.Count -gt 0) {
        foreach ($p in $s.przedmioty_wprowadzajace) {
            $pn = Escape-Latex $p.nazwa
            $pw = Escape-Latex $p.wymagania
            if ($pn -or $pw) {
                $a = if ($pn) { $pn } else { "---" }
                $b = if ($pw) { $pw } else { "---" }
                $pwRows += "  $a $amp $b $dbs$nl"
            }
        }
    }

    # Tresci programowe – nowy format: [{nr_zajec, wyklad, cwiczenia}]
    $tresciRows = ""
    if ($s.tresci_programowe) {
        foreach ($ti in $s.tresci_programowe) {
            if ($ti -is [string]) {
                # stary format fallback
                $tresciRows += "  \hline$nl"
                $tresciRows += "  $(Escape-Latex $ti) $amp $amp $dbs$nl"
            } else {
                $nr   = if ($ti.nr_zajec) { "$($ti.nr_zajec)." } else { "" }
                $tWyk = Escape-Latex ([string]$ti.wyklad)
                $tCw  = Escape-Latex ([string]$ti.cwiczenia)
                $tresciRows += "  \hline$nl"
                $tresciRows += "  $nr $amp $tWyk $amp $tCw $dbs$nl"
            }
        }
    }
    if (-not $tresciRows) {
        $tresciRows = "  \hline$nl  1. $amp $amp $dbs$nl"
    }

    # Efekty ksztalcenia
    $wiedzaItems = ""
    if ($s.efekty_ksztalcenia.wiedza) {
        foreach ($w in $s.efekty_ksztalcenia.wiedza) { $wiedzaItems += "  \item $(Escape-Latex $w)$nl" }
    }
    $umiejItems = ""
    if ($s.efekty_ksztalcenia.umiejetnosci) {
        foreach ($u in $s.efekty_ksztalcenia.umiejetnosci) { $umiejItems += "  \item $(Escape-Latex $u)$nl" }
    }
    $kompItems = ""
    if ($s.efekty_ksztalcenia.kompetencje_spoleczne) {
        foreach ($k in $s.efekty_ksztalcenia.kompetencje_spoleczne) { $kompItems += "  \item $(Escape-Latex $k)$nl" }
    }

    # Kryteria oceny – nowy format: obiekt {wyklad: [], cwiczenia_laboratorium: []}
    $kryteriaBlock = ""
    if ($s.kryteria_oceny -and $s.kryteria_oceny.PSObject.Properties) {
        $krytWykItems = ""
        $krytCwItems  = ""
        $krytWykArr = $s.kryteria_oceny.wyklad
        $krytCwArr  = $s.kryteria_oceny.cwiczenia_laboratorium
        if ($krytWykArr -is [System.Array]) {
            foreach ($ki in $krytWykArr) { $krytWykItems += "  \item $(Escape-Latex $ki)$nl" }
        } elseif ($krytWykArr -is [string] -and $krytWykArr) {
            $krytWykItems += "  \item $(Escape-Latex $krytWykArr)$nl"
        }
        if ($krytCwArr -is [System.Array]) {
            foreach ($ki in $krytCwArr) { $krytCwItems += "  \item $(Escape-Latex $ki)$nl" }
        } elseif ($krytCwArr -is [string] -and $krytCwArr) {
            $krytCwItems += "  \item $(Escape-Latex $krytCwArr)$nl"
        }
        $wykKrytLabel = "Wyk" + [char]0x0142 + "ad"
        $cwKrytLabel  = [char]0x0106 + "wiczenia / Laboratorium"
        if ($krytWykItems) {
            $kryteriaBlock += "\textbf{${wykKrytLabel}:}$nl\begin{itemize}$nl${krytWykItems}\end{itemize}$nl\vspace{4pt}$nl"
        }
        if ($krytCwItems) {
            $kryteriaBlock += "\textbf{${cwKrytLabel}:}$nl\begin{itemize}$nl${krytCwItems}\end{itemize}$nl"
        }
    }
    if (-not $kryteriaBlock) { $kryteriaBlock = "\begin{itemize}$nl  \item Brak danych.$nl\end{itemize}$nl" }

    # Metody dydaktyczne – nowy format: {wyklad: [], cwiczenia_laboratorium: []}
    $metodyBlock = ""
    if ($s.metody_dydaktyczne -and $s.metody_dydaktyczne.PSObject.Properties) {
        $metWykArr = $s.metody_dydaktyczne.wyklad
        $metCwArr  = $s.metody_dydaktyczne.cwiczenia_laboratorium
        $wykMetLabel = "Wyk" + [char]0x0142 + "ad"
        $cwMetLabel  = [char]0x0106 + "wiczenia / Laboratorium"
        $metWykItems = ""
        $metCwItems  = ""
        if ($metWykArr -is [System.Array]) {
            foreach ($m in $metWykArr) { $metWykItems += "  \item $(Escape-Latex $m)$nl" }
        } elseif ($metWykArr -is [string] -and $metWykArr) {
            $metWykItems += "  \item $(Escape-Latex $metWykArr)$nl"
        }
        if ($metCwArr -is [System.Array]) {
            foreach ($m in $metCwArr) { $metCwItems += "  \item $(Escape-Latex $m)$nl" }
        } elseif ($metCwArr -is [string] -and $metCwArr) {
            $metCwItems += "  \item $(Escape-Latex $metCwArr)$nl"
        }
        if ($metWykItems) {
            $metodyBlock += "\textbf{${wykMetLabel}:}$nl\begin{itemize}$nl${metWykItems}\end{itemize}$nl\vspace{4pt}$nl"
        }
        if ($metCwItems) {
            $metodyBlock += "\textbf{${cwMetLabel}:}$nl\begin{itemize}$nl${metCwItems}\end{itemize}$nl\vspace{4pt}$nl"
        }
    }
    if (-not $metodyBlock) { $metodyBlock = "Wyk" + [char]0x142 + "ad, laboratoria, praca w" + [char]0x142 + "asna studenta." }

    # Literatura
    $litPItems = ""
    if ($s.literatura.podstawowa.pozycje) {
        foreach ($p in $s.literatura.podstawowa.pozycje) { $litPItems += "  \item $(Escape-Latex $p)$nl" }
    }
    $litUItems = ""
    if ($s.literatura.uzupelniajaca.pozycje) {
        foreach ($p in $s.literatura.uzupelniajaca.pozycje) { $litUItems += "  \item $(Escape-Latex $p)$nl" }
    }
    # Dokumentacja internetowa - jesli istnieje, dołącz do literatury uzupełniającej
    if ($s.literatura.dokumentacja_internetowa) {
        $docKeys = $s.literatura.dokumentacja_internetowa.PSObject.Properties.Name
        foreach ($key in $docKeys) {
            $litUItems += "  \item $(Escape-Latex $key)$nl"
        }
    }

    # Zabezpieczenie przed pustymi listami
    if (-not $tresciItems)   { $tresciItems   = "  \item Brak danych.$nl" }
    if (-not $wiedzaItems)   { $wiedzaItems   = "  \item Brak danych.$nl" }
    if (-not $umiejItems)    { $umiejItems    = "  \item Brak danych.$nl" }
    if (-not $litPItems)     { $litPItems     = "  \item Brak danych.$nl" }
    if (-not $litUItems)     { $litUItems     = "  \item Brak danych.$nl" }

    # Informacje dodatkowe i rynek pracy
    $infoDodatkowe   = if ($s.informacje_dodatkowe) { Escape-Latex $s.informacje_dodatkowe } else { "" }
    $rynekDziedzina  = ""
    $rynekZawody     = ""
    $rynekPraceDypl  = ""
    if ($s.rynek_pracy) {
        $rynekDziedzina = if ($s.rynek_pracy.dziedzina_gospodarki) { Escape-Latex $s.rynek_pracy.dziedzina_gospodarki } else { "" }
        $rynekZawody    = if ($s.rynek_pracy.zawody) { Escape-Latex $s.rynek_pracy.zawody } else { "" }
        if ($s.rynek_pracy.prace_dyplomowe -and $s.rynek_pracy.prace_dyplomowe.Count -gt 0) {
            foreach ($pd in $s.rynek_pracy.prace_dyplomowe) {
                $rynekPraceDypl += "  \item $(Escape-Latex $pd)$nl"
            }
        }
    }
    $hasInfoDod  = [bool]$infoDodatkowe
    $hasRynek    = [bool]($rynekDziedzina -or $rynekZawody -or $rynekPraceDypl)

    # Wymagania laboratorium
    $labPcItems  = ""
    $labSwItems  = ""
    $labWypItems = ""
    if ($s.wymagania_laboratorium) {
        if ($s.wymagania_laboratorium.pc_params) {
            foreach ($p in $s.wymagania_laboratorium.pc_params) { $labPcItems  += "  \item $(Escape-Latex $p)$nl" }
        }
        if ($s.wymagania_laboratorium.software) {
            foreach ($p in $s.wymagania_laboratorium.software) { $labSwItems  += "  \item $(Escape-Latex $p)$nl" }
        }
        if ($s.wymagania_laboratorium.wyposazenie_dodatkowe) {
            foreach ($p in $s.wymagania_laboratorium.wyposazenie_dodatkowe) { $labWypItems += "  \item $(Escape-Latex $p)$nl" }
        }
    }
    $hasLabWym = [bool]($labPcItems -or $labSwItems -or $labWypItems)

    # Polskie napisy (przez char codes zeby nie bylo problemow z encoding pliku .ps1)
    $gdansk       = "Gda" + [char]0x0144 + "sku"
    $wyklady      = "Wyk" + [char]0x0142 + "ady"
    $cwiczenia    = [char]0x0106 + "wiczenia"
    $zprow        = "Z prowadz" + [char]0x0105 + "cym"
    $pracaWl      = "Praca w" + [char]0x0142 + "asna"
    $lacznie      = [char]0x0141 + [char]0x0105 + "cznie"
    $godzZaj      = "Godziny zaj" + [char]0x0119 + [char]0x0107 + " i punkty ECTS"
    $tresciSec    = "Tre" + [char]0x015B + "ci programowe"
    $efektySec    = "Przedmiotowe efekty uczenia si"+ [char]0x0119
    $umiejSec     = "Umiej" + [char]0x0119 + "tno" + [char]0x015B + "ci"
    $krytSec      = "Kryteria oceny"
    $metSec       = "Metody dydaktyczne"
    $litSec       = "Literatura"
    $litPodst     = "Podstawowa:"
    $litUzup      = "Uzupe" + [char]0x0142 + "niaj" + [char]0x0105 + "ca:"
    $pracaWlLabel = "Zadania do samodzielnej realizacji:"
    $wiedzaLabel  = "Wiedza"
    $trybyLabel   = "Tryb studi" + [char]0x00F3 + "w:"
    $formaZajLabel= "Forma zaj" + [char]0x0119 + [char]0x0107
    $sposobLabel  = "Spos" + [char]0x00F3 + "b zaliczenia"
    $przedmWprow  = "Przedmioty wprowadzaj" + [char]0x0105 + "ce"
    $kompSpolLabel= "Kompetencje spo" + [char]0x0142 + "eczne"
    $celEngLabel  = "Wersja w j" + [char]0x0119 + "zyku angielskim (English version)"

    # Sekcje opcjonalne
    $zalSection = ""
    if ($zalRows) {
        $zalSection  = "${nl}\section{$formaZajLabel}${nl}${nl}"
        $zalSection += "\begin{tabular}{ll}${nl}"
        $zalSection += "  \hline${nl}"
        $zalSection += "  \textbf{$formaZajLabel} $amp \textbf{$sposobLabel} $dbs${nl}"
        $zalSection += "  \hline${nl}"
        $zalSection += $zalRows
        $zalSection += "  \hline${nl}\end{tabular}${nl}"
    }

    $pwSection = ""
    if ($pwRows) {
        $pwSection  = "${nl}\section{$przedmWprow}${nl}${nl}"
        $pwSection += "\begin{tabularx}{\textwidth}{lX}${nl}"
        $pwSection += "  \hline${nl}"
        $pwSection += "  \textbf{Przedmiot} $amp \textbf{Wymagane zagadnienia} $dbs${nl}"
        $pwSection += "  \hline${nl}"
        $pwSection += $pwRows
        $pwSection += "  \hline${nl}\end{tabularx}${nl}"
    }

    $kompSection = ""
    if ($kompItems) {
        $kompSection  = "${nl}\subsection*{$kompSpolLabel}${nl}"
        $kompSection += "\begin{itemize}${nl}${kompItems}\end{itemize}${nl}"
    }

    # Budowanie TEX
    $t  = "% ===========================================================`n"
    $t += "%  Sylabus: $nazwa ($kodPrzed)`n"
    $t += "% ===========================================================`n"
    $t += "\documentclass[12pt, a4paper]{article}`n`n"
    $t += "\usepackage[T1]{fontenc}`n"
    $t += "\usepackage[utf8]{inputenc}`n"
    $t += "\usepackage[polish]{babel}`n"
    $t += "\usepackage{lmodern}`n"
    $t += "\usepackage{microtype}`n"
    $t += "\usepackage[a4paper, top=2.5cm, bottom=2.5cm, left=2.5cm, right=2.5cm]{geometry}`n"
    $t += "\usepackage{xcolor}`n"
    $t += "\usepackage{graphicx}`n"
    $t += "\usepackage{booktabs}`n"
    $t += "\usepackage{tabularx}`n"
    $t += "\usepackage{longtable}`n"
    $t += "\usepackage{multirow}`n"
    $t += "\usepackage{array}`n"
    $t += "\usepackage{colortbl}`n"
    $t += "\usepackage{enumitem}`n"
    $t += "\usepackage{fancyhdr}`n"
    $t += "\usepackage{titlesec}`n"
    $t += "\usepackage{mdframed}`n"
    $t += "\usepackage[colorlinks=true, linkcolor=red!70!black, urlcolor=red!70!black]{hyperref}`n"
    $t += "\usepackage{eso-pic}`n"
    $t += "\usepackage{tikz}`n`n"
    $t += "\definecolor{pjatkRed}{RGB}{180,0,0}`n"
    $t += "\definecolor{pjatkGray}{RGB}{80,80,80}`n"
    $t += "\definecolor{pjatkLightGray}{RGB}{245,245,245}`n"
    $t += "\definecolor{tableHeader}{RGB}{220,220,220}`n`n"
    $t += "\pagestyle{fancy}\fancyhf{}`n"
    $t += "\renewcommand{\headrulewidth}{0.4pt}`n"
    $t += "\renewcommand{\footrulewidth}{0.4pt}`n"
    $t += "\fancyhead[L]{\small\textcolor{pjatkGray}{PJATK -- Filia w $gdansk \textbar\ Informatyka}}`n"
    $t += "\fancyhead[R]{\small\textcolor{pjatkGray}{Sylabus: $kodPrzed}}`n"
    $t += "\fancyfoot[C]{\small\thepage}`n`n"
    $t += "\titleformat{\section}{\large\bfseries\color{pjatkRed}}{\thesection.}{0.5em}{}`n"
    $t += "  [\color{pjatkRed}\rule{\linewidth}{0.8pt}]`n"
    $t += "\setlist{noitemsep, topsep=3pt, parsep=2pt}`n`n"
    $t += "\newmdenv[linecolor=pjatkRed, linewidth=1.2pt, backgroundcolor=pjatkLightGray,`n"
    $t += "  innerleftmargin=10pt, innerrightmargin=10pt, innertopmargin=8pt,`n"
    $t += "  innerbottommargin=8pt, roundcorner=4pt]{infobox}`n`n"
    $t += "\begin{document}`n`n"
    $t += "\AddToShipoutPictureBG{%`n"
    $t += "  \begin{tikzpicture}[remember picture, overlay]`n"
    $imgPath = $SCRIPT_DIR -replace '\\', '/'
    $t += "    \node[opacity=0.5] at (current page.center) {%`n"
    $t += "      \includegraphics[width=14cm]{$imgPath/PJATK_pl_sygnet_transparent-eps-converted-to}%`n"
    $t += "    };`n"
    $t += "  \end{tikzpicture}%`n"
    $t += "}`n`n"
    $t += "\begin{center}`n"
    $t += "  \includegraphics[height=2cm]{$imgPath/PJATK_pl_poziom_1}\\[0.8cm]`n"
    $t += "  {\LARGE\bfseries\color{pjatkRed} SYLABUS PRZEDMIOTU}\\[0.8cm]`n"
    $t += "\end{center}`n`n"
    $t += "\begin{infobox}`n"
    $t += "\begin{tabularx}{\textwidth}{@{}lX@{}}`n"
    $t += "  \textbf{Nazwa przedmiotu:}  $amp {\bfseries $nazwa} \\[3pt]`n"
    $t += "  \textbf{Kod przedmiotu:}    $amp $kodPrzed \\[3pt]`n"
    $t += "  \textbf{Kierunek / Profil:} $amp Informatyka / praktyczny \\[3pt]`n"
    $t += "  \textbf{${trybyLabel}}      $amp $tryb \\[3pt]`n"
    $t += "  \textbf{Rok / Semestr:}     $amp $rok / $sem \\[3pt]`n"
    $t += "  \textbf{Charakter:}         $amp $charakter \\[3pt]`n"
    $t += "  \textbf{Odpowiedzialny:}    $amp $odpow \\[3pt]`n"
    $t += "  \textbf{Wersja z dnia:}     $amp $wersja $dbs`n"
    $t += "\end{tabularx}`n"
    $t += "\end{infobox}`n`n"
    $t += "\vspace{1cm}`n`n"
    $pipe = "|"
    $t += "\section{$godzZaj}`n`n"
    $t += "\begin{center}`n"
    $t += "\begin{tabular}{${pipe}>{\centering\arraybackslash}p{2.0cm}`n"
    $t += "                ${pipe}>{\centering\arraybackslash}p{2.0cm}`n"
    $t += "                ${pipe}>{\centering\arraybackslash}p{2.0cm}`n"
    $t += "                ${pipe}>{\centering\arraybackslash}p{2.4cm}`n"
    $t += "                ${pipe}>{\centering\arraybackslash}p{2.4cm}`n"
    $t += "                ${pipe}>{\centering\arraybackslash}p{2.0cm}`n"
    $t += "                ${pipe}>{\centering\arraybackslash}p{1.4cm}${pipe}}`n"
    $t += "\hline`n"
    $t += "\rowcolor{tableHeader}`n"
    $t += "\textbf{$wyklady} $amp \textbf{$cwiczenia} $amp \textbf{Laboratorium} $amp`n"
    $t += "\textbf{$zprow} $amp \textbf{$pracaWl} $amp \textbf{$lacznie} $amp \textbf{ECTS} $dbs`n"
    $t += "\hline`n"
    $t += "$wyk $amp $cwi $amp $lab $amp $zP $amp $wl $amp $lac $amp \textbf{$ects} $dbs`n"
    $t += "\hline`n"
    $t += "\end{tabular}`n"
    $t += "\end{center}`n"
    if ($pracaWlasnaStuOpis) {
        $t += "`n\vspace{4pt}`n"
        $t += "\noindent\textbf{$pracaWlLabel} $pracaWlasnaStuOpis`n"
    }
    $t += "$zalSection`n"
    $t += "\section{Cel dydaktyczny}`n`n"
    $t += "$cel`n`n"
    if ($celEng) {
        $t += "\subsection*{\textit{$celEngLabel}}`n`n"
        $t += "\textit{$celEng}`n`n"
    }
    $t += "$pwSection`n"
    $t += "\section{$tresciSec}`n`n"
    $t += "\begin{longtable}{|p{1.5cm}|p{6.5cm}|p{6.5cm}|}`n"
    $t += "\hline`n"
    $t += "\textbf{Nr zaj.} $amp \textbf{Wyk" + [char]0x0142 + "ad} $amp \textbf{" + [char]0x0106 + "wiczenia / Laboratorium / Pracownia} $dbs\hline`n"
    $t += "\endhead`n"
    $t += $tresciRows
    $t += "  \hline`n"
    $t += "\end{longtable}`n`n"
    $t += "\section{$efektySec}`n`n"
    $t += "\subsection*{$wiedzaLabel}`n"
    $t += "\begin{itemize}`n" + $wiedzaItems + "\end{itemize}`n`n"
    $t += "\subsection*{$umiejSec}`n"
    $t += "\begin{itemize}`n" + $umiejItems + "\end{itemize}`n"
    $t += "$kompSection`n"
    $t += "\section{$krytSec}`n`n"
    $t += "$kryteriaBlock`n`n"
    $t += "\section{$metSec}`n`n"
    $t += "$metodyBlock`n`n"
    $t += "\section{$litSec}`n`n"
    $t += "\textbf{$litPodst}`n"
    $t += "\begin{itemize}`n" + $litPItems + "\end{itemize}`n`n"
    $t += "\textbf{$litUzup}`n"
    $t += "\begin{itemize}`n" + $litUItems + "\end{itemize}`n`n"

    # Wymagania laboratorium (tylko jesli niepuste)
    if ($hasLabWym) {
        $labSec    = "Wymagania dotycz" + [char]0x0105 + "ce laboratorium"
        $labPcLbl  = "Stanowisko komputerowe"
        $labSwLbl  = "Oprogramowanie"
        $labWypLbl = "Wyposa" + [char]0x017C + "enie specjalistyczne"

        # Zbierz wiersze – max dlugosc kolumn
        $labPcArr  = @(); if ($s.wymagania_laboratorium.pc_params)             { $labPcArr  = @($s.wymagania_laboratorium.pc_params) }
        $labSwArr  = @(); if ($s.wymagania_laboratorium.software)              { $labSwArr  = @($s.wymagania_laboratorium.software) }
        $labWypArr = @(); if ($s.wymagania_laboratorium.wyposazenie_dodatkowe) { $labWypArr = @($s.wymagania_laboratorium.wyposazenie_dodatkowe) }
        $labMaxRows = [Math]::Max([Math]::Max($labPcArr.Count, $labSwArr.Count), $labWypArr.Count)
        if ($labMaxRows -eq 0) { $labMaxRows = 1 }

        $labTableRows = ""
        for ($ri = 0; $ri -lt $labMaxRows; $ri++) {
            $c1 = if ($ri -lt $labPcArr.Count)  { Escape-Latex $labPcArr[$ri]  } else { "" }
            $c2 = if ($ri -lt $labSwArr.Count)  { Escape-Latex $labSwArr[$ri]  } else { "" }
            $c3 = if ($ri -lt $labWypArr.Count) { Escape-Latex $labWypArr[$ri] } else { "" }
            $labTableRows += "  \hline$nl  $c1 $amp $c2 $amp $c3 $dbs$nl"
        }

        $t += "\section{$labSec}`n`n"
        $t += "\begin{center}`n"
        $t += "\begin{tabular}{|p{4.5cm}|p{4.5cm}|p{4.5cm}|}`n"
        $t += "\hline`n"
        $t += "\rowcolor{tableHeader}`n"
        $t += "\textbf{$labPcLbl} $amp \textbf{$labSwLbl} $amp \textbf{$labWypLbl} $dbs`n"
        $t += $labTableRows
        $t += "  \hline`n"
        $t += "\end{tabular}`n"
        $t += "\end{center}`n`n"
    }

    # Informacje dodatkowe (tylko jesli niepuste)
    if ($hasInfoDod) {
        $infoDodSec = "Informacje dodatkowe"
        $t += "\section{$infoDodSec}`n`n"
        $t += "$infoDodatkowe`n`n"
    }

    # Rynek pracy (tylko jesli niepuste)
    if ($hasRynek) {
        $rynekSec    = "Uzasadnienie dla prowadzenia przedmiotu -- wsp" + [char]0x00F3 + [char]0x0142 + "praca z rynkiem pracy"
        $dziedzLabel = "W jakiego typu firmach b" + [char]0x0105 + "d" + [char]0x017A + " dziedzinach gospodarki b" + [char]0x0119 + "d" + [char]0x0105 + " potrzebne umiej" + [char]0x0119 + "tno" + [char]0x015B + "ci:"
        $zawodyLabel = "W jakich zawodach wiedza i umiej" + [char]0x0119 + "tno" + [char]0x015B + "ci nabyte podczas zaj" + [char]0x0119 + [char]0x0107 + " s" + [char]0x0105 + " istotne:"
        $praceDyplLabel = "Przyk" + [char]0x0142 + "adowe tematy prac dyplomowych i projekt" + [char]0x00F3 + "w badawczych:"
        $t += "\section{$rynekSec}`n`n"
        if ($rynekDziedzina) {
            $t += "\subsection*{$dziedzLabel}`n`n"
            $t += "$rynekDziedzina`n`n"
        }
        if ($rynekZawody) {
            $t += "\subsection*{$zawodyLabel}`n`n"
            $t += "$rynekZawody`n`n"
        }
        if ($rynekPraceDypl) {
            $t += "\subsection*{$praceDyplLabel}`n`n"
            $t += "\begin{itemize}`n" + $rynekPraceDypl + "\end{itemize}`n`n"
        }
    }

    $t += "\end{document}`n"

    return $t
}

function Compile-Tex([string]$texPath, [string]$outputDir) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($texPath)
    for ($i = 1; $i -le 2; $i++) {
        $result = & "$MIKTEX_BIN\pdflatex.exe" `
            -interaction=nonstopmode `
            -halt-on-error `
            -output-directory="$TEMP_DIR" `
            "$texPath" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  BLAD ($name, przebieg $i)" -ForegroundColor Red
            $result | Select-String "^!" | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
            return $false
        }
    }
    $srcPdf = "$TEMP_DIR\$name.pdf"
    $dstPdf = "$outputDir\$name.pdf"
    if (Test-Path $srcPdf) {
        Copy-Item $srcPdf $dstPdf -Force
        $size = [math]::Round((Get-Item $dstPdf).Length / 1KB, 1)
        Write-Host "  OK: $name.pdf ($size KB)" -ForegroundColor Green
    }
    @("aux","log","out","toc","fls","fdb_latexmk","pdf") | ForEach-Object {
        $f = "$TEMP_DIR\$name.$_"
        if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
    }
    return $true
}

function Process-Folder([string]$jsonDir, [string]$outputDir, [string]$label) {
    $jsonFiles = Get-ChildItem "$jsonDir\*.json" -ErrorAction SilentlyContinue
    if (-not $jsonFiles) { Write-Host "Brak plikow JSON w: $jsonDir" -ForegroundColor Yellow; return }

    # Filtruj po kodach jesli podano
    if ($CodesArray -and $CodesArray.Count -gt 0) {
        $jsonFiles = $jsonFiles | Where-Object { $CodesArray -contains $_.BaseName }
        if (-not $jsonFiles) { Write-Host "Brak pasujacych plikow dla kodow: $($CodesArray -join ', ')" -ForegroundColor Yellow; return }
    }

    $ok = 0; $err = 0
    Write-Host "`n===== $label ($($jsonFiles.Count) plikow) =====" -ForegroundColor Cyan

    foreach ($jf in $jsonFiles) {
        $code = $jf.BaseName
        Write-Host "--> $code" -ForegroundColor White
        try {
            $raw  = Get-Content $jf.FullName -Raw -Encoding UTF8
            $raw  = $raw.TrimStart([char]0xFEFF)
            $json = $raw | ConvertFrom-Json
            $s    = $json.sylabus
        } catch {
            Write-Host "  BLAD parsowania JSON: $_" -ForegroundColor Red
            $err++; continue
        }
        $tex     = Generate-Tex $s $code
        $texPath = "$TEMP_DIR\$code.tex"
        [System.IO.File]::WriteAllText($texPath, $tex, [System.Text.Encoding]::UTF8)
        if (Compile-Tex $texPath $outputDir) { $ok++ } else { $err++ }
    }

    $color = if ($err -gt 0) { "Yellow" } else { "Green" }
    Write-Host ("`n----- " + $label + ": " + $ok + " OK, " + $err + " bledow -----`n") -ForegroundColor $color
}

if ($Mode -eq "all" -or $Mode -eq "s") { Process-Folder $ASSETS_S $OUTPUT_S "Sylabusy stacjonarne" }
if ($Mode -eq "all" -or $Mode -eq "n") { Process-Folder $ASSETS_N $OUTPUT_N "Sylabusy niestacjonarne" }

Write-Host "`nGotowe! PDF-y zapisane w:" -ForegroundColor Cyan
if ($Mode -eq "all" -or $Mode -eq "s") { Write-Host "  $OUTPUT_S" }
if ($Mode -eq "all" -or $Mode -eq "n") { Write-Host "  $OUTPUT_N" }

