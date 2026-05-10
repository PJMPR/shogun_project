$PROJECT = (Resolve-Path "$PSScriptRoot").Path
$srcS = "$PROJECT\public\assets\syllabusy"
$srcN = "$PROJECT\public\assets\syllabusy-n"
$out  = "$PROJECT\public\assets\efekty_ksztalcenia.json"

$wiedza = [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::OrdinalIgnoreCase)
$umiej  = [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::OrdinalIgnoreCase)
$komp   = [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::OrdinalIgnoreCase)

function Normalize([string]$s) { return ($s -replace "\\s+", " ").Trim().ToLowerInvariant() }

function FixText([string]$s) {
    if (-not $s) { return "" }
    $s = [regex]::Replace($s, "[\u200B-\u200F\u202A-\u202E\uFEFF]", "")
    $s = $s -replace "\\s+", " "
    $s = [regex]::Replace($s, "\.([A-Z])", ". $1")
    $s = [regex]::Replace($s, ",([^\s])", ", $1")
    $s = $s.Trim()
    if ($s.Length -gt 0) { $s = $s.Substring(0,1).ToUpper() + $s.Substring(1) }
    return $s
}

function IsSenseless([string]$s) {
    if (-not $s -or $s.Length -lt 15) { return $true }
    $t = $s.TrimEnd()
    if ($t -match ":$") { return $true }
    if ($t -match "^Dodatkowo" -and $t.Length -lt 20) { return $true }
    return $false
}

function AddEntry($dict, [string]$raw, [string]$kod) {
    $fixed = FixText $raw
    if (IsSenseless $fixed) { return }
    $key = Normalize $fixed
    if ($dict.ContainsKey($key)) {
        $null = $dict[$key].kody.Add($kod)
    } else {
        $entry = [PSCustomObject]@{ tresc = $fixed; kody = [System.Collections.Generic.SortedSet[string]]::new([System.StringComparer]::Ordinal) }
        $null = $entry.kody.Add($kod)
        $dict[$key] = $entry
    }
}

$ok = 0; $err = 0
foreach ($dir in @($srcS, $srcN)) {
    foreach ($jf in Get-ChildItem "$dir\*.json" -ErrorAction SilentlyContinue) {
        try {
            $raw  = [System.IO.File]::ReadAllText($jf.FullName, [System.Text.Encoding]::UTF8)
            $raw  = $raw.TrimStart([char]0xFEFF)
            $data = $raw | ConvertFrom-Json
            $s2   = $data.sylabus
            $kod  = if ($s2.kod_przedmiotu -and $s2.kod_przedmiotu -ne "") { $s2.kod_przedmiotu } else { $jf.BaseName }
            $ef   = $s2.efekty_ksztalcenia
            if ($ef.wiedza -is [System.Array]) { foreach ($w in $ef.wiedza) { if ($w) { AddEntry $wiedza $w $kod } } }
            if ($ef.umiejetnosci -is [System.Array]) { foreach ($u in $ef.umiejetnosci) { if ($u) { AddEntry $umiej $u $kod } } }
            if ($ef.kompetencje_spoleczne -is [System.Array]) { foreach ($k in $ef.kompetencje_spoleczne) { if ($k) { AddEntry $komp $k $kod } } }
            $ok++
        } catch { Write-Host "ERR: $($jf.Name)"; $err++ }
    }
}
Write-Host "OK:$ok ERR:$err  W:$($wiedza.Count) U:$($umiej.Count) K:$($komp.Count)"

function EscJ([string]$s) {
    $s = $s -replace "\\\\", "\\\\\\\\"
    $s = $s -replace "\"", "\\\""
    $s = $s -replace "`r`n", "\\n"
    $s = $s -replace "`n", "\\n"
    $s = $s -replace "`t", "\\t"
    return $s
}

function DictToJson($dict) {
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($entry in ($dict.Values | Sort-Object { $_.tresc })) {
        $t = EscJ $entry.tresc
        $ks = ($entry.kody | ForEach-Object { '"' + (EscJ $_) + '"' }) -join ", "
        $lines.Add('      { "tresc": "' + $t + '", "kody": [' + $ks + '] }')
    }
    return "[\n" + ($lines -join ",`n") + "`n    ]"
}

$sb = New-Object System.Text.StringBuilder
$q = '"'
$null = $sb.AppendLine('{')
$null = $sb.AppendLine('  ' + $q + 'efekty_ksztalcenia' + $q + ': {')
$null = $sb.AppendLine('    ' + $q + 'wiedza' + $q + ': ' + (DictToJson $wiedza) + ',')
$null = $sb.AppendLine('    ' + $q + 'umiejetnosci' + $q + ': ' + (DictToJson $umiej) + ',')
$null = $sb.AppendLine('    ' + $q + 'kompetencje_spoleczne' + $q + ': ' + (DictToJson $komp))
$null = $sb.AppendLine('  }')
$null = $sb.AppendLine('}')
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($out, $sb.ToString(), $utf8)
Write-Host "Zapisano: $out"
