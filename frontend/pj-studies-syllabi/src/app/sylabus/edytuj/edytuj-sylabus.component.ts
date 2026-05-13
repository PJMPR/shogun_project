import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ShogunApiService } from '../../shared/shogun-api.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { MultiSelectModule } from 'primeng/multiselect';
import { SylabusPreviewComponent } from '../../shared/sylabus-preview/sylabus-preview.component';
import {
  SylabusData,
  ProgramData,
  ElectivesOtherData,
  ElectivesSpecializationsData,
} from '../../models/program.models';

export interface SubjectOption {
  label: string;
  value: string;        // unikalny klucz: "kod|nazwa"
  code: string;
  name: string;
  syllabusFile: string | null;  // null = brak sylabusa
  hasSylabus: boolean;
  semester: number;
  lecture: number;
  tutorial: number;
  lab: number;
  ects: number;
  form: string;
  type: string;
}

interface PrzedmiotWprowadzajacy {
  nazwa: string;
  wymagania: string;
}

interface TrescProgramowa {
  nr_zajec: number | null;
  wyklad: string;
  cwiczenia: string;
}

interface EfektItem {
  keu: string;
  peu: string;
  metoda_weryfikacji: string;
}

interface EditForm {
  odpowiedzialny: string;
  rok_studiow: number | null;
  semestr_studiow: number | null;
  obligatoryjny: boolean;
  ects: number | null;
  wyklady: number | null;
  cwiczenia: number | null;
  laboratorium: number | null;
  z_udzialem_prowadzacego_h: number | null;
  praca_wlasna_studenta_h: number | null;
  calkowita_liczba_godzin_h: number | null;
  praca_wlasna_studenta: string;
  zaliczenie_wyklad: string;
  zaliczenie_cwiczenia: string;
  zaliczenie_laboratorium: string;
  cel_dydaktyczny: string;
  cel_dydaktyczny_eng: string;
  kryteria_wyklad: string[];
  kryteria_cwiczenia_laboratorium: string[];
  metody_wyklad: string[];
  metody_cwiczenia_laboratorium: string[];
  przedmioty_wprowadzajace: PrzedmiotWprowadzajacy[];
  efekty_wiedza: EfektItem[];
  efekty_umiejetnosci: EfektItem[];
  efekty_kompetencje: EfektItem[];
  tresci_programowe: TrescProgramowa[];
  literatura_podstawowa_txt: string;
  literatura_uzupelniajaca_txt: string;
  literatura_internetowa_txt: string;
  informacje_dodatkowe: string;
  rynek_pracy_dziedzina: string;
  rynek_pracy_zawody: string;
  rynek_pracy_prace_txt: string;
  lab_pc_params_txt: string;
  lab_software_txt: string;
  lab_wyposazenie_txt: string;
}

const SPOSOBY_ZALICZENIA = [
  { label: '—', value: '' },
  { label: 'Zaliczenie', value: 'Zaliczenie' },
  { label: 'Zaliczenie z oceną', value: 'Zaliczenie z oceną' },
  { label: 'Egzamin', value: 'Egzamin' },
  { label: 'Nieoceniany', value: 'Nieoceniany' },
];

const TRYBY = [
  { label: 'Stacjonarny', value: 'stacjonarny' },
  { label: 'Niestacjonarny', value: 'niestacjonarny' },
];

@Component({
  selector: 'app-edytuj-sylabus',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, InputTextModule, InputNumberModule, TextareaModule,
    PanelModule, DividerModule, SelectModule, DialogModule, CheckboxModule,
    ProgressSpinnerModule, MessageModule, CardModule,
    MultiSelectModule,
    SylabusPreviewComponent,
  ],
  templateUrl: './edytuj-sylabus.component.html',
  styleUrl: './edytuj-sylabus.component.css',
})
export class EdytujSylabusComponent implements OnInit {

  sposobyZaliczenia = SPOSOBY_ZALICZENIA;
  trybOptions = TRYBY;

  // Krok 1 – wybór
  selectedTryb = 'stacjonarny';
  selectedSubjectOption: SubjectOption | null = null;
  subjectOptions: SubjectOption[] = [];
  loadingOptions = false;

  // Krok 2 – edycja
  loadingSylabus = false;
  loadError = '';
  loadedSylabus: SylabusData | null = null;
  loadedSyllabusId: string | null = null;
  originalSyllabusFile = '';

  form: EditForm = this.emptyForm();

  // Zapis do API
  savingToApi = false;
  saveApiSuccess = false;
  saveApiError = '';

  // Dialogi
  previewDialogVisible = false;
  previewSylabusData: SylabusData | null = null;
  jsonDialogVisible = false;
  jsonPreview = '';

  /** Opcje multiselect */
  metodyWykladOptions: { label: string; value: string }[] = [];
  metodyCwiczeniaOptions: { label: string; value: string }[] = [];
  krytyriaOptions: { label: string; value: string }[] = [];

  /** Opcje KEU per kategoria */
  keuWiedzaOptions: { label: string; value: string }[] = [];
  keuUmiejOptions:  { label: string; value: string }[] = [];
  keuKompOptions:   { label: string; value: string }[] = [];

  /** Opcje metody weryfikacji (z pliku JSON) */
  metodyWeryfikacjiOptions: { label: string; value: string }[] = [];

  constructor() {}
  private readonly shogunApi = inject(ShogunApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadSubjectOptions();
    this.shogunApi.getTeachingMethods().subscribe(data => {
      this.metodyWykladOptions = data.wyklad.map(m => ({ label: m, value: m }));
      this.metodyCwiczeniaOptions = data.cwiczenia_laboratorium.map(m => ({ label: m, value: m }));
      this.cdr.detectChanges();
    });
    this.shogunApi.getVerificationMethods().subscribe(data => {
      const opts = data.metody_weryfikacji.map(m => ({ label: m, value: m }));
      this.krytyriaOptions = opts;
      this.metodyWeryfikacjiOptions = opts;
      this.cdr.detectChanges();
    });
    this.shogunApi.getLearningOutcomes().subscribe(data => {
      const ef = data.efekty_ksztalcenia;
      const toOpts = (arr: { kod_efektu: string; tresc: string }[]) =>
        arr.map(e => ({ label: `${e.kod_efektu} – ${e.tresc}`, value: e.kod_efektu }));
      this.keuWiedzaOptions = toOpts(ef.wiedza ?? []);
      this.keuUmiejOptions  = toOpts(ef.umiejetnosci ?? []);
      this.keuKompOptions   = toOpts(ef.kompetencje_spoleczne ?? []);
      this.cdr.detectChanges();
    });
  }

  onTrybChange(): void {
    this.selectedSubjectOption = null;
    this.loadedSylabus = null;
    this.loadError = '';
    this.subjectOptions = [];
    this.loadSubjectOptions();
  }

  private loadSubjectOptions(): void {
    this.loadingOptions = true;
    const tryb = this.selectedTryb as 'stacjonarny' | 'niestacjonarny';

    forkJoin({
      program: this.shogunApi.getProgramData(tryb, false),
      elOther: this.shogunApi.getElectivesOther(tryb, false),
      elSpec:  this.shogunApi.getElectivesSpec(tryb, false),
    }).subscribe({
      next: ({ program, elOther, elSpec }) => {
        const opts: SubjectOption[] = [];
        const seen = new Set<string>();

        const hasCode = (code: string): boolean => !!code && code !== '-' && code !== '—';

        const add = (
          name: string, code: string, _syllabusFile: string | undefined,
          sem: number, lecture: number, tutorial: number, lab: number,
          ects: number, form: string, type: string
        ) => {
          const key = `${code}|${name}`;
          if (seen.has(key)) return;
          seen.add(key);

          const hasSyl = hasCode(code);
          const dispCode = hasSyl ? code : '—';

          opts.push({
            label: hasSyl
              ? `${dispCode} – ${name}`
              : `${dispCode} – ${name} ⚠ brak sylabusa`,
            value: key,
            code: dispCode,
            name,
            syllabusFile: null,
            hasSylabus: hasSyl,
            semester: sem,
            lecture, tutorial, lab, ects, form, type,
          });

        };

        // program.json — wszystkie przedmioty ze wszystkich semestrów
        for (const sem of program.semesters) {
          for (const s of sem.subjects) {
            add(s.name, s.code, (s as any).syllabusFile, sem.semester,
              s.lecture, s.tutorial, s.lab, s.ects, s.form, s.type);
          }
        }

        // electives-other.json
        for (const g of elOther.groups) {
          for (const item of g.items) {
            add(item.name, item.code, item.syllabusFile, g.semester,
              item.lecture, item.tutorial ?? 0, item.lab, item.ects, item.form, 'O');
          }
        }

        // electives-specializations.json
        for (const spec of elSpec.specializations) {
          for (const item of spec.items) {
            add(item.name, item.code, item.syllabusFile, item.semester,
              item.lecture, item.tutorial ?? 0, item.lab, item.ects, item.form, 'O');
          }
        }

        opts.sort((a, b) => {
          // Najpierw te z sylabusem, potem bez
          if (a.hasSylabus !== b.hasSylabus) return a.hasSylabus ? -1 : 1;
          return a.label.localeCompare(b.label, 'pl');
        });

        this.subjectOptions = opts;
        this.loadingOptions = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingOptions = false; this.cdr.detectChanges(); },
    });
  }

  loadSylabus(): void {
    if (!this.selectedSubjectOption) return;
    const opt = this.selectedSubjectOption;

    if (!opt.hasSylabus || !opt.code || opt.code === '—') {
      this.loadError = `Brak kodu przedmiotu dla "${opt.name}". Możesz go utworzyć na stronie "Nowy sylabus".`;
      return;
    }

    this.loadingSylabus = true;
    this.loadError = '';
    this.loadedSylabus = null;
    this.loadedSyllabusId = null;
    this.saveApiSuccess = false;
    this.saveApiError = '';
    this.originalSyllabusFile = opt.code;

    this.shogunApi.getSyllabusWithId(opt.code, this.selectedTryb).subscribe({
      next: (result) => {
        if (!result) {
          this.loadError = `Nie znaleziono sylabusa dla przedmiotu "${opt.name}" (${opt.code}).`;
          this.loadingSylabus = false;
          this.cdr.detectChanges();
          return;
        }
        this.loadedSyllabusId = result.id;
        this.loadedSylabus = result.sylabus;
        this.populateForm(result.sylabus);
        this.loadingSylabus = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = `Nie udało się załadować sylabusa dla kodu "${opt.code}".`;
        this.loadingSylabus = false;
        this.cdr.detectChanges();
      },
    });
  }

  private populateForm(s: SylabusData): void {
    const joinLines = (val: string | string[] | undefined | null): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join('\n');
      return val;
    };

    const getMet = (key: string): string[] => {
      const v = (s.metody_dydaktyczne as any)?.[key];
      return Array.isArray(v) ? v : (v ? [v] : []);
    };

    const getZal = (forma: string): string => s.zaliczenie?.[forma]?.sposob ?? '';

    const docInternet = s.literatura?.dokumentacja_internetowa
      ? Object.keys(s.literatura.dokumentacja_internetowa).join('\n') : '';

    let kryt_wyklad: string[] = [];
    let kryt_cwiczenia: string[] = [];
    const ko = s.kryteria_oceny as any;
    if (ko && !Array.isArray(ko) && typeof ko === 'object') {
      kryt_wyklad = Array.isArray(ko.wyklad) ? ko.wyklad : [];
      kryt_cwiczenia = Array.isArray(ko.cwiczenia_laboratorium) ? ko.cwiczenia_laboratorium : [];
    } else if (Array.isArray(ko)) {
      kryt_wyklad = ko;
    }

    let tresci: TrescProgramowa[] = [];
    const tp = s.tresci_programowe as any;
    if (Array.isArray(tp) && tp.length > 0) {
      if (typeof tp[0] === 'object' && 'nr_zajec' in tp[0]) {
        tresci = tp.map((t: any) => ({ nr_zajec: t.nr_zajec, wyklad: t.wyklad ?? '', cwiczenia: t.cwiczenia ?? '' }));
      } else {
        tresci = tp.map((t: string, i: number) => ({ nr_zajec: i + 1, wyklad: t, cwiczenia: '' }));
      }
    }
    if (tresci.length === 0) tresci = [{ nr_zajec: 1, wyklad: '', cwiczenia: '' }];

    const rp = (s as any).rynek_pracy;
    const wl = (s as any).wymagania_laboratorium;

    this.form = {
      odpowiedzialny: s.odpowiedzialny_za_przedmiot ?? '',
      rok_studiow: s.rok_studiow,
      semestr_studiow: s.semestr_studiow,
      obligatoryjny: s.obligatoryjny ?? true,
      ects: s.ects,
      wyklady: s.forma_i_liczba_godzin_zajec?.wyklady ?? null,
      cwiczenia: s.forma_i_liczba_godzin_zajec?.cwiczenia_lektorat_seminarium ?? null,
      laboratorium: s.forma_i_liczba_godzin_zajec?.laboratorium_projekt ?? null,
      z_udzialem_prowadzacego_h: s.godziny?.z_udzialem_prowadzacego_h ?? null,
      praca_wlasna_studenta_h: s.godziny?.praca_wlasna_studenta_h ?? null,
      calkowita_liczba_godzin_h: s.godziny?.calkowita_liczba_godzin_h ?? null,
      praca_wlasna_studenta: (s.godziny as any)?.praca_wlasna_studenta ?? '',
      zaliczenie_wyklad: getZal('Wykład'),
      zaliczenie_cwiczenia: getZal('Ćwiczenia'),
      zaliczenie_laboratorium: getZal('Laboratorium'),
      cel_dydaktyczny: s.cel_dydaktyczny ?? '',
      cel_dydaktyczny_eng: s.cel_dydaktyczny_eng ?? '',
      kryteria_wyklad: kryt_wyklad,
      kryteria_cwiczenia_laboratorium: kryt_cwiczenia,
      metody_wyklad: getMet('wyklad'),
      metody_cwiczenia_laboratorium: getMet('cwiczenia_laboratorium'),
      przedmioty_wprowadzajace: s.przedmioty_wprowadzajace?.length
        ? s.przedmioty_wprowadzajace.map(p => ({ nazwa: p.nazwa, wymagania: p.wymagania }))
        : [{ nazwa: '', wymagania: '' }],
      efekty_wiedza: this.normalizeEfekty(s.efekty_ksztalcenia?.wiedza),
      efekty_umiejetnosci: this.normalizeEfekty(s.efekty_ksztalcenia?.umiejetnosci),
      efekty_kompetencje: this.normalizeEfekty(s.efekty_ksztalcenia?.kompetencje_spoleczne),
      tresci_programowe: tresci,
      literatura_podstawowa_txt: joinLines(s.literatura?.podstawowa?.pozycje),
      literatura_uzupelniajaca_txt: joinLines(s.literatura?.uzupelniajaca?.pozycje),
      literatura_internetowa_txt: docInternet,
      informacje_dodatkowe: (s as any).informacje_dodatkowe ?? '',
      rynek_pracy_dziedzina: rp?.dziedzina_gospodarki ?? '',
      rynek_pracy_zawody: rp?.zawody ?? '',
      rynek_pracy_prace_txt: Array.isArray(rp?.prace_dyplomowe) ? rp.prace_dyplomowe.join('\n') : '',
      lab_pc_params_txt: Array.isArray(wl?.pc_params) ? wl.pc_params.join('\n') : '',
      lab_software_txt: Array.isArray(wl?.software) ? wl.software.join('\n') : '',
      lab_wyposazenie_txt: Array.isArray(wl?.wyposazenie_dodatkowe) ? wl.wyposazenie_dodatkowe.join('\n') : '',
    };
  }

  private emptyForm(): EditForm {
    return {
      odpowiedzialny: '', rok_studiow: null, semestr_studiow: null,
      obligatoryjny: true, ects: null,
      wyklady: null, cwiczenia: null, laboratorium: null,
      z_udzialem_prowadzacego_h: null, praca_wlasna_studenta_h: null,
      calkowita_liczba_godzin_h: null,
      praca_wlasna_studenta: '',
      zaliczenie_wyklad: '', zaliczenie_cwiczenia: '', zaliczenie_laboratorium: '',
      cel_dydaktyczny: '', cel_dydaktyczny_eng: '',
      kryteria_wyklad: [], kryteria_cwiczenia_laboratorium: [],
      metody_wyklad: [], metody_cwiczenia_laboratorium: [],
      przedmioty_wprowadzajace: [{ nazwa: '', wymagania: '' }],
      efekty_wiedza: [{ keu: '', peu: '', metoda_weryfikacji: '' }],
      efekty_umiejetnosci: [{ keu: '', peu: '', metoda_weryfikacji: '' }],
      efekty_kompetencje: [{ keu: '', peu: '', metoda_weryfikacji: '' }],
      tresci_programowe: [{ nr_zajec: 1, wyklad: '', cwiczenia: '' }],
      literatura_podstawowa_txt: '', literatura_uzupelniajaca_txt: '',
      literatura_internetowa_txt: '',
      informacje_dodatkowe: '',
      rynek_pracy_dziedzina: '', rynek_pracy_zawody: '', rynek_pracy_prace_txt: '',
      lab_pc_params_txt: '', lab_software_txt: '', lab_wyposazenie_txt: '',
    };
  }

  onRecalcPraca(): void {
    const z = this.form.z_udzialem_prowadzacego_h || 0;
    const c = this.form.calkowita_liczba_godzin_h || 0;
    this.form.praca_wlasna_studenta_h = c > 0 ? c - z : null;
  }

  onGodzinyChange(): void {
    const w = this.form.wyklady || 0;
    const c = this.form.cwiczenia || 0;
    const l = this.form.laboratorium || 0;
    this.form.z_udzialem_prowadzacego_h = (w + c + l) || null;
    this.onRecalcPraca();
  }

  addPrzedmiot(): void {
    this.form.przedmioty_wprowadzajace.push({ nazwa: '', wymagania: '' });
  }

  removePrzedmiot(i: number): void {
    this.form.przedmioty_wprowadzajace.splice(i, 1);
  }

  addTresc(): void {
    const nr = this.form.tresci_programowe.length > 0
      ? (this.form.tresci_programowe[this.form.tresci_programowe.length - 1].nr_zajec ?? 0) + 1
      : 1;
    this.form.tresci_programowe.push({ nr_zajec: nr, wyklad: '', cwiczenia: '' });
  }

  removeTresc(i: number): void {
    this.form.tresci_programowe.splice(i, 1);
  }

  private normalizeEfekty(val: any): EfektItem[] {
    if (!val) return [{ keu: '', peu: '', metoda_weryfikacji: '' }];
    const arr = Array.isArray(val) ? val : [val];
    if (arr.length === 0) return [{ keu: '', peu: '', metoda_weryfikacji: '' }];
    return arr.map((item: any) => {
      if (typeof item === 'object' && item !== null && 'peu' in item) {
        return { keu: item.keu ?? '', peu: item.peu ?? '', metoda_weryfikacji: item.metoda_weryfikacji ?? '' };
      }
      return { keu: '', peu: String(item), metoda_weryfikacji: '' };
    });
  }

  addEfekt(lista: EfektItem[]): void {
    lista.push({ keu: '', peu: '', metoda_weryfikacji: '' });
  }

  removeEfekt(lista: EfektItem[], i: number): void {
    if (lista.length > 1) lista.splice(i, 1);
  }

  getKeuOptions(kategoria: 'wiedza' | 'umiejetnosci' | 'kompetencje'): { label: string; value: string }[] {
    if (kategoria === 'wiedza') return this.keuWiedzaOptions;
    if (kategoria === 'umiejetnosci') return this.keuUmiejOptions;
    return this.keuKompOptions;
  }

  private splitLines(txt: string): string[] {
    return txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }

  get today(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  }

  buildJson(): object {
    const s = this.loadedSylabus!;
    const f = this.form;
    const w = f.wyklady || 0;
    const c = f.cwiczenia || 0;
    const l = f.laboratorium || 0;

    const zaliczenie: Record<string, { sposob: string }> = {};
    if (w > 0 && f.zaliczenie_wyklad)        zaliczenie['Wykład']       = { sposob: f.zaliczenie_wyklad };
    if (c > 0 && f.zaliczenie_cwiczenia)      zaliczenie['Ćwiczenia']   = { sposob: f.zaliczenie_cwiczenia };
    if (l > 0 && f.zaliczenie_laboratorium)   zaliczenie['Laboratorium'] = { sposob: f.zaliczenie_laboratorium };

    const metody: Record<string, string[]> = {};
    if (w > 0 && f.metody_wyklad.length)                     metody['wyklad']                = f.metody_wyklad;
    if ((c > 0 || l > 0) && f.metody_cwiczenia_laboratorium.length) metody['cwiczenia_laboratorium'] = f.metody_cwiczenia_laboratorium;

    const lit: Record<string, any> = {
      podstawowa:    { pozycje: this.splitLines(f.literatura_podstawowa_txt) },
      uzupelniajaca: { pozycje: this.splitLines(f.literatura_uzupelniajaca_txt) },
    };
    if (f.literatura_internetowa_txt.trim()) {
      const docObj: Record<string, string> = {};
      this.splitLines(f.literatura_internetowa_txt).forEach(line => { docObj[line] = line; });
      lit['dokumentacja_internetowa'] = docObj;
    }

    const kryteria_oceny = {
      wyklad: w > 0 ? f.kryteria_wyklad : [],
      cwiczenia_laboratorium: (c > 0 || l > 0) ? f.kryteria_cwiczenia_laboratorium : [],
    };

    const tresci = f.tresci_programowe
      .filter(t => t.wyklad.trim() || t.cwiczenia.trim())
      .map(t => ({ nr_zajec: t.nr_zajec, wyklad: t.wyklad, cwiczenia: t.cwiczenia }));

    return {
      sylabus: {
        uczelnia:    s.uczelnia,
        jednostka:   s.jednostka,
        kierunek:    s.kierunek,
        profil:      s.profil,
        tryb_studiow: s.tryb_studiow,
        wersja_z_dnia: this.today,
        nazwa_przedmiotu: s.nazwa_przedmiotu,
        kod_przedmiotu:   s.kod_przedmiotu,
        rok_studiow:      f.rok_studiow,
        semestr_studiow:  f.semestr_studiow,
        obligatoryjny:    f.obligatoryjny,
        forma_i_liczba_godzin_zajec: {
          wyklady: w || null,
          cwiczenia_lektorat_seminarium: c || null,
          laboratorium_projekt: l || null,
        },
        odpowiedzialny_za_przedmiot: f.odpowiedzialny,
        ects: f.ects,
        godziny: {
          z_udzialem_prowadzacego_h:  f.z_udzialem_prowadzacego_h,
          praca_wlasna_studenta_h:    f.praca_wlasna_studenta_h,
          calkowita_liczba_godzin_h:  f.calkowita_liczba_godzin_h,
          praca_wlasna_studenta:      f.praca_wlasna_studenta,
        },
        metody_dydaktyczne: metody,
        zaliczenie,
        kryteria_oceny,
        przedmioty_wprowadzajace: f.przedmioty_wprowadzajace.filter(p => p.nazwa.trim()),
        cel_dydaktyczny: f.cel_dydaktyczny,
        cel_dydaktyczny_eng: f.cel_dydaktyczny_eng ?? '',
        literatura: lit,
        efekty_ksztalcenia: {
          wiedza:                f.efekty_wiedza.filter(e => e.peu.trim()),
          umiejetnosci:          f.efekty_umiejetnosci.filter(e => e.peu.trim()),
          kompetencje_spoleczne: f.efekty_kompetencje.filter(e => e.peu.trim()),
        },
        tresci_programowe: tresci,
        informacje_dodatkowe: f.informacje_dodatkowe,
        rynek_pracy: {
          dziedzina_gospodarki: f.rynek_pracy_dziedzina,
          zawody: f.rynek_pracy_zawody,
          prace_dyplomowe: this.splitLines(f.rynek_pracy_prace_txt),
        },
        wymagania_laboratorium: {
          pc_params: this.splitLines(f.lab_pc_params_txt),
          software: this.splitLines(f.lab_software_txt),
          wyposazenie_dodatkowe: this.splitLines(f.lab_wyposazenie_txt),
        },
      },
    };
  }

  previewSylabus(): void {
    const built = this.buildJson() as { sylabus: SylabusData };
    this.previewSylabusData = built.sylabus;
    this.previewDialogVisible = true;
  }

  previewJson(): void {
    this.jsonPreview = JSON.stringify(this.buildJson(), null, 4);
    this.jsonDialogVisible = true;
  }

  saveToApi(): void {
    if (!this.loadedSylabus) return;
    const s = this.loadedSylabus;
    const data = (this.buildJson() as any).sylabus;
    this.savingToApi = true;
    this.saveApiSuccess = false;
    this.saveApiError = '';

    const obs = this.loadedSyllabusId
      ? this.shogunApi.updateSyllabus(this.loadedSyllabusId, s.kod_przedmiotu, s.tryb_studiow, false, data)
      : this.shogunApi.createSyllabus(s.kod_przedmiotu, s.tryb_studiow, false, data);

    obs.subscribe({
      next: () => {
        this.savingToApi = false;
        this.saveApiSuccess = true;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.savingToApi = false;
        this.saveApiError = err?.error?.title ?? err?.message ?? 'Błąd zapisu do API.';
        this.cdr.detectChanges();
      },
    });
  }

  downloadJson(): void {
    const code = this.loadedSylabus?.kod_przedmiotu ?? 'sylabus';
    const json = JSON.stringify(this.buildJson(), null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${code}.json`; a.click();
    URL.revokeObjectURL(url);
  }
}

