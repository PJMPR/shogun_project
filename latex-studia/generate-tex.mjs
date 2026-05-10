/**
 * generate-tex.mjs  v3  –  styl identyczny z sylabusami PJATK
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE  = `${__dir}/../public/assets`;

const programS    = JSON.parse(readFileSync(`${BASE}/program.json`, 'utf8'));
const programN    = JSON.parse(readFileSync(`${BASE}/niestacjonarne/program.json`, 'utf8'));
const programSen  = JSON.parse(readFileSync(`${BASE}/program-en.json`, 'utf8'));
const programNen  = JSON.parse(readFileSync(`${BASE}/niestacjonarne/program-en.json`, 'utf8'));
const elSpecS     = JSON.parse(readFileSync(`${BASE}/electives-specializations.json`, 'utf8'));
const elSpecN     = JSON.parse(readFileSync(`${BASE}/niestacjonarne/electives-specializations.json`, 'utf8'));
const elSpecSen   = JSON.parse(readFileSync(`${BASE}/electives-specializations-en.json`, 'utf8'));
const elSpecNen   = JSON.parse(readFileSync(`${BASE}/niestacjonarne/electives-specializations-en.json`, 'utf8'));
const elOthS      = JSON.parse(readFileSync(`${BASE}/electives-other.json`, 'utf8'));
const elOthN      = JSON.parse(readFileSync(`${BASE}/niestacjonarne/electives-other.json`, 'utf8'));
const elOthSen    = JSON.parse(readFileSync(`${BASE}/electives-other-en.json`, 'utf8'));
const elOthNen    = JSON.parse(readFileSync(`${BASE}/niestacjonarne/electives-other-en.json`, 'utf8'));
const efekty      = JSON.parse(readFileSync(`${BASE}/efekty_ksztalcenia.json`, 'utf8'));

// --- Wczytaj opcjonalny dodatek AI (ai-program.json) -----------------
let aiProgram = null;
try {
  aiProgram = JSON.parse(readFileSync(`${BASE}/ai-program.json`, 'utf8'));
} catch (e) {
  aiProgram = null; // brak pliku -> brak dodatku
}

function escNL(s) {
  if (s === null || s === undefined) return '';
  return esc(String(s)).replace(/\r?\n/g, '\\par ');
}

// ── Nagłówek longtable w stylu PJATK (czerwone tło, biały tekst) ─────────────
function aiTableHeader(cols) {
  const hdr = (t) => `{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}${esc(t)}}}`;
  const row = cols.map(hdr).join(' & ');
  let h = `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n${row} \\\\\n\\midrule\\thdend\n`;
  h += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n${row} \\\\\n\\midrule\\thdend\n\\endhead\n`;
  return h;
}

function aiChapter(ai) {
  if (!ai) return '';
  let out = '';
  out += '\n\\newpage\n';
  out += `\\section*{${esc(ai.title || '')}}\n`;
  out += `\\addcontentsline{toc}{section}{${esc(ai.title || '')}}\n\n`;
  if (ai.subtitle) out += `\\subsection*{${esc(ai.subtitle)}}\n\\vspace{0.3cm}\n`;

  const sum = (ai.sections || []).find(s => s.id === 'summary');
  if (sum && sum.text) out += `\\noindent ${escNL(sum.text)}\n\\bigskip\n`;

  for (const s of (ai.sections || [])) {
    if (s.id === 'summary') continue;
    out += `\\subsection*{${esc(s.title || s.id)}}\n`;
    out += `\\addcontentsline{toc}{subsection}{${esc(s.title || s.id)}}\n\n`;
    if (s.text) out += `\\noindent ${escNL(s.text)}\n\\medskip\n`;

    // framework (etapy) → longtable: Etap | Nazwa | Wytyczne
    if (s.framework && Array.isArray(s.framework)) {
      out += `{\\scriptsize\n\\begin{longtable}{m{0.8cm}m{3.5cm}m{10cm}}\n`;
      out += aiTableHeader(['Etap', 'Nazwa', 'Wytyczne dla studenta']);
      s.framework.forEach((f, idx) => {
        const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
        out += `${bg}${f.stage || idx+1} & \\textbf{${esc(f.name)}} & ${escNL(f.guidance || f.description || '')} \\\\\n`;
      });
      out += `\\bottomrule\n\\end{longtable}}\n\\medskip\n`;
    }

    // items (przykłady zadań) → longtable: Zadanie | Opis
    if (s.items && Array.isArray(s.items)) {
      out += `{\\scriptsize\n\\begin{longtable}{m{4.5cm}m{10cm}}\n`;
      out += aiTableHeader(['Zadanie', 'Opis i instrukcja']);
      s.items.forEach((it, idx) => {
        const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
        out += `${bg}\\textbf{${esc(it.name)}} & ${escNL(it.instruction || it.description || it.example || '')} \\\\\n`;
      });
      out += `\\bottomrule\n\\end{longtable}}\n\\medskip\n`;
    }

    // matrix (ocenianie) → longtable: 3 kolumny
    if (s.matrix && Array.isArray(s.matrix)) {
      out += `{\\scriptsize\n\\begin{longtable}{m{4.5cm}m{5.5cm}m{4.5cm}}\n`;
      out += aiTableHeader(['Kryterium', 'Ocena automatyczna (narzędzie SI)', 'Ocena prowadzącego']);
      s.matrix.forEach((row, idx) => {
        const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
        out += `${bg}${esc(row[0])} & ${esc(row[1])} & ${esc(row[2]||'')} \\\\\n`;
      });
      out += `\\bottomrule\n\\end{longtable}}\n\\medskip\n`;
    }
  }
  return out;
}

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
    .replace(/}/g,  '\\}')
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
  if (!elSpec || !elSpec.specializations || elSpec.specializations.length === 0) return '';
  let out = '';
  for (const sp of elSpec.specializations) {
    out += `\\subsection*{${esc(sp.name)}}\n`;
    out += `\\addcontentsline{toc}{subsection}{${esc(sp.name)}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{6.5cm}m{0.7cm}m{1cm}m{1cm}m{1.7cm}m{0.7cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    const hdr = (t) => `{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}${t}}}`;
    out += `${hdr('Przedmiot')} & ${hdr('Sem.')} & ${hdr('Wyk.')} & ${hdr('Lab.')} & ${hdr('Zaliczenie')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    out += `${hdr('Przedmiot')} & ${hdr('Sem.')} & ${hdr('Wyk.')} & ${hdr('Lab.')} & ${hdr('Zaliczenie')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    (sp.items || []).forEach((item, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(item.name)} & ${item.semester||''} & ${item.lecture||0} & ${item.lab||0} & {\\scriptsize ${esc(formLabel(item.form))}} & ${item.ects||0} \\\\\n`;
    });
    out += `\\bottomrule\n\\end{longtable}}\n\n`;
  }
  return out;
}

// ── Przedmioty obieralne ──────────────────────────────────────────────────────
function obieralne(elOth) {
  if (!elOth || !elOth.groups || elOth.groups.length === 0) return '';
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
  for (const grp of (elOth.groups || [])) {
    if (SKIP.has(grp.id)) continue;
    if (!grp.items || grp.items.length === 0) continue;
    const label = grp.label || grp.id;
    out += `\\subsection*{${esc(label)}}\n`;
    out += `\\addcontentsline{toc}{subsection}{${esc(trimLabel(label))}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{5.5cm}m{0.8cm}m{1cm}m{1cm}m{1cm}m{1.7cm}m{0.7cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    const hdr = (t) => `{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}${t}}}`;
    out += `${hdr('Przedmiot')} & ${hdr('Kod')} & ${hdr('Wyk.')} & ${hdr('Ćw.')} & ${hdr('Lab.')} & ${hdr('Zaliczenie')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    out += `${hdr('Przedmiot')} & ${hdr('Kod')} & ${hdr('Wyk.')} & ${hdr('Ćw.')} & ${hdr('Lab.')} & ${hdr('Zaliczenie')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    grp.items.forEach((item, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(item.name)} & ${esc(item.code||'--')} & ${item.lecture||0} & ${item.tutorial||0} & ${item.lab||0} & {\\scriptsize ${esc(formLabel(item.form))}} & ${item.ects||0} \\\\\n`;
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

  ectsPrakt = Math.ceil(ectsPrakt);
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
  out += row('Kierunek przyporządkowany do dyscypliny:', 'Informatyka techniczna i telekomunikacja w dziedzinie nauk inżynieryjno-technicznych');
  out += `\\midrule\n`;
  out += row('Liczba semestrów:', `${semCount}`);
  out += row('Liczba punktów ECTS konieczna do ukończenia studiów:', '210');
  out += row('Tytuł zawodowy nadawany absolwentom:', 'inżynier');
  out += `\\midrule\n`;
  out += row('Łączna liczba godzin zajęć:', `${totalH}`);
  out += row('Liczba punktów ECTS z dziedziny nauk humanistycznych lub społecznych:', '12');
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
  \\textbf{Łączna liczba ECTS:}   & ${totalEcts} + 32 (praktyki zawodowe) \\\\[3pt]
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
  \\item Architektury oprogramowania i technologie DevOps
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

Wszyscy studenci studiów pierwszego stopnia na kierunku Informatyka zobowiązani są do zrealizowania praktyk zawodowych w wymiarze \\textbf{720 godzin zegarowych (960 godzin lekcyjnych)}. Praktykom zawodowym przypisano \\textbf{32 punkty ECTS}.

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

// ── English helpers ───────────────────────────────────────────────────────────
function formLabelEn(f) {
  if (f === 'EZ') return 'exam';
  if (f === 'Z')  return 'credit';
  return f || '';
}

const MNISW_OPIS_EN = {
  'P6S_WG': 'General knowledge -- foundations of exact and technical sciences relevant to computer science',
  'P6S_WK': 'Field knowledge -- theories, principles and methods specific to computer science',
  'P6S_UW': 'Skills -- applying knowledge to solve computer science problems',
  'P6S_UK': 'Skills -- communicating within the field of specialisation',
  'P6S_UO': 'Skills -- planning and organising individual and team work',
  'P6S_UU': 'Skills -- self-directed lifelong learning',
  'P6S_KK': 'Competences -- critical assessment of possessed knowledge',
  'P6S_KO': 'Competences -- responsible fulfilment of professional roles',
  'P6S_KR': 'Competences -- defining and accepting professional responsibility',
  'InzA_W': 'Engineering knowledge -- design and development methodologies for systems (eng.)',
  'InzA_U': 'Engineering skills -- design and implementation of systems (eng.)',
};

function efektySectionEn(ef) {
  const ec = ef.efekty_ksztalcenia;
  const mnisw = getUniqueMnisw(ec);
  let out = '';

  if (mnisw.length > 0) {
    out += `\\subsection*{Reference to the Polish Qualifications Framework (PQF)}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{2.8cm}m{12cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}PQF Code}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Characteristic}} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}PQF Code}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Characteristic}} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    mnisw.forEach((m, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(m.kod)} & ${esc(MNISW_OPIS_EN[m.kod] || '---')} \\\\\n`;
    });
    out += `\\bottomrule\n\\end{longtable}}\n\n\\bigskip\n`;
  }

  out += `\\subsection*{K -- Knowledge}\n\n${efektyListEn(ec.wiedza, 'K')}`;
  out += `\\subsection*{S -- Skills}\n\n${efektyListEn(ec.umiejetnosci, 'S')}`;
  out += `\\subsection*{C -- Social Competences}\n\n${efektyListEn(ec.kompetencje_spoleczne, 'C')}`;
  return out;
}

function efektyListEn(items, prefix) {
  let out = `{\\scriptsize\n\\begin{longtable}{m{1cm}m{8.8cm}m{2.1cm}m{2.5cm}}\n`;
  out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Code}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Learning outcome}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}PQF codes}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Courses}} \\\\\n\\midrule\\thdend\n`;
  out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed} {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Code}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Learning outcome}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}PQF codes}} & {\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}Courses}} \\\\\n\\midrule\\thdend\n\\endhead\n`;
  items.forEach((item, i) => {
    const kod  = item.kod_efektu || `${prefix}${String(i+1).padStart(2,'0')}`;
    const bg   = (i % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
    const prk  = item.mnsiw
      ? [...new Map(item.mnsiw.map(m => [m.kod + (m.inzynierskie ? '_inz' : ''), m])).values()]
          .map(m => m.inzynierskie ? `${esc(m.kod)} {\\scriptsize (eng.)}` : esc(m.kod))
          .join(', ')
      : '';
    const kodyPrzedm = item.kody ? item.kody.map(k => esc(k)).join(', ') : '';
    out += `${bg}${esc(kod)} & ${esc(item.tresc)} & {\\scriptsize ${prk}} & {\\scriptsize ${kodyPrzedm}} \\\\\n`;
  });
  out += `\\bottomrule\n\\end{longtable}}\n\n`;
  return out;
}

function planStudiowEn(semesters, elOth) {
  const groupMap = {};
  for (const g of (elOth.groups || [])) groupMap[g.id] = g;
  let out = '';

  for (const sem of semesters) {
    const printed0 = new Set();
    let rowCount = 2;
    for (const subj of sem.subjects) {
      if (subj.type === 'O' && subj.electiveGroup) {
        if (!printed0.has(subj.electiveGroup)) { printed0.add(subj.electiveGroup); rowCount++; }
      } else { rowCount++; }
    }
    const neededLines = Math.ceil(rowCount * 1.9) + 3;
    if (sem.semester === 5 || sem.semester === 7) {
      out += `\\clearpage\n`;
    } else {
      out += `\\Needspace{${neededLines}\\baselineskip}\n`;
    }
    out += `\\subsection*{Semester ${sem.semester}}\n`;
    out += `\\addcontentsline{toc}{subsection}{Semester ${sem.semester}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{5.0cm}m{1.9cm}m{0.75cm}m{0.85cm}m{0.85cm}m{0.85cm}m{1.45cm}m{0.9cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    const hdr = (t) => `{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}${t}}}`;
    out += `${hdr('Course name')} & ${hdr('Type')} & ${hdr('Code')} & ${hdr('Lec.')} & ${hdr('Tut.')} & ${hdr('Lab.')} & ${hdr('Assessment')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    out += `${hdr('Course name')} & ${hdr('Type')} & ${hdr('Code')} & ${hdr('Lec.')} & ${hdr('Tut.')} & ${hdr('Lab.')} & ${hdr('Assessment')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n\\endhead\n`;

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
        const rawLbl = grp ? grp.label : subj.name;
        const lbl    = esc(trimLabel(rawLbl));
        const typ    = grpId.startsWith('SPEC') ? 'specialisation' : 'elective';
        out += `\\rowcolor{tableElective} ${lbl} & {\\scriptsize ${typ}} & -- & ${tL} & ${tT} & ${tLb} & {\\scriptsize ${esc(formLabelEn(form))}} & ${tE} \\\\\n`;
      } else if (subj.type === 'O' && !grpId) {
        const bg = zebraColor ? `\\rowcolor{${zebraColor}} ` : '';
        out += `${bg}${esc(subj.name)} & {\\scriptsize elective} & ${esc(subj.code)} & ${subj.lecture||0} & ${subj.tutorial||0} & ${subj.lab||0} & {\\scriptsize ${esc(formLabelEn(subj.form))}} & ${subj.ects||0} \\\\\n`;
      } else if (subj.type !== 'O') {
        const bg = zebraColor ? `\\rowcolor{${zebraColor}} ` : '';
        out += `${bg}${esc(subj.name)} & {\\scriptsize compulsory} & ${esc(subj.code)} & ${subj.lecture||0} & ${subj.tutorial||0} & ${subj.lab||0} & {\\scriptsize ${esc(formLabelEn(subj.form))}} & ${subj.ects||0} \\\\\n`;
      }
    }
    const s = sem.summary;
    out += `\\midrule[\\heavyrulewidth]\n\\rowcolor{tableSummary} \\textbf{Semester ${sem.semester} total} & & & \\textbf{${s.lecture}} & \\textbf{${s.tutorial}} & \\textbf{${s.lab}} & & \\textbf{${s.ects}} \\\\\n\\bottomrule\n`;
    out += `\\end{longtable}}\n\n`;
  }

  const tL  = semesters.reduce((a,s)=>a+s.summary.lecture,0);
  const tT  = semesters.reduce((a,s)=>a+s.summary.tutorial,0);
  const tLb = semesters.reduce((a,s)=>a+s.summary.lab,0);
  const tE  = semesters.reduce((a,s)=>a+s.summary.ects,0);
  out += `\\subsection*{Summary}\n\\addcontentsline{toc}{subsection}{Study plan summary}\n\n`;
  out += `\\begin{tabular}{lrrrr}\n\\toprule\n`;
  out += `\\rowcolor{pjatkRed} {\\color{white}} & {\\color{white}\\textbf{Lectures}} & {\\color{white}\\textbf{Tutorials}} & {\\color{white}\\textbf{Laboratories}} & {\\color{white}\\textbf{ECTS}} \\\\\n\\midrule\n`;
  out += `\\textbf{TOTAL} & \\textbf{${tL}} & \\textbf{${tT}} & \\textbf{${tLb}} & \\textbf{${tE}} \\\\\n\\bottomrule\n\\end{tabular}\n\n`;
  return out;
}

function specjalizacjeEn(elSpec) {
  if (!elSpec || !elSpec.specializations || elSpec.specializations.length === 0) return '';
  let out = '';
  for (const sp of elSpec.specializations) {
    out += `\\subsection*{${esc(sp.name)}}\n`;
    out += `\\addcontentsline{toc}{subsection}{${esc(sp.name)}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{6.5cm}m{0.7cm}m{1cm}m{1cm}m{1.7cm}m{0.7cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    const hdr = (t) => `{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}${t}}}`;
    out += `${hdr('Course')} & ${hdr('Sem.')} & ${hdr('Lec.')} & ${hdr('Lab.')} & ${hdr('Assessment')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    out += `${hdr('Course')} & ${hdr('Sem.')} & ${hdr('Lec.')} & ${hdr('Lab.')} & ${hdr('Assessment')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    (sp.items || []).forEach((item, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(item.name)} & ${item.semester||''} & ${item.lecture||0} & ${item.lab||0} & {\\scriptsize ${esc(formLabelEn(item.form))}} & ${item.ects||0} \\\\\n`;
    });
    out += `\\bottomrule\n\\end{longtable}}\n\n`;
  }
  return out;
}

function obieralneEn(elOth) {
  if (!elOth || !elOth.groups || elOth.groups.length === 0) return '';
  const SKIP = new Set([
    'SPEC_5','SPEC_6','SPEC_7','SPEC_8',
    'PRZ1','PRZ2','PSEM','BYT',
    'LEK2','LEK3','LEK4','LEK5',
  ]);
  let out = '';
  for (const grp of (elOth.groups || [])) {
    if (SKIP.has(grp.id)) continue;
    if (!grp.items || grp.items.length === 0) continue;
    const label = grp.label || grp.id;
    out += `\\subsection*{${esc(label)}}\n`;
    out += `\\addcontentsline{toc}{subsection}{${esc(trimLabel(label))}}\n\n`;
    out += `{\\scriptsize\n\\begin{longtable}{m{5.5cm}m{0.8cm}m{1cm}m{1cm}m{1cm}m{1.7cm}m{0.7cm}}\n`;
    out += `\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    const hdr = (t) => `{\\color{white}\\footnotesize\\textbf{\\vphantom{Ag}${t}}}`;
    out += `${hdr('Course')} & ${hdr('Code')} & ${hdr('Lec.')} & ${hdr('Tut.')} & ${hdr('Lab.')} & ${hdr('Assessment')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n`;
    out += `\\endfirsthead\n\\thdrule\\toprule\n\\rowcolor{pjatkRed}\n`;
    out += `${hdr('Course')} & ${hdr('Code')} & ${hdr('Lec.')} & ${hdr('Tut.')} & ${hdr('Lab.')} & ${hdr('Assessment')} & ${hdr('ECTS')} \\\\\n\\midrule\\thdend\n\\endhead\n`;
    grp.items.forEach((item, idx) => {
      const bg = (idx % 2 === 1) ? `\\rowcolor{tableRowAlt} ` : `\\rowcolor{tableRowLight} `;
      out += `${bg}${esc(item.name)} & ${esc(item.code||'--')} & ${item.lecture||0} & ${item.tutorial||0} & ${item.lab||0} & {\\scriptsize ${esc(formLabelEn(item.form))}} & ${item.ects||0} \\\\\n`;
    });
    out += `\\bottomrule\n\\end{longtable}}\n\n`;
  }
  return out;
}

function charTabelaEn(isSt, semCount, semesters, elOth) {
  const forma = isSt ? 'Full-time studies' : 'Part-time studies';

  const totalH = semesters.reduce((a,s) => a + s.summary.lecture + s.summary.tutorial + s.summary.lab, 0);

  const humCodes = new Set(['HKJ','WDZ','SAI']);
  const humGroups = new Set(
    (elOth.groups||[]).filter(g => g.id.startsWith('HUM')).map(g => g.id)
  );
  let ectsHum = 0;
  for (const s of semesters) {
    for (const subj of s.subjects) {
      if (humCodes.has(subj.code)) { ectsHum += subj.ects||0; continue; }
    }
  }
  for (const g of (elOth.groups||[])) {
    if (g.id.startsWith('HUM') && g.items && g.items.length > 0) { ectsHum += 2; }
  }

  const totalKontakt = totalH;

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
  ectsPrakt = Math.ceil(ectsPrakt);

  const row = (label, value) =>
    `  {\\small ${label}} & {\\small\\textbf{${value}}} \\\\\n`;

  let out = `{\\renewcommand{\\arraystretch}{1.4}\n`;
  out += `\\begin{tabularx}{\\textwidth}{@{}Xp{8.5cm}@{}}\n`;
  out += `\\toprule\n`;
  out += row('Programme name:', 'Computer Science');
  out += row('Level:', 'First-cycle (Bachelor with Engineering title)');
  out += row('Profile:', 'Practical');
  out += row('Mode:', forma);
  out += row('Language of instruction:', 'Polish');
  out += row('Discipline:', 'Information and Communication Technology in Technical and Engineering Sciences');
  out += `\\midrule\n`;
  out += row('Number of semesters:', `${semCount}`);
  out += row('ECTS credits required to graduate:', '210');
  out += row('Professional title conferred:', 'Engineer');
  out += `\\midrule\n`;
  out += row('Total number of contact hours:', `${totalH}`);
  out += row('ECTS credits in humanities/social sciences:', '12');
  out += row('Contact hours with academic staff:', `${totalKontakt}`);
  out += row('ECTS credits assigned to practical-skills courses:', `${ectsPrakt}`);
  out += row('ECTS credits obtained through elective courses:', '66');
  out += `\\bottomrule\n`;
  out += `\\end{tabularx}}\n\n\\bigskip\n`;
  return out;
}

function buildDocumentEn(tryb, semesters, elSpec, elOth, ef) {
  const isSt      = tryb === 'stacjonarny';
  const formaEN   = isSt ? 'full-time' : 'part-time';
  const semCount  = semesters.length;
  const totalEcts = semesters.reduce((a,s) => a + s.summary.ects, 0);
  const logoPdf   = '../latex/PJATK_pl_poziom_1';
  const sygnetPdf = '../latex/PJATK_pl_sygnet';

  return `% ============================================================
%  Study Programme -- ${formaEN}  PJATK Gdansk Branch
% ============================================================
\\documentclass[12pt,a4paper]{article}

\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[english]{babel}
\\usepackage{lmodern}
\\usepackage[scaled=1.0]{helvet}
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

\\AtBeginDocument{\\hypersetup{linkcolor=black}}

\\definecolor{pjatkRed}{RGB}{220,38,38}
\\definecolor{pjatkGray}{RGB}{80,80,80}
\\definecolor{pjatkLightGray}{RGB}{245,245,245}
\\definecolor{tableHeader}{RGB}{220,223,230}
\\definecolor{tableRowLight}{RGB}{242,243,246}
\\definecolor{tableRowAlt}{RGB}{205,209,218}
\\definecolor{tableElective}{RGB}{255,235,235}
\\definecolor{tableChild}{RGB}{255,245,245}
\\definecolor{tableSummary}{RGB}{195,199,210}
\\definecolor{descBorder}{RGB}{220,38,38}

\\setlength{\\extrarowheight}{4pt}
\\renewcommand{\\arraystretch}{1.35}

\\newcommand{\\thdrule}{\\noalign{\\global\\setlength{\\extrarowheight}{0pt}}}
\\newcommand{\\thdend}{\\noalign{\\global\\setlength{\\extrarowheight}{4pt}}}

\\setlength{\\headheight}{14pt}
\\pagestyle{fancy}\\fancyhf{}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0.4pt}
\\fancyhead[L]{\\small\\textcolor{pjatkGray}{PJATK -- Gdansk Branch \\textbar\\ Computer Science}}
\\fancyhead[R]{\\small\\textcolor{pjatkGray}{Study Programme -- ${formaEN}}}
\\fancyfoot[C]{\\small\\thepage}

\\titleformat{\\section}{\\large\\bfseries\\color{pjatkRed}}{\\thesection.}{0.5em}{}
  [\\color{pjatkRed}\\rule{\\linewidth}{0.8pt}]
\\titleformat{\\subsection}{\\normalsize\\bfseries\\color{pjatkGray}}{\\thesubsection.}{0.5em}{}
\\setlist{noitemsep,topsep=3pt,parsep=2pt}

\\newmdenv[linecolor=pjatkRed,linewidth=1.2pt,backgroundcolor=pjatkLightGray,
  innerleftmargin=10pt,innerrightmargin=10pt,innertopmargin=8pt,
  innerbottommargin=8pt,roundcorner=4pt]{infobox}

% =============================================================
\\begin{document}

\\AddToShipoutPictureBG{%
  \\begin{tikzpicture}[remember picture,overlay]
    \\node[opacity=0.35,anchor=south] at (current page.south){%
      \\includegraphics[width=10cm]{${sygnetPdf}}};
  \\end{tikzpicture}}

\\begin{center}
  \\includegraphics[height=2cm]{${logoPdf}}\\\\[0.8cm]
  {\\LARGE\\bfseries\\color{pjatkRed} STUDY PROGRAMME}\\\\[0.8cm]
\\end{center}

\\begin{infobox}
\\begin{tabularx}{\\textwidth}{@{}lX@{}}
  \\textbf{Institution:}              & Polish-Japanese Academy of Information Technology \\\\[3pt]
  \\textbf{Faculty / Branch:}         & Faculty of Information Technology, Gdansk Branch \\\\[3pt]
  \\textbf{Programme / Profile:}      & Computer Science / practical \\\\[3pt]
  \\textbf{Level:}                    & first-cycle (engineering) \\\\[3pt]
  \\textbf{Mode:}                     & ${formaEN} \\\\[3pt]
  \\textbf{Number of semesters:}      & ${semCount} \\\\[3pt]
  \\textbf{Language of instruction:}  & Polish \\\\[3pt]
  \\textbf{Total ECTS credits:}       & ${totalEcts} + 32 (work placement) \\\\[3pt]
  \\textbf{Academic year:}            & 2026/2027 \\\\
\\end{tabularx}
\\end{infobox}

\\vspace{0.6cm}
\\begin{mdframed}[linecolor=pjatkGray,linewidth=0.6pt,backgroundcolor=white,
  innerleftmargin=10pt,innerrightmargin=10pt,innertopmargin=6pt,innerbottommargin=6pt]
{\\small\\textbf{Legal basis:}\\\\[4pt]
Art.~53 and Art.~67 of the Act -- Law on Higher Education and Science of 20 July 2018 (Journal of Laws 2018, item~1668), the Regulation of the Minister of Science and Higher Education of 27 September 2018 on higher education studies, and the Regulation of the Minister of Science and Higher Education of 14 November 2018 on second-level characteristics of learning outcomes for qualifications at levels 6--8 of the Polish Qualifications Framework.}
\\end{mdframed}

\\vspace{1cm}
\\thispagestyle{empty}
\\newpage
\\setcounter{page}{1}

\\tableofcontents
\\newpage

% =============================================================
\\section{Programme characteristics}

${charTabelaEn(isSt, semCount, semesters, elOth)}

\\newpage

The \\textbf{Computer Science} programme at the Gdansk Branch of the Polish-Japanese Academy of Information Technology (PJATK) has a \\textbf{practical} profile and lasts \\textbf{${semCount} semesters}. Graduates are awarded the professional title of \\textbf{Engineer of Computer Science}.

\\subsection{Objectives and scope of education}

The aim of the programme is to equip students with the knowledge, skills and social competences necessary for independently designing, developing and maintaining information systems. The curriculum covers, among other areas: object-oriented and functional programming, databases, computer networks, operating systems, artificial intelligence, computer graphics, information security, and project management.

\\subsection{Admission requirements}

Applicants are required to hold a secondary school leaving certificate (\\textit{matura}).

\\subsection{Graduation requirements}

Students must complete all courses listed in the study plan, obtain at least \\textbf{210 ECTS credits}, and successfully defend their engineering thesis.

\\subsection{Specialisations}

Within the programme, each student chooses one of five specialisations:
\\begin{itemize}
  \\item Software Architecture and DevOps Technologies
  \\item Cybersecurity
  \\item Computer Game Engineering
  \\item Artificial Intelligence
  \\item Internet of Things
\\end{itemize}

\\newpage

% =============================================================
\\section{Programme learning outcomes}

The tables below present the full set of learning outcomes defined in the Regulation of the Minister of Science and Higher Education of 14 November 2018 on second-level characteristics of learning outcomes for qualifications at levels 6--8 of the Polish Qualifications Framework, issued pursuant to Art.~68(3) of the Act, setting out the education standards for the study programme presented herein.

${efektySectionEn(ef)}

\\newpage

% =============================================================
\\section{Study plan}

\\bigskip

${planStudiowEn(semesters, elOth)}

\\newpage

% =============================================================
\\section{Work placement}

\\subsection*{Scope, rules and form of work placement}

All first-cycle Computer Science students are required to complete a work placement of \\textbf{720 hours (960 academic hours)}. The placement is assigned \\textbf{32 ECTS credits}.

Placements may be completed during the academic year, in Poland or abroad, provided they do not interfere with studies. Students may use offers posted on the Academic Career Office portal or propose their own employer, subject to approval. The nature of the placement must be consistent with the curriculum and enable the achievement of the defined learning outcomes.

Placements may be paid or unpaid. The Academy does not cover any costs related to their organisation.

The person responsible for verifying and signing off placements on behalf of PJATK is the \\textbf{Rector's Representative for Student Placements}.

Settlement is based on a placement report and supplementary attachments. Paid employment, internships or volunteering may be counted as a placement if the duties performed enable the achievement of the defined learning outcomes and the student holds student status during that period.

Placement settlement documents must be submitted via the \\textit{Placements} module in the GAKKO system within the relevant settlement deadline before the thesis defence. Placements are not credited if formal requirements are not met.

Detailed information on work placements can be found in the \\textbf{Student Placement Regulations}.

\\newpage

% =============================================================
\\section{Elective courses}

${obieralneEn(elOth)}

\\newpage

% =============================================================
\\section{Specialisations}

Each student chooses one specialisation for the entire duration of their studies. Specialisation courses are delivered in the semesters indicated in the tables below.

${specjalizacjeEn(elSpec)}

\\end{document}
`;
}

// --- Zapis z dodatkiem AI: dołączamy wygenerowany rozdział przed \n\\end{document}
function injectAI(tex) {
  if (!aiProgram) return tex;
  const marker = `\\end{document}`;
  const aiTex = aiChapter(aiProgram);
  if (!aiTex) return tex;
  return tex.replace(marker, aiTex + '\n' + marker);
}

const texS   = injectAI(buildDocument('stacjonarny',    programS.semesters,   elSpecS,   elOthS,   efekty));
const texN   = injectAI(buildDocument('niestacjonarny', programN.semesters,   elSpecN,   elOthN,   efekty));
const texSen =          buildDocumentEn('stacjonarny',  programSen.semesters, elSpecSen, elOthSen, efekty);
const texNen =          buildDocumentEn('niestacjonarny', programNen.semesters, elSpecNen, elOthNen, efekty);

writeFileSync(`${__dir}/program_stacjonarne.tex`,        texS,   'utf8');
writeFileSync(`${__dir}/program_niestacjonarne.tex`,     texN,   'utf8');
writeFileSync(`${__dir}/program_stacjonarne_en.tex`,     texSen, 'utf8');
writeFileSync(`${__dir}/program_niestacjonarne_en.tex`,  texNen, 'utf8');

process.stdout.write('OK: program_stacjonarne.tex\nOK: program_niestacjonarne.tex\nOK: program_stacjonarne_en.tex\nOK: program_niestacjonarne_en.tex\n');
