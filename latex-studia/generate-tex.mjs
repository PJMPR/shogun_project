/**
 * generate-tex.mjs  v3  –  styl identyczny z sylabusami PJATK
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE  = `${__dir}/../public/assets`;

const programS  = JSON.parse(readFileSync(`${BASE}/program.json`, 'utf8'));
const programN  = JSON.parse(readFileSync(`${BASE}/niestacjonarne/program.json`, 'utf8'));
const elSpecS   = JSON.parse(readFileSync(`${BASE}/electives-specializations.json`, 'utf8'));
const elSpecN   = JSON.parse(readFileSync(`${BASE}/niestacjonarne/electives-specializations.json`, 'utf8'));
const elOthS    = JSON.parse(readFileSync(`${BASE}/electives-other.json`, 'utf8'));
const elOthN    = JSON.parse(readFileSync(`${BASE}/niestacjonarne/electives-other.json`, 'utf8'));
const efekty    = JSON.parse(readFileSync(`${BASE}/efekty_ksztalcenia.json`, 'utf8'));

// ── LaTeX escape ──────────────────────────────────────────────────────────────
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/\\/g,  '\\textbackslash{}')
    .replace(/&/g,   '\\&')
    .replace(/%/g,   '\\%')
    .replace(/\$/g,  '\\$')
    .replace(/#/g,   '\\#')
    .replace(/_/g,   '\\_')
    .replace(/\{/g,  '\\{')
    .replace(/\}/g,  '\\}')
    .replace(/~/g,   '\\textasciitilde{}')
    .replace(/\^/g,  '\\textasciicircum{}')
    .replace(/„/g,   ',,')
    .replace(/"/g,   "''")
    .replace(/"/g,   '``')
    .replace(/–/g,   '--')
    .replace(/—/g,   '---')
    .replace(/…/g,   '\\ldots{}');
}

function formLabel(f) {
  if (f === 'EZ') return 'egzamin';
  if (f === 'Z')  return 'zaliczenie';
  return f || '';
}

// ── Kody MNiSW ────────────────────────────────────────────────────────────────
const MNISW_OPIS = {
  'P6S_WG': 'Wiedza ogólna -- podstawy nauk ścisłych i technicznych właściwe dla informatyki',
  'P6S_WK': 'Wiedza kierunkowa -- teorie, zasady i metody właściwe dla informatyki',
  'P6S_UW': 'Umiejętności -- wykorzystanie wiedzy do rozwiązywania problemów informatycznych',
  'P6S_UK': 'Umiejętności -- komunikowanie się w zakresie specjalności',
  'P6S_UO': 'Umiejętności -- planowanie i organizowanie pracy własnej i zespołowej',
  'P6S_UU': 'Umiejętności -- samodzielne uczenie się przez całe życie',
  'P6S_KK': 'Kompetencje -- krytyczna ocena posiadanej wiedzy',
  'P6S_KO': 'Kompetencje -- odpowiedzialne pełnienie ról zawodowych',
  'P6S_KR': 'Kompetencje -- wyznaczanie i przyjmowanie odpowiedzialności zawodowej',
  'InzA_W': 'Wiedza inżynierska -- metodyki projektowania i wytwarzania systemów (inż.)',
  'InzA_U': 'Umiejętności inżynierskie -- projektowanie i realizacja systemów (inż.)',
};

function getUniqueMnisw(ef) {
  const map = new Map();
  for (const item of [...ef.wiedza, ...ef.umiejetnosci, ...ef.kompetencje_spoleczne]) {
    if (!item.mnsiw) continue;
    for (const m of item.mnsiw) if (!map.has(m.kod)) map.set(m.kod, m);
  }
  return [...map.values()].sort((a,b) => a.kod.localeCompare(b.kod));
}

// ── Sekcja efektów kształcenia ────────────────────────────────────────────────
function efektySection(ef) {
  const ec = ef.efekty_ksztalcenia;
  const mnisw = getUniqueMnisw(ec);
  let out = '';

  if (mnisw.length > 0) {
    out += `\\subsection*{Odniesienie do Polskiej Ramy Kwalifikacji (PRK)}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{2.8cm}m{12cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kod PRK}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Charakterystyka}} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kod PRK}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Charakterystyka}} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    mnisw.forEach((m, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(m.kod)} & ${esc(MNISW_OPIS[m.kod] || '---')} \\\\\n`;
    });
    out += `\\bottomrule\n\\end{longtable}}\n\n\\bigskip\n`;
  }

  out += `\\subsection*{W -- Wiedza}\n\n${efektyList(ec.wiedza, 'W')}`;
  out += `\\subsection*{U -- Umiejętności}\n\n${efektyList(ec.umiejetnosci, 'U')}`;
  out += `\\subsection*{K -- Kompetencje społeczne}\n\n${efektyList(ec.kompetencje_spoleczne, 'K')}`;
  return out;
}

function efektyList(items, prefix) {
  let out = `{\\scriptsize\n\\begin{longtable}{m{1cm}m{8.8cm}m{2.1cm}m{2.5cm}}\n`;
  out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kod}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Efekt uczenia się}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kody PRK}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Przedmioty}} \\\\\n\\midrule\\thdend\n`;
  out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kod}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Efekt uczenia się}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kody PRK}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Przedmioty}} \\\\\n\\midrule\\thdend\n\\endhead\n`;
  items.forEach((item, i) => {
    const kod  = item.kod_efektu || `${prefix}${String(i+1).padStart(2,'0')}`;
    const bg   = (i % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
    const prk  = item.mnsiw
      ? [...new Map(item.mnsiw.map(m => [m.kod + (m.inzynierskie ? '_inz' : ''), m])).values()]
          .map(m => m.inzynierskie ? `${esc(m.kod)} {\\scriptsize (inż.)}` : esc(m.kod))
          .join(', ')
      : '';
    const kodyPrzedm = item.kody ? item.kody.map(k => esc(k)).join(', ') : '';
    out += `${bg}${esc(kod)} & ${esc(item.tresc)} & {\\scriptsize ${prk}} & {\\scriptsize ${kodyPrzedm}} \\\\\n`;
  });
  out += `\\bottomrule\n\\end{longtable}}\n\n`;
  return out;
}

// ── Plan studiów – tabele semestralne ─────────────────────────────────────────
// helper: usuwa tekst w nawiasach z końca etykiety, np. "(wybór 2 z 6)"
function trimLabel(lbl) {
  return lbl.replace(/\s*\(.*?\)\s*$/, '').trim();
}

function planStudiow(semesters, elOth) {
  const groupMap = {};
  for (const g of (elOth.groups || [])) groupMap[g.id] = g;
  let out = '';

  for (const sem of semesters) {
    // oblicz liczbę wierszy: przedmioty (grupy O liczymy raz) + nagłówek + suma
    const printed0 = new Set();
    let rowCount = 2; // nagłówek + wiersz sumy
    for (const subj of sem.subjects) {
      if (subj.type === 'O' && subj.electiveGroup) {
        if (!printed0.has(subj.electiveGroup)) { printed0.add(subj.electiveGroup); rowCount++; }
      } else {
        rowCount++;
      }
    }
    // każdy wiersz tabeli przy scriptsize + arraystretch=1.35 to ok 1.9\baselineskip
    // dodajemy 3 na nagłówek, ramki i odstęp pod subsection
    const neededLines = Math.ceil(rowCount * 1.9) + 3;
    if (sem.semester === 5 || sem.semester === 7) {
      out += `\\clearpage\n`;
    } else {
      out += `\\Needspace{${neededLines}\\baselineskip}\n`;
    }
    out += `\\subsection*{Semestr ${sem.semester}}\n`;
    out += `\\addcontentsline{toc}{subsection}{Semestr ${sem.semester}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{5.0cm}m{1.9cm}m{0.75cm}m{0.85cm}m{0.85cm}m{0.85cm}m{1.45cm}m{0.9cm}}\n`;
    // nagłówek – zeruj extrarowheight, czerwone tło, biały tekst, przywróć
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    const hdr = (t) => `{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}${t}}}`;
    out += `${hdr('Nazwa przedmiotu')} & ${hdr('Typ')} & ${hdr('Kod')} & ${hdr('Wyk.')} & ${hdr('Ćw.')} & ${hdr('Lab.')} & ${hdr('Zaliczenie')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    out += `${hdr('Nazwa przedmiotu')} & ${hdr('Typ')} & ${hdr('Kod')} & ${hdr('Wyk.')} & ${hdr('Ćw.')} & ${hdr('Lab.')} & ${hdr('Zaliczenie')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n\\endhead\n`;

    const printed = new Set();
    let rowIdx = 0;

    for (const subj of sem.subjects) {
      const grpId = subj.electiveGroup;
      const grp   = grpId ? groupMap[grpId] : null;
      rowIdx++;
      const zebraColor = (rowIdx % 2 === 0) ? 'tableRowAlt' : 'tableRowLight';

      if (subj.type === 'O' && grpId && !printed.has(grpId)) {
        printed.add(grpId);
        const gs   = sem.subjects.filter(s => s.electiveGroup === grpId);
        const tL   = gs.reduce((a,s)=>a+(s.lecture||0),0);
        const tT   = gs.reduce((a,s)=>a+(s.tutorial||0),0);
        const tLb  = gs.reduce((a,s)=>a+(s.lab||0),0);
        const tE   = gs.reduce((a,s)=>a+(s.ects||0),0);
        const form = gs[0]?.form || '-';
        // etykieta BEZ tekstu w nawiasach
        const rawLbl = grp ? grp.label : subj.name;
        const lbl    = esc(trimLabel(rawLbl));
        const typ    = grpId.startsWith('SPEC') ? 'specjalizacyjny' : 'obieralny';
        // tylko wiersz grupy – BEZ rozwijania dzieci, BEZ pogrubienia
        out += `\\rowcolor{tableElective} ${lbl} & {\\scriptsize ${typ}} & -- & ${tL} & ${tT} & ${tLb} & {\\scriptsize ${esc(formLabel(form))}} & ${tE} \\\\\n`;
      } else if (subj.type === 'O' && !grpId) {
        const bg = zebraColor ? `\\rowcolor{${zebraColor}} ` : '';
        out += `${bg}${esc(subj.name)} & {\\scriptsize obieralny} & ${esc(subj.code)} & ${subj.lecture||0} & ${subj.tutorial||0} & ${subj.lab||0} & {\\scriptsize ${esc(formLabel(subj.form))}} & ${subj.ects||0} \\\\\n`;
      } else if (subj.type !== 'O') {
        const bg = zebraColor ? `\\rowcolor{${zebraColor}} ` : '';
        out += `${bg}${esc(subj.name)} & {\\scriptsize obowiązkowy} & ${esc(subj.code)} & ${subj.lecture||0} & ${subj.tutorial||0} & ${subj.lab||0} & {\\scriptsize ${esc(formLabel(subj.form))}} & ${subj.ects||0} \\\\\n`;
      }
    }
    const s = sem.summary;
    out += `\\midrule[\\heavyrulewidth]\n\\rowcolor{tableSummary} \\textbf{Suma semestru ${sem.semester}} & & & \\textbf{${s.lecture}} & \\textbf{${s.tutorial}} & \\textbf{${s.lab}} & & \\textbf{${s.ects}} \\\\\n\\bottomrule\n`;
    out += `\\end{longtable}}\n\n`;
  }

  const tL  = semesters.reduce((a,s)=>a+s.summary.lecture,0);
  const tT  = semesters.reduce((a,s)=>a+s.summary.tutorial,0);
  const tLb = semesters.reduce((a,s)=>a+s.summary.lab,0);
  const tE  = semesters.reduce((a,s)=>a+s.summary.ects,0);
  out += `\\subsection*{Podsumowanie}\n\\addcontentsline{toc}{subsection}{Podsumowanie planu studiów}\n\n`;
  out += `\\begin{tabular}{lrrrr}\n\\toprule\n`;
  out += `\\rowcolor{pjatkRed} {\\color{white}} & {\\color{white}\\textbf{Wykłady}} & {\\color{white}\\textbf{Ćwiczenia}} & {\\color{white}\\textbf{Laboratoria}} & {\\color{white}\\textbf{ECTS}} \\\\\n\\midrule\n`;
  out += `\\textbf{RAZEM} & \\textbf{${tL}} & \\textbf{${tT}} & \\textbf{${tLb}} & \\textbf{${tE}} \\\\\n\\bottomrule\n\\end{tabular}\n\n`;
  return out;
}

// ── Specjalizacje ─────────────────────────────────────────────────────────────
function specjalizacje(elSpec) {
  let out = '';
  for (const spec of elSpec.specializations) {
    out += `\\subsection*{${esc(spec.name)}}\n`;
    out += `\\addcontentsline{toc}{subsection}{${esc(spec.name)}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{6.5cm}m{0.7cm}m{1cm}m{1cm}m{1.7cm}m{0.7cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Przedmiot}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Sem.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Wyk.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Lab.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Zaliczenie}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}ECTS}} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Przedmiot}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Sem.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Wyk.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Lab.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Zaliczenie}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}ECTS}} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    spec.items.forEach((item, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(item.name)} & ${item.semester} & ${item.lecture} & ${item.lab} & {\\scriptsize ${esc(formLabel(item.form))}} & ${item.ects} \\\\\n`;
    });
    out += `\\bottomrule\n\\end{longtable}}\n\n`;
  }
  return out;
}

// ── Przedmioty obieralne ──────────────────────────────────────────────────────
function obieralne(elOth) {
  // grupy pomijane w rozdziale "Przedmioty obieralne"
  const SKIP = new Set([
    // specjalizacyjne (stacjonarne i niestacjonarne)
    'SPEC_5','SPEC_6','SPEC_7','SPEC_8',
    // projekty zespołowe i proseminarium
    'PRZ1','PRZ2','PSEM','BYT',
    // duplikaty lektoratów (zostaje tylko LEK1)
    'LEK2','LEK3','LEK4','LEK5',
  ]);
  let out = '';
  for (const g of (elOth.groups || [])) {
    if (SKIP.has(g.id)) continue;
    if (!g.items || g.items.length === 0) continue;
    out += `\\subsection*{${esc(g.label)}}\n`;
    out += `\\addcontentsline{toc}{subsection}{${esc(trimLabel(g.label))}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{5.5cm}m{0.8cm}m{1cm}m{1cm}m{1cm}m{1.7cm}m{0.7cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Przedmiot}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kod}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Wyk.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Ćw.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Lab.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Zaliczenie}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}ECTS}} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Przedmiot}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Kod}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Wyk.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Ćw.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Lab.}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Zaliczenie}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}ECTS}} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    g.items.forEach((item, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(item.name)} & ${esc(item.code)} & ${item.lecture||0} & ${item.tutorial||0} & ${item.lab||0} & {\\scriptsize ${esc(formLabel(item.form))}} & ${item.ects} \\\\\n`;
    });
    out += `\\bottomrule\n\\end{longtable}}\n\n`;
  }
  return out;
}

// ── Tabela charakterystyki kierunku ──────────────────────────────────────────
function charTabela(isSt, semCount, semesters, elOth) {
  const forma = isSt ? 'Studia stacjonarne' : 'Studia niestacjonarne';

  // łączna liczba godzin zajęć
  const totalH = semesters.reduce((a,s) => a + s.summary.lecture + s.summary.tutorial + s.summary.lab, 0);

  // ECTS humanistyczne/społeczne – kody: HKJ, WDZ, SAI + grupy HUM_*
  const humCodes = new Set(['HKJ','WDZ','SAI']);
  const humGroups = new Set(
    (elOth.groups||[]).filter(g => g.id.startsWith('HUM')).map(g => g.id)
  );
  let ectsHum = 0;
  for (const s of semesters) {
    for (const subj of s.subjects) {
      if (humCodes.has(subj.code)) { ectsHum += subj.ects||0; continue; }
      if (subj.electiveGroup && humGroups.has(subj.electiveGroup)) {
        // liczymy tylko raz per grupa
      }
    }
  }
  // grupy HUM – suma ECTS z items (wybieramy tyle ile wyborów – przyjmujemy 2 per semestr)
  for (const g of (elOth.groups||[])) {
    if (g.id.startsWith('HUM') && g.items && g.items.length > 0) {
      // każda grupa HUM to 2 ECTS (jeden wybór)
      ectsHum += 2;
    }
  }

  // ECTS do wyboru – wszystkie przedmioty O
  let ectsWybor = 0;
  const countedGroups = new Set();
  for (const s of semesters) {
    for (const subj of s.subjects) {
      if (subj.type !== 'O') continue;
      if (subj.electiveGroup) {
        if (!countedGroups.has(subj.electiveGroup)) {
          countedGroups.add(subj.electiveGroup);
          ectsWybor += subj.ects||0;
        }
      } else {
        ectsWybor += subj.ects||0;
      }
    }
  }

  // godziny z bezpośrednim udziałem = wszystkie kontaktowe (wykład+ćw+lab)
  const totalKontakt = totalH;

  // ECTS umiejętności praktyczne – laboratoria + projekty (typ O z lab>0 lub M z lab>0)
  let ectsPrakt = 0;
  const pracGroups = new Set();
  for (const s of semesters) {
    for (const subj of s.subjects) {
      if ((subj.lab||0) > 0 || subj.code === 'PRO') {
        if (subj.electiveGroup) {
          if (!pracGroups.has(subj.electiveGroup)) {
            pracGroups.add(subj.electiveGroup);
            ectsPrakt += subj.ects||0;
          }
        } else {
          ectsPrakt += subj.ects||0;
        }
      }
    }
  }

  const row = (label, value) =>
    `  {\\small ${label}} & {\\small\\textbf{${value}}} \\\\\n`;

  let out = `{\\renewcommand{\\arraystretch}{1.4}\n`;
  out += `\\begin{tabularx}{\\textwidth}{@{}Xp{8.5cm}@{}}\n`;
  out += `\\toprule\n`;
  out += row('Nazwa kierunku:', 'Informatyka');
  out += row('Poziom:', 'Pierwszy stopień');
  out += row('Profil:', 'Praktyczny');
  out += row('Forma:', forma);
  out += row('Język wykładowy:', 'Polski');
  out += row('Kierunek przyporządkowany do dyscypliny:', 'Informatyka techniczna i telekomunikacja w dziedzinie nauk inżynieryjno technicznych');
  out += `\\midrule\n`;
  out += row('Liczba semestrów:', `${semCount}`);
  out += row('Liczba punktów ECTS konieczna do ukończenia studiów:', '210');
  out += row('Tytuł zawodowy nadawany absolwentom:', 'inżynier');
  out += `\\midrule\n`;
  out += row('Łączna liczba godzin zajęć:', `${totalH}`);
  out += row('Liczba punktów ECTS z dziedziny nauk humanistycznych lub społecznych:', '15');
  out += row('Liczba godzin zajęć z bezpośrednim udziałem prowadzących i studentów:', `${totalKontakt}`);
  out += row('Łączna liczba punktów ECTS przyporządkowana zajęciom kształtującym umiejętności praktyczne:', `${ectsPrakt}`);
  out += row('Liczba punktów ECTS uzyskiwana w ramach zajęć do wyboru:', '66');
  out += `\\bottomrule\n`;
  out += `\\end{tabularx}}\n\n\\bigskip\n`;
  return out;
}

// ── Budowanie dokumentu ───────────────────────────────────────────────────────
function buildDocument(tryb, semesters, elSpec, elOth, ef) {
  const isSt         = tryb === 'stacjonarny';
  const forma        = isSt ? 'stacjonarne' : 'niestacjonarne';
  const semCount     = semesters.length;
  const totalEcts    = semesters.reduce((a,s) => a + s.summary.ects, 0);
  // ścieżki z folderu latex-studia/ do zasobów w latex/
  const logoPdf   = '../latex/PJATK_pl_poziom_1';
  const sygnetPdf = '../latex/PJATK_pl_sygnet';

  return `% ============================================================
%  Program studiów – ${forma}  PJATK Filia w Gdańsku
% ============================================================
\\documentclass[12pt,a4paper]{article}

\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[polish]{babel}
\\usepackage{lmodern}
\\usepackage[scaled=1.0]{helvet}   % Helvetica ≈ Arial
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage{microtype}
\\usepackage[a4paper,top=2.5cm,bottom=2.5cm,left=2.5cm,right=2.5cm]{geometry}
\\usepackage{xcolor}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{tabularx}
\\usepackage{longtable}
\\usepackage{multirow}
\\usepackage{array}
\\usepackage{colortbl}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage{mdframed}
\\usepackage{eso-pic}
\\usepackage{tikz}
\\usepackage{tocloft}
\\usepackage{needspace}
\\usepackage[colorlinks=true,linkcolor=red!70!black,urlcolor=red!70!black]{hyperref}

% --- Kolor spisu treści – czarny -----------------------------
\\AtBeginDocument{\\hypersetup{linkcolor=black}}

% --- Kolory (zgodne ze stroną Angular) -----------------------
\\definecolor{pjatkRed}{RGB}{220,38,38}       % #dc2626 – akcent czerwony
\\definecolor{pjatkGray}{RGB}{80,80,80}
\\definecolor{pjatkLightGray}{RGB}{245,245,245}
\\definecolor{tableHeader}{RGB}{220,223,230}
\\definecolor{tableRowLight}{RGB}{242,243,246} % jasny szary (prawie biały)
\\definecolor{tableRowAlt}{RGB}{205,209,218}   % wyraźnie ciemniejszy szary
\\definecolor{tableElective}{RGB}{255,235,235} % obieralne – jasnoróżowy
\\definecolor{tableChild}{RGB}{255,245,245}    % dzieci
\\definecolor{tableSummary}{RGB}{195,199,210}  % podsumowanie
\\definecolor{descBorder}{RGB}{220,38,38}

% --- Odstępy w tabelach (wiersze danych) ----------------------
\\setlength{\\extrarowheight}{4pt}
\\renewcommand{\\arraystretch}{1.35}

% --- Makra do nagłówka tabeli (kompaktowy wiersz) -------------
\\newcommand{\\thdrule}{\\noalign{\\global\\setlength{\\extrarowheight}{0pt}}}
\\newcommand{\\thdend}{\\noalign{\\global\\setlength{\\extrarowheight}{4pt}}}

% --- Nagłówki / stopki ----------------------------------------
\\setlength{\\headheight}{14pt}
\\pagestyle{fancy}\\fancyhf{}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0.4pt}
\\fancyhead[L]{\\small\\textcolor{pjatkGray}{PJATK -- Filia w Gdańsku \\textbar\\ Informatyka}}
\\fancyhead[R]{\\small\\textcolor{pjatkGray}{Program studiów -- ${forma}}}
\\fancyfoot[C]{\\small\\thepage}

% --- Sekcje ---------------------------------------------------
\\titleformat{\\section}{\\large\\bfseries\\color{pjatkRed}}{\\thesection.}{0.5em}{}
  [\\color{pjatkRed}\\rule{\\linewidth}{0.8pt}]
\\titleformat{\\subsection}{\\normalsize\\bfseries\\color{pjatkGray}}{\\thesubsection.}{0.5em}{}
\\setlist{noitemsep,topsep=3pt,parsep=2pt}

% --- Ramka infobox --------------------------------------------
\\newmdenv[linecolor=pjatkRed,linewidth=1.2pt,backgroundcolor=pjatkLightGray,
  innerleftmargin=10pt,innerrightmargin=10pt,innertopmargin=8pt,
  innerbottommargin=8pt,roundcorner=4pt]{infobox}

% =============================================================
\\begin{document}

% --- Watermark ------------------------------------------------
\\AddToShipoutPictureBG{%
  \\begin{tikzpicture}[remember picture,overlay]
    \\node[opacity=0.35,anchor=south] at (current page.south){%
      \\includegraphics[width=10cm]{${sygnetPdf}}};
  \\end{tikzpicture}}

% --- Nagłówek tytułowy ----------------------------------------
\\begin{center}
  \\includegraphics[height=2cm]{${logoPdf}}\\\\[0.8cm]
  {\\LARGE\\bfseries\\color{pjatkRed} PROGRAM STUDIÓW}\\\\[0.8cm]
\\end{center}

\\begin{infobox}
\\begin{tabularx}{\\textwidth}{@{}lX@{}}
  \\textbf{Uczelnia:}             & Polsko-Japońska Akademia Technik Komputerowych \\\\[3pt]
  \\textbf{Wydział / Filia:}      & Informatyki w Gdańsku \\\\[3pt]
  \\textbf{Kierunek / Profil:}    & Informatyka / praktyczny \\\\[3pt]
  \\textbf{Poziom:}               & studia pierwszego stopnia (inżynierskie) \\\\[3pt]
  \\textbf{Forma studiów:}        & ${forma} \\\\[3pt]
  \\textbf{Liczba semestrów:}     & ${semCount} \\\\[3pt]
  \\textbf{Język wykładowy:}      & polski \\\\[3pt]
  \\textbf{Łączna liczba ECTS:}   & ${totalEcts} + 30 (praktyki zawodowe) \\\\[3pt]
  \\textbf{Rok akademicki:}       & 2026/2027 \\\\
\\end{tabularx}
\\end{infobox}

\\vspace{0.6cm}
\\begin{mdframed}[linecolor=pjatkGray,linewidth=0.6pt,backgroundcolor=white,
  innerleftmargin=10pt,innerrightmargin=10pt,innertopmargin=6pt,innerbottommargin=6pt]
{\\small\\textbf{Podstawa prawna:}\\\\[4pt]
Art.~53 i Art.~67 Ustawy Prawo o Szkolnictwie Wyższym i Nauce z dnia 20 lipca 2018~r. (Dz.~U.~2018 poz.~1668), Rozporządzenie Ministra Nauki i Szkolnictwa Wyższego z dnia 27 września 2018~r. w sprawie studiów oraz Rozporządzenie Ministra Nauki i Szkolnictwa Wyższego z dnia 14 listopada 2018~r. w sprawie charakterystyk drugiego stopnia efektów uczenia się dla kwalifikacji na poziomach 6--8 Polskiej Ramy Kwalifikacji.}
\\end{mdframed}

\\vspace{1cm}
\\thispagestyle{empty}
\\newpage
\\setcounter{page}{1}

% --- Spis treści ----------------------------------------------
\\tableofcontents
\\newpage

% =============================================================
\\section{Charakterystyka studiów}

${charTabela(isSt, semCount, semesters, elOth)}

\\newpage

Studia na kierunku \\textbf{Informatyka} prowadzone w Filii w Gdańsku Polsko-Japońskiej Akademii Technik Komputerowych (PJATK) mają charakter \\textbf{praktyczny} i trwają \\textbf{${semCount} semestry}. Absolwent uzyskuje tytuł zawodowy \\textbf{inżyniera informatyki}.

\\subsection{Cel i zakres kształcenia}

Celem kształcenia jest wyposażenie studentów w wiedzę, umiejętności i kompetencje społeczne niezbędne do samodzielnego projektowania, tworzenia i utrzymania systemów informatycznych. Program obejmuje m.in.: programowanie obiektowe i funkcyjne, bazy danych, sieci komputerowe, systemy operacyjne, sztuczną inteligencję, grafikę komputerową, bezpieczeństwo systemów informatycznych oraz zarządzanie projektami.

\\subsection{Warunki przyjęcia}

Na studia przyjmowani są kandydaci posiadający świadectwo dojrzałości.

\\subsection{Warunki ukończenia studiów}

Warunkiem ukończenia studiów jest zaliczenie wszystkich przedmiotów przewidzianych w planie, uzyskanie co najmniej \\textbf{210 punktów ECTS} oraz obrona pracy dyplomowej (inżynierskiej).

\\subsection{Specjalizacje}

W ramach studiów student wybiera jedną z pięciu specjalizacji:
\\begin{itemize}
  \\item Architektury oprogramowania i DevOps
  \\item Cyberbezpieczeństwo
  \\item Inżynieria gier komputerowych
  \\item Sztuczna inteligencja
  \\item Internet Rzeczy
\\end{itemize}

\\newpage

% =============================================================
\\section{Kierunkowe efekty uczenia się}

Poniższe tabele prezentują pełny zakres efektów uczenia się określonych w rozporządzeniu MNiSW z dnia 14 listopada 2018~r. w sprawie charakterystyk drugiego stopnia efektów uczenia się dla kwalifikacji na poziomach 6--8 Polskiej Ramy Kwalifikacji wydanym na podstawie art.~68 ust.~3 ustawy, określającym standardy kształcenia przygotowującego do wykonywania zawodu właściwy dla prezentowanych w tym Programie Studiów.

${efektySection(ef)}

\\newpage

% =============================================================
\\section{Plan studiów}


\\bigskip

${planStudiow(semesters, elOth)}

\\newpage

% =============================================================
\\section{Praktyki zawodowe}

\\subsection*{Wymiar, zasady i forma odbywania praktyk zawodowych}

Wszyscy studenci studiów pierwszego stopnia na kierunku Informatyka zobowiązani są do zrealizowania praktyk zawodowych w wymiarze \\textbf{720 godzin zegarowych (960 godzin lekcyjnych)}. Praktykom zawodowym przypisano \\textbf{30 punktów ECTS}.

Praktyki mogą odbywać się w trakcie roku akademickiego w kraju i za granicą, o ile nie utrudniają przebiegu studiów. Student może skorzystać z ofert zamieszczonych na portalu Akademickiego Biura Karier lub zaproponować pracodawcę, który zgadza się na przeprowadzenie praktyki. Charakter praktyki musi odpowiadać programowi nauczania i umożliwiać osiągnięcie założonych efektów uczenia się.

Praktyki mogą mieć zarówno charakter odpłatny, jak i nieodpłatny. Uczelnia nie pokrywa kosztów związanych z ich organizacją.

Osobą odpowiedzialną za weryfikację i rozliczanie praktyk z ramienia PJATK jest \\textbf{Pełnomocnik Rektora ds.~Praktyk Studenckich}.

Rozliczenie odbywa się na podstawie Sprawozdania z praktyk oraz dodatkowych załączników. W ramach praktyk zawodowych mogą zostać rozliczone np.: praca zarobkowa, staż lub wolontariat, jeżeli pełnione obowiązki umożliwiają osiągnięcie założonych efektów uczenia się, a student posiada w tym czasie prawa studenckie.

Dokumenty do rozliczenia praktyk muszą zostać przesłane przez moduł \\textit{Praktyki} w systemie GAKKO w odpowiednim terminie rozliczeniowym przed obroną. W przypadku niespełnienia wymogów formalnych praktyki nie są zaliczane.

Szczegółowe informacje dotyczące praktyk zawodowych znajdują się w \\textbf{Regulaminie Praktyk Studenckich}.

\\newpage

% =============================================================
\\section{Przedmioty obieralne}


${obieralne(elOth)}

\\newpage

% =============================================================
\\section{Specjalizacje}

Student wybiera jedną specjalizację na cały tok studiów. Przedmioty specjalizacyjne realizowane są w semestrach wskazanych w tabelach poniżej.

${specjalizacje(elSpec)}

\\end{document}
`;
}

// ── Zapis ──────────────────────────────────────────────────────────────────────
const texS = buildDocument('stacjonarny',    programS.semesters, elSpecS, elOthS, efekty);
const texN = buildDocument('niestacjonarny', programN.semesters, elSpecN, elOthN, efekty);

writeFileSync(`${__dir}/program_stacjonarne.tex`,    texS, 'utf8');
writeFileSync(`${__dir}/program_niestacjonarne.tex`, texN, 'utf8');

process.stdout.write('OK: program_stacjonarne.tex\nOK: program_niestacjonarne.tex\n');
