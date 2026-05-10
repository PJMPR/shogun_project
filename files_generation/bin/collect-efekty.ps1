$PROJECT = (Resolve-Path "$PSScriptRoot").Path
$srcS = "$PROJECT\public\assets\syllabusy"
$srcN = "$PROJECT\public\assets\syllabusy-n"
$out  = "$PROJECT\public\assets\efekty_ksztalcenia.json"

$wiedza = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$umiej  = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$komp   = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

$ok = 0; $err = 0

foreach ($dir in @($srcS, $srcN)) {
    foreach ($jf in Get-ChildItem "$dir\*.json") {
        try {
            $raw   = [System.IO.File]::ReadAllText($jf.FullName, [System.Text.Encoding]::UTF8)
            $raw   = $raw.TrimStart([char]0xFEFF)
            $data  = $raw | ConvertFrom-Json
            $ef    = $data.sylabus.efekty_ksztalcenia

            if ($ef.wiedza -is [System.Array]) {
                foreach ($w in $ef.wiedza) {
                    if ($w -and $w.Trim()) { $null = $wiedza.Add($w.Trim()) }
                }
            }
            if ($ef.umiejetnosci -is [System.Array]) {
                foreach ($u in $ef.umiejetnosci) {
                    if ($u -and $u.Trim()) { $null = $umiej.Add($u.Trim()) }
                }
            }
            if ($ef.kompetencje_spoleczne -is [System.Array]) {
                foreach ($k in $ef.kompetencje_spoleczne) {
                    if ($k -and $k.Trim()) { $null = $komp.Add($k.Trim()) }
                }
            }
            $ok++
        } catch {
            Write-Host "ERR: $($jf.Name) - $_" -ForegroundColor Red
            $err++
        }
    }
}

Write-Host "Plikow OK: $ok, Bledow: $err"
Write-Host "Wiedza:              $($wiedza.Count) unikalnych pozycji"
Write-Host "Umiejetnosci:        $($umiej.Count) unikalnych pozycji"
Write-Host "Kompetencje spoecz.: $($komp.Count) unikalnych pozycji"

$result = [ordered]@{
    wiedza                = ($wiedza | Sort-Object) -as [string[]]
    umiejetnosci          = ($umiej  | Sort-Object) -as [string[]]
    kompetencje_spoleczne = ($komp   | Sort-Object) -as [string[]]
}

# Reczne budowanie JSON zachowujac polskie znaki (ConvertTo-Json escape'uje Unicode)
function EscapeJsonString([string]$s) {
    $s = $s -replace '\\', '\\'
    $s = $s -replace '"',  '\"'
    $s = $s -replace "`r`n", '\n'
    $s = $s -replace "`n",   '\n'
    $s = $s -replace "`t",   '\t'
    return $s
}

function ArrayToJson([string[]]$arr) {
    if (-not $arr -or $arr.Count -eq 0) { return "[]" }
    $items = $arr | ForEach-Object { '    "' + (EscapeJsonString $_) + '"' }
    return "[\n" + ($items -join ",`n") + "`n  ]"
}

$jsonText  = "{`n"
$jsonText += "  `"efekty_ksztalcenia`": {`n"
$jsonText += "    `"wiedza`": " + (ArrayToJson ($wiedza | Sort-Object)) + ",`n"
$jsonText += "    `"umiejetnosci`": " + (ArrayToJson ($umiej | Sort-Object)) + ",`n"
$jsonText += "    `"kompetencje_spoleczne`": " + (ArrayToJson ($komp | Sort-Object)) + "`n"
$jsonText += "  }`n"
$jsonText += "}`n"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($out, $jsonText, $utf8NoBom)

Write-Host "Zapisano: $out"

