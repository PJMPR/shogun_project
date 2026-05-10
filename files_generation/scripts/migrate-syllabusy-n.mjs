/**
 * Migracja plików JSON sylabusów niestacjonarnych do nowego formatu
 * (takiego samego jak syllabusy stacjonarne)
 *
 * Zmiany:
 * 1. tresci_programowe: string[] -> {nr_zajec, wyklad, cwiczenia}[]
 * 2. kryteria_oceny: string[] -> {wyklad: [], cwiczenia_laboratorium: []}
 * 3. metody_dydaktyczne: {} -> {wyklad: [], cwiczenia_laboratorium: []}
 * 4. godziny: dodanie praca_wlasna_studenta
 * 5. dodanie cel_dydaktyczny_eng, informacje_dodatkowe, rynek_pracy, wymagania_laboratorium
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const DIR_N = 'C:/Users/adamu/WebstormProjects/pj-studies/public/assets/syllabusy-n';
const DIR_S = 'C:/Users/adamu/WebstormProjects/pj-studies/public/assets/syllabusy';

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf-8'));
}

function migrateKryteriaOceny(kryteria) {
    // Jeśli już jest w nowym formacie (obiekt) - nie zmieniaj
    if (!Array.isArray(kryteria)) return kryteria;

    // Stary format: tablica stringów - próbujemy podzielić na wykład / ćwiczenia
    // Heurystyka: szukamy słów kluczowych "wykład", "egzamin" vs "ćwiczenia", "kolokwium", "laboratorium"
    const wyklady = [];
    const cwiczenia = [];

    for (const k of kryteria) {
        const lk = k.toLowerCase();
        if (
            lk.includes('egzamin') ||
            lk.includes('wykład') ||
            lk.includes('wyklad')
        ) {
            wyklady.push(k);
        } else if (
            lk.includes('kolokwium') ||
            lk.includes('laboratorium') ||
            lk.includes('projekt') ||
            lk.includes('ćwiczeni') ||
            lk.includes('cwiczeni') ||
            lk.includes('kartkówk') ||
            lk.includes('kartkówka') ||
            lk.includes('referat') ||
            lk.includes('aktywność') ||
            lk.includes('aktywnosc')
        ) {
            cwiczenia.push(k);
        } else {
            // Wrzuć do obu jeśli ogólne
            cwiczenia.push(k);
        }
    }

    return {
        wyklad: wyklady,
        cwiczenia_laboratorium: cwiczenia
    };
}

function migrateTresci(tresci) {
    // Jeśli już jest w nowym formacie
    if (!Array.isArray(tresci)) return tresci;
    if (tresci.length === 0) return [];
    if (typeof tresci[0] === 'object' && tresci[0] !== null && 'nr_zajec' in tresci[0]) return tresci;

    // Stary format: string[]
    return tresci.map((t, i) => ({
        nr_zajec: i + 1,
        wyklad: typeof t === 'string' ? t : '',
        cwiczenia: ''
    }));
}

function migrateMetodyDydaktyczne(metody, stacjonarny) {
    // Jeśli już jest w nowym formacie (ma klucze wyklad / cwiczenia_laboratorium)
    if (metody && (Array.isArray(metody.wyklad) || Array.isArray(metody.cwiczenia_laboratorium))) return metody;

    // Jeśli pusty obiekt {} - spróbuj wziąć ze stacjonarnego
    if (stacjonarny && stacjonarny.metody_dydaktyczne &&
        (Array.isArray(stacjonarny.metody_dydaktyczne.wyklad) || Array.isArray(stacjonarny.metody_dydaktyczne.cwiczenia_laboratorium))) {
        return stacjonarny.metody_dydaktyczne;
    }

    return { wyklad: [], cwiczenia_laboratorium: [] };
}

function files() {
    return readdirSync(DIR_N).filter(f => f.endsWith('.json'));
}

let migrated = 0;
let skipped = 0;
let errors = 0;

for (const file of files()) {
    const pathN = join(DIR_N, file);
    const pathS = join(DIR_S, file);

    try {
        const dataN = readJson(pathN);
        const s = dataN.sylabus;

        // Wczytaj odpowiednik stacjonarny jeśli istnieje
        let sS = null;
        if (existsSync(pathS)) {
            try {
                sS = readJson(pathS).sylabus;
            } catch (_) {}
        }

        let changed = false;

        // 1. tresci_programowe
        if (Array.isArray(s.tresci_programowe) && s.tresci_programowe.length > 0 && typeof s.tresci_programowe[0] === 'string') {
            // Jeśli stacjonarny ma już nowy format z tymi samymi treściami - użyj go
            if (sS && Array.isArray(sS.tresci_programowe) && sS.tresci_programowe.length > 0 && typeof sS.tresci_programowe[0] === 'object') {
                // Użyj treści ze stacjonarnego ale dostosuj liczbę zajęć (niestacjonarny może mieć mniej godzin)
                // Zachowamy tę samą listę - oba programy mają te same treści tylko inną liczbę godzin
                s.tresci_programowe = sS.tresci_programowe;
            } else {
                s.tresci_programowe = migrateTresci(s.tresci_programowe);
            }
            changed = true;
        }

        // 2. kryteria_oceny
        if (Array.isArray(s.kryteria_oceny)) {
            if (sS && sS.kryteria_oceny && !Array.isArray(sS.kryteria_oceny)) {
                // Stacjonarny ma już nowy format - użyj go
                s.kryteria_oceny = sS.kryteria_oceny;
            } else {
                s.kryteria_oceny = migrateKryteriaOceny(s.kryteria_oceny);
            }
            changed = true;
        }

        // 3. metody_dydaktyczne
        const oldMetody = s.metody_dydaktyczne;
        const nowyMetodyFormat = oldMetody && (Array.isArray(oldMetody.wyklad) || Array.isArray(oldMetody.cwiczenia_laboratorium));
        if (!nowyMetodyFormat) {
            s.metody_dydaktyczne = migrateMetodyDydaktyczne(oldMetody, sS);
            changed = true;
        }

        // 4. godziny - praca_wlasna_studenta
        if (!s.godziny.praca_wlasna_studenta) {
            if (sS && sS.godziny && sS.godziny.praca_wlasna_studenta) {
                s.godziny.praca_wlasna_studenta = sS.godziny.praca_wlasna_studenta;
            } else {
                s.godziny.praca_wlasna_studenta = '';
            }
            changed = true;
        }

        // 5. cel_dydaktyczny_eng
        if (!s.cel_dydaktyczny_eng) {
            if (sS && sS.cel_dydaktyczny_eng) {
                s.cel_dydaktyczny_eng = sS.cel_dydaktyczny_eng;
            } else {
                s.cel_dydaktyczny_eng = '';
            }
            changed = true;
        }

        // 6. informacje_dodatkowe
        if (s.informacje_dodatkowe === undefined) {
            // Nie kopiujemy testowych danych ze stacjonarnego - dajemy puste
            s.informacje_dodatkowe = '';
            changed = true;
        }

        // 7. rynek_pracy
        if (!s.rynek_pracy) {
            s.rynek_pracy = {
                dziedzina_gospodarki: '',
                zawody: '',
                prace_dyplomowe: []
            };
            changed = true;
        } else {
            // upewnij się że ma wszystkie pola
            if (s.rynek_pracy.dziedzina_gospodarki === undefined) { s.rynek_pracy.dziedzina_gospodarki = ''; changed = true; }
            if (s.rynek_pracy.zawody === undefined) { s.rynek_pracy.zawody = ''; changed = true; }
            if (s.rynek_pracy.prace_dyplomowe === undefined) { s.rynek_pracy.prace_dyplomowe = []; changed = true; }
        }

        // 8. wymagania_laboratorium
        if (!s.wymagania_laboratorium) {
            s.wymagania_laboratorium = {
                pc_params: [],
                software: [],
                wyposazenie_dodatkowe: []
            };
            changed = true;
        } else {
            if (!Array.isArray(s.wymagania_laboratorium.pc_params)) { s.wymagania_laboratorium.pc_params = []; changed = true; }
            if (!Array.isArray(s.wymagania_laboratorium.software)) { s.wymagania_laboratorium.software = []; changed = true; }
            if (!Array.isArray(s.wymagania_laboratorium.wyposazenie_dodatkowe)) { s.wymagania_laboratorium.wyposazenie_dodatkowe = []; changed = true; }
        }

        if (changed) {
            writeFileSync(pathN, JSON.stringify(dataN, null, 4), 'utf-8');
            console.log(`✅ ${file} - zaktualizowany`);
            migrated++;
        } else {
            console.log(`⏭️  ${file} - już w nowym formacie`);
            skipped++;
        }
    } catch (e) {
        console.error(`❌ ${file} - BŁĄD: ${e.message}`);
        errors++;
    }
}

console.log(`\n📊 Podsumowanie: ${migrated} zaktualizowanych, ${skipped} pominiętych, ${errors} błędów.`);

