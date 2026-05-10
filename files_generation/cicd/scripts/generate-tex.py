#!/usr/bin/env python3
# generate-tex.py
# Generuje plik .tex z JSON sylabusu przedmiotu.
# Użycie: python3 generate-tex.py <plik_json> <plik_wyjściowy.tex> <katalog_latex>

import sys
import json
import re


def latex_escape(text: str) -> str:
    if not text:
        return ''
    text = text.lstrip('\ufeff')
    text = re.sub(r'[\u200b-\u200f\u202a-\u202e\ufeff]', '', text)
    replacements = [
        ('\\', r'\textbackslash{}'),
        ('&',  r'\&'),
        ('%',  r'\%'),
        ('$',  r'\$'),
        ('#',  r'\#'),
        ('_',  r'\_'),
        ('~',  r'\textasciitilde{}'),
        ('^',  r'\textasciicircum{}'),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def fmt_h(val) -> str:
    try:
        v = int(val) if val is not None else 0
        return f"{v} h" if v > 0 else "---"
    except (ValueError, TypeError):
        return "---"


def build_items(lst: list) -> str:
    if not lst:
        return r"  \item Brak danych."
    lines = []
    for item in lst:
        if item and str(item).strip():
            lines.append(f"  \\item {latex_escape(str(item))}")
    return '\n'.join(lines) if lines else r"  \item Brak danych."


def main():
    if len(sys.argv) < 4:
        print("Uzycie: generate-tex.py <json_file> <tex_output> <latex_dir>", file=sys.stderr)
        sys.exit(1)

    json_file  = sys.argv[1]
    tex_output = sys.argv[2]
    latex_dir  = sys.argv[3].replace('\\', '/')

    with open(json_file, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)

    s = data.get('sylabus', data)

    nazwa     = latex_escape(s.get('nazwa_przedmiotu', ''))
    kod       = latex_escape(s.get('kod_przedmiotu', ''))
    tryb      = latex_escape(s.get('tryb_studiow', ''))
    rok       = s.get('rok_studiow', '')
    sem       = s.get('semestr_studiow', '')
    oblig     = s.get('obligatoryjny', True)
    odpow     = latex_escape(s.get('odpowiedzialny_za_przedmiot', ''))
    wersja    = latex_escape(s.get('wersja_z_dnia', ''))
    ects      = s.get('ects', 0)
    charakter = 'obowi\u0105zkowy' if oblig else 'obieralny'
    cel       = latex_escape(s.get('cel_dydaktyczny', ''))

    godz_form = s.get('forma_i_liczba_godzin_zajec', {}) or {}
    godz      = s.get('godziny', {}) or {}
    wyk_h  = fmt_h(godz_form.get('wyklady'))
    cwi_h  = fmt_h(godz_form.get('cwiczenia_lektorat_seminarium'))
    lab_h  = fmt_h(godz_form.get('laboratorium_projekt'))
    zprow  = fmt_h(godz.get('z_udzialem_prowadzacego_h'))
    wlas   = fmt_h(godz.get('praca_wlasna_studenta_h'))
    lac    = fmt_h(godz.get('calkowita_liczba_godzin_h'))

    efekty   = s.get('efekty_ksztalcenia', {}) or {}
    wiedza   = build_items(efekty.get('wiedza', []))
    umiej    = build_items(efekty.get('umiejetnosci', []))
    komp_lst = efekty.get('kompetencje_spoleczne', [])
    komp_str = build_items(komp_lst) if komp_lst else ''

    tresci = build_items(s.get('tresci_programowe', []))
    kryt   = build_items(s.get('kryteria_oceny', []))

    lit        = s.get('literatura', {}) or {}
    lit_p      = build_items((lit.get('podstawowa') or {}).get('pozycje', []))
    lit_u_lst  = list((lit.get('uzupelniajaca') or {}).get('pozycje', []))
    doc_int    = lit.get('dokumentacja_internetowa') or {}
    if isinstance(doc_int, dict):
        for k in doc_int.keys():
            lit_u_lst.append(k)
    lit_u = build_items(lit_u_lst)

    # Zaliczenie
    zal_dict    = s.get('zaliczenie', {}) or {}
    zal_section = ''
    if zal_dict:
        rows = []
        for key, val in zal_dict.items():
            sposob = ''
            if isinstance(val, dict):
                sposob = val.get('sposob', '')
            elif isinstance(val, str):
                sposob = val
            rows.append(f"  {latex_escape(key)} & {latex_escape(sposob)} \\\\")
        if rows:
            zal_section = (
                "\\section{Forma zaj\u0119\u0107}\n\n"
                "\\begin{tabular}{ll}\n  \\hline\n"
                "  \\textbf{Forma zaj\u0119\u0107} & \\textbf{Spos\u00f3b zaliczenia} \\\\\n  \\hline\n"
                + '\n'.join(rows) + "\n  \\hline\n\\end{tabular}\n"
            )

    # Przedmioty wprowadzające
    pw_list    = s.get('przedmioty_wprowadzajace', []) or []
    pw_section = ''
    if pw_list:
        rows = []
        for p in pw_list:
            if not isinstance(p, dict):
                continue
            pn = latex_escape(p.get('nazwa', '') or '')
            pw = latex_escape(p.get('wymagania', '') or '')
            if pn or pw:
                rows.append(f"  {pn or '---'} & {pw or '---'} \\\\")
        if rows:
            pw_section = (
                "\\section{Przedmioty wprowadzaj\u0105ce}\n\n"
                "\\begin{tabularx}{\\textwidth}{lX}\n  \\hline\n"
                "  \\textbf{Przedmiot} & \\textbf{Wymagane zagadnienia} \\\\\n  \\hline\n"
                + '\n'.join(rows) + "\n  \\hline\n\\end{tabularx}\n"
            )

    # Metody dydaktyczne
    met_dict     = s.get('metody_dydaktyczne', {}) or {}
    metody_lines = []
    if isinstance(met_dict, dict):
        for key, val in met_dict.items():
            if not key:
                continue
            metody_lines.append(f"\\textbf{{{latex_escape(key)}:}}")
            metody_lines.append("\\begin{itemize}")
            if isinstance(val, list):
                for m in val:
                    if m:
                        metody_lines.append(f"  \\item {latex_escape(str(m))}")
            elif isinstance(val, str) and val:
                metody_lines.append(f"  \\item {latex_escape(val)}")
            metody_lines.append("\\end{itemize}")
            metody_lines.append("\\vspace{4pt}")
    metody_block = '\n'.join(metody_lines) if metody_lines else \
        "Wyk\u0142ad, laboratoria, praca w\u0142asna studenta."

    # Kompetencje społeczne (opcjonalne)
    komp_section = ''
    if komp_str:
        komp_section = (
            "\n\\subsection*{Kompetencje spo\u0142eczne}\n"
            "\\begin{itemize}\n"
            f"{komp_str}\n"
            "\\end{itemize}\n"
        )

    # ── Budowanie TEX ────────────────────────────────────────────────────
    tex = (
        f"% Sylabus: {nazwa} ({kod})\n"
        "\\documentclass[12pt, a4paper]{article}\n"
        "\\usepackage[T1]{fontenc}\n"
        "\\usepackage[utf8]{inputenc}\n"
        "\\usepackage[polish]{babel}\n"
        "\\usepackage{lmodern}\n"
        "\\usepackage{microtype}\n"
        "\\usepackage[a4paper, top=2.5cm, bottom=2.5cm, left=2.5cm, right=2.5cm]{geometry}\n"
        "\\usepackage{xcolor}\n"
        "\\usepackage{graphicx}\n"
        "\\usepackage{booktabs}\n"
        "\\usepackage{tabularx}\n"
        "\\usepackage{longtable}\n"
        "\\usepackage{multirow}\n"
        "\\usepackage{array}\n"
        "\\usepackage{colortbl}\n"
        "\\usepackage{enumitem}\n"
        "\\usepackage{fancyhdr}\n"
        "\\usepackage{titlesec}\n"
        "\\usepackage{mdframed}\n"
        "\\usepackage[colorlinks=true, linkcolor=red!70!black, urlcolor=red!70!black]{hyperref}\n"
        "\\usepackage{eso-pic}\n"
        "\\usepackage{tikz}\n\n"
        "\\definecolor{pjatkRed}{RGB}{180,0,0}\n"
        "\\definecolor{pjatkGray}{RGB}{80,80,80}\n"
        "\\definecolor{pjatkLightGray}{RGB}{245,245,245}\n"
        "\\definecolor{tableHeader}{RGB}{220,220,220}\n\n"
        "\\pagestyle{fancy}\\fancyhf{}\n"
        "\\renewcommand{\\headrulewidth}{0.4pt}\n"
        "\\renewcommand{\\footrulewidth}{0.4pt}\n"
        f"\\fancyhead[L]{{\\small\\textcolor{{pjatkGray}}{{PJATK -- Filia w Gda\u0144sku \\textbar\\ Informatyka}}}}\n"
        f"\\fancyhead[R]{{\\small\\textcolor{{pjatkGray}}{{Sylabus: {kod}}}}}\n"
        "\\fancyfoot[C]{\\small\\thepage}\n\n"
        "\\titleformat{\\section}{\\large\\bfseries\\color{pjatkRed}}{\\thesection.}{0.5em}{}\n"
        "  [\\color{pjatkRed}\\rule{\\linewidth}{0.8pt}]\n"
        "\\setlist{noitemsep, topsep=3pt, parsep=2pt}\n\n"
        "\\newmdenv[linecolor=pjatkRed, linewidth=1.2pt, backgroundcolor=pjatkLightGray,\n"
        "  innerleftmargin=10pt, innerrightmargin=10pt, innertopmargin=8pt,\n"
        "  innerbottommargin=8pt, roundcorner=4pt]{infobox}\n\n"
        "\\begin{document}\n\n"
        "\\AddToShipoutPictureBG{%\n"
        "  \\begin{tikzpicture}[remember picture, overlay]\n"
        "    \\node[opacity=0.5] at (current page.center) {%\n"
        f"      \\includegraphics[width=14cm]{{{latex_dir}/PJATK_pl_sygnet_transparent-eps-converted-to}}%\n"
        "    };\n"
        "  \\end{tikzpicture}%\n"
        "}\n\n"
        "\\begin{center}\n"
        f"  \\includegraphics[height=2cm]{{{latex_dir}/PJATK_pl_poziom_1}}\\\\[0.8cm]\n"
        "  {\\LARGE\\bfseries\\color{pjatkRed} SYLABUS PRZEDMIOTU}\\\\[0.8cm]\n"
        "\\end{center}\n\n"
        "\\begin{infobox}\n"
        "\\begin{tabularx}{\\textwidth}{@{}lX@{}}\n"
        f"  \\textbf{{Nazwa przedmiotu:}}  & {{\\bfseries {nazwa}}} \\\\[3pt]\n"
        f"  \\textbf{{Kod przedmiotu:}}    & {kod} \\\\[3pt]\n"
        "  \\textbf{Kierunek / Profil:} & Informatyka / praktyczny \\\\[3pt]\n"
        f"  \\textbf{{Tryb studi\u00f3w:}}      & {tryb} \\\\[3pt]\n"
        f"  \\textbf{{Rok / Semestr:}}     & {rok} / {sem} \\\\[3pt]\n"
        f"  \\textbf{{Charakter:}}         & {charakter} \\\\[3pt]\n"
        f"  \\textbf{{Odpowiedzialny:}}    & {odpow} \\\\[3pt]\n"
        f"  \\textbf{{Wersja z dnia:}}     & {wersja} \\\\\n"
        "\\end{tabularx}\n"
        "\\end{infobox}\n\n"
        "\\vspace{1cm}\n\n"
        "\\section{Godziny zaj\u0119\u0107 i punkty ECTS}\n\n"
        "\\begin{center}\n"
        "\\begin{tabular}{|>{\\centering\\arraybackslash}p{2.0cm}\n"
        "                |>{\\centering\\arraybackslash}p{2.0cm}\n"
        "                |>{\\centering\\arraybackslash}p{2.0cm}\n"
        "                |>{\\centering\\arraybackslash}p{2.4cm}\n"
        "                |>{\\centering\\arraybackslash}p{2.4cm}\n"
        "                |>{\\centering\\arraybackslash}p{2.0cm}\n"
        "                |>{\\centering\\arraybackslash}p{1.4cm}|}\n"
        "\\hline\n"
        "\\rowcolor{tableHeader}\n"
        "\\textbf{Wyk\u0142ady} & \\textbf{\u0106wiczenia} & \\textbf{Laboratorium} &\n"
        "\\textbf{Z prowadz\u0105cym} & \\textbf{Praca w\u0142asna} & \\textbf{\u0141\u0105cznie} & \\textbf{ECTS} \\\\\n"
        "\\hline\n"
        f"{wyk_h} & {cwi_h} & {lab_h} & {zprow} & {wlas} & {lac} & \\textbf{{{ects}}} \\\\\n"
        "\\hline\n"
        "\\end{tabular}\n"
        "\\end{center}\n\n"
        f"{zal_section}\n"
        "\\section{Cel dydaktyczny}\n\n"
        f"{cel}\n\n"
        f"{pw_section}\n"
        "\\section{Tre\u015bci programowe}\n\n"
        "\\begin{enumerate}\n"
        f"{tresci}\n"
        "\\end{enumerate}\n\n"
        "\\section{Efekty kszta\u0142cenia}\n\n"
        "\\subsection*{Wiedza}\n"
        "\\begin{itemize}\n"
        f"{wiedza}\n"
        "\\end{itemize}\n\n"
        "\\subsection*{Umiej\u0119tno\u015bci}\n"
        "\\begin{itemize}\n"
        f"{umiej}\n"
        "\\end{itemize}\n"
        f"{komp_section}\n"
        "\\section{Kryteria oceny}\n\n"
        "\\begin{itemize}\n"
        f"{kryt}\n"
        "\\end{itemize}\n\n"
        "\\section{Metody dydaktyczne}\n\n"
        f"{metody_block}\n\n"
        "\\section{Literatura}\n\n"
        "\\textbf{Podstawowa:}\n"
        "\\begin{itemize}\n"
        f"{lit_p}\n"
        "\\end{itemize}\n\n"
        "\\textbf{Uzupe\u0142niaj\u0105ca:}\n"
        "\\begin{itemize}\n"
        f"{lit_u}\n"
        "\\end{itemize}\n\n"
        "\\end{document}\n"
    )

    with open(tex_output, 'w', encoding='utf-8') as f:
        f.write(tex)

    print(f"Wygenerowano: {tex_output}")


if __name__ == '__main__':
    main()

