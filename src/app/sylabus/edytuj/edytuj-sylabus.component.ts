import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
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
import { SylabusPreviewComponent } from '../../shared/sylabus-preview/sylabus-preview.component';
import {
  SylabusData,
  SylabusFile,
  ProgramData,
  ElectivesOtherData,
  ElectivesSpecializationsData,
} from '../../stacjonarne/program/models/program.models';

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
  zaliczenie_wyklad: string;
  zaliczenie_cwiczenia: string;
  zaliczenie_laboratorium: string;
  cel_dydaktyczny: string;
  cel_dydaktyczny_eng: string;
  kryteria_oceny_txt: string;
  metody_wyklad_txt: string;
  metody_cwiczenia_txt: string;
  metody_laboratorium_txt: string;
  przedmioty_wprowadzajace: PrzedmiotWprowadzajacy[];
  efekty_wiedza_txt: string;
  efekty_umiejetnosci_txt: string;
  efekty_kompetencje_txt: string;
  tresci_programowe_txt: string;
  literatura_podstawowa_txt: string;
  literatura_uzupelniajaca_txt: string;
  literatura_internetowa_txt: string;
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
  originalSyllabusFile = '';

  form: EditForm = this.emptyForm();

  // Dialogi
  previewDialogVisible = false;
  previewSylabusData: SylabusData | null = null;
  jsonDialogVisible = false;
  jsonPreview = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSubjectOptions();
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
    const base = this.selectedTryb === 'stacjonarny'
      ? 'assets'
      : 'assets/niestacjonarne';

    forkJoin({
      program:  this.http.get<ProgramData>(`${base}/program.json`),
      elOther:  this.http.get<ElectivesOtherData>(`${base}/electives-other.json`),
      elSpec:   this.http.get<ElectivesSpecializationsData>(`${base}/electives-specializations.json`),
      sylIndex: this.http.get<Record<string, string>>(`${base}/syllabus-index.json`),
    }).subscribe({
      next: ({ program, elOther, elSpec, sylIndex }) => {
        const opts: SubjectOption[] = [];
        const seen = new Set<string>();   // dedup po "kod|nazwa"

        const resolveSyllabus = (code: string, existingSyllabusFile?: string): string | null => {
          if (existingSyllabusFile) return existingSyllabusFile;
          if (!code || code === '-') return null;
          return sylIndex[code] ?? null;
        };

        const add = (
          name: string, code: string, existingSyllabusFile: string | undefined,
          sem: number, lecture: number, tutorial: number, lab: number,
          ects: number, form: string, type: string
        ) => {
          const key = `${code}|${name}`;
          if (seen.has(key)) return;
          seen.add(key);

          const syllabusFile = resolveSyllabus(code, existingSyllabusFile);
          const dispCode = code && code !== '-' ? code : '—';

          opts.push({
            label: syllabusFile
              ? `${dispCode} – ${name}`
              : `${dispCode} – ${name} ⚠ brak sylabusa`,
            value: key,
            code: dispCode,
            name,
            syllabusFile,
            hasSylabus: !!syllabusFile,
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
      },
      error: () => { this.loadingOptions = false; },
    });
  }

  loadSylabus(): void {
    if (!this.selectedSubjectOption) return;
    const opt = this.selectedSubjectOption;

    if (!opt.hasSylabus || !opt.syllabusFile) {
      this.loadError = `Brak pliku sylabusa dla przedmiotu "${opt.name}". Możesz go utworzyć na stronie "Nowy sylabus".`;
      return;
    }

    this.loadingSylabus = true;
    this.loadError = '';
    this.loadedSylabus = null;
    this.originalSyllabusFile = opt.syllabusFile;

    this.http.get<SylabusFile>(opt.syllabusFile).subscribe({
      next: (file) => {
        this.loadedSylabus = file.sylabus;
        this.populateForm(file.sylabus);
        this.loadingSylabus = false;
      },
      error: () => {
        this.loadError = `Nie udało się załadować sylabusa: ${opt.syllabusFile}`;
        this.loadingSylabus = false;
      },
    });
  }

  private populateForm(s: SylabusData): void {
    const joinLines = (val: string | string[] | undefined | null): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join('\n');
      return val;
    };

    const getMetody = (key: string): string =>
      joinLines((s.metody_dydaktyczne as any)?.[key]);

    const getZal = (forma: string): string =>
      s.zaliczenie?.[forma]?.sposob ?? '';

    const docInternet = s.literatura?.dokumentacja_internetowa
      ? Object.keys(s.literatura.dokumentacja_internetowa).join('\n')
      : '';

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
      zaliczenie_wyklad: getZal('Wykład'),
      zaliczenie_cwiczenia: getZal('Ćwiczenia'),
      zaliczenie_laboratorium: getZal('Laboratorium'),
      cel_dydaktyczny: s.cel_dydaktyczny ?? '',
      cel_dydaktyczny_eng: s.cel_dydaktyczny_eng ?? '',
      kryteria_oceny_txt: joinLines(s.kryteria_oceny),
      metody_wyklad_txt: getMetody('wyklad'),
      metody_cwiczenia_txt: getMetody('cwiczenia'),
      metody_laboratorium_txt: getMetody('laboratorium'),
      przedmioty_wprowadzajace: s.przedmioty_wprowadzajace?.length
        ? s.przedmioty_wprowadzajace.map(p => ({ nazwa: p.nazwa, wymagania: p.wymagania }))
        : [{ nazwa: '', wymagania: '' }],
      efekty_wiedza_txt: joinLines(s.efekty_ksztalcenia?.wiedza),
      efekty_umiejetnosci_txt: joinLines(s.efekty_ksztalcenia?.umiejetnosci),
      efekty_kompetencje_txt: joinLines(s.efekty_ksztalcenia?.kompetencje_spoleczne),
      tresci_programowe_txt: joinLines(s.tresci_programowe),
      literatura_podstawowa_txt: joinLines(s.literatura?.podstawowa?.pozycje),
      literatura_uzupelniajaca_txt: joinLines(s.literatura?.uzupelniajaca?.pozycje),
      literatura_internetowa_txt: docInternet,
    };
  }

  private emptyForm(): EditForm {
    return {
      odpowiedzialny: '', rok_studiow: null, semestr_studiow: null,
      obligatoryjny: true, ects: null,
      wyklady: null, cwiczenia: null, laboratorium: null,
      z_udzialem_prowadzacego_h: null, praca_wlasna_studenta_h: null,
      calkowita_liczba_godzin_h: null,
      zaliczenie_wyklad: '', zaliczenie_cwiczenia: '', zaliczenie_laboratorium: '',
      cel_dydaktyczny: '', cel_dydaktyczny_eng: '', kryteria_oceny_txt: '',
      metody_wyklad_txt: '', metody_cwiczenia_txt: '', metody_laboratorium_txt: '',
      przedmioty_wprowadzajace: [{ nazwa: '', wymagania: '' }],
      efekty_wiedza_txt: '', efekty_umiejetnosci_txt: '', efekty_kompetencje_txt: '',
      tresci_programowe_txt: '',
      literatura_podstawowa_txt: '', literatura_uzupelniajaca_txt: '',
      literatura_internetowa_txt: '',
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
    if (w > 0 && f.zaliczenie_wyklad)   zaliczenie['Wykład']      = { sposob: f.zaliczenie_wyklad };
    if (c > 0 && f.zaliczenie_cwiczenia) zaliczenie['Ćwiczenia']  = { sposob: f.zaliczenie_cwiczenia };
    if (l > 0 && f.zaliczenie_laboratorium) zaliczenie['Laboratorium'] = { sposob: f.zaliczenie_laboratorium };

    const metody: Record<string, string[]> = {};
    if (w > 0 && f.metody_wyklad_txt)       metody['wyklad']      = this.splitLines(f.metody_wyklad_txt);
    if (c > 0 && f.metody_cwiczenia_txt)    metody['cwiczenia']   = this.splitLines(f.metody_cwiczenia_txt);
    if (l > 0 && f.metody_laboratorium_txt) metody['laboratorium']= this.splitLines(f.metody_laboratorium_txt);

    const lit: Record<string, any> = {
      podstawowa:   { pozycje: this.splitLines(f.literatura_podstawowa_txt) },
      uzupelniajaca:{ pozycje: this.splitLines(f.literatura_uzupelniajaca_txt) },
    };
    if (f.literatura_internetowa_txt.trim()) {
      const docObj: Record<string,string> = {};
      this.splitLines(f.literatura_internetowa_txt).forEach(line => { docObj[line] = line; });
      lit['dokumentacja_internetowa'] = docObj;
    }

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
        },
        metody_dydaktyczne: metody,
        zaliczenie,
        kryteria_oceny: this.splitLines(f.kryteria_oceny_txt),
        przedmioty_wprowadzajace: f.przedmioty_wprowadzajace.filter(p => p.nazwa.trim()),
        cel_dydaktyczny: f.cel_dydaktyczny,
        ...(f.cel_dydaktyczny_eng ? { cel_dydaktyczny_eng: f.cel_dydaktyczny_eng } : {}),
        literatura: lit,
        efekty_ksztalcenia: {
          wiedza:               this.splitLines(f.efekty_wiedza_txt),
          umiejetnosci:         this.splitLines(f.efekty_umiejetnosci_txt),
          kompetencje_spoleczne:this.splitLines(f.efekty_kompetencje_txt),
        },
        tresci_programowe: this.splitLines(f.tresci_programowe_txt),
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

