import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseHrefService } from '../../shared/base-href.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { SylabusPreviewComponent } from '../../shared/sylabus-preview/sylabus-preview.component';
import { SylabusData } from '../../stacjonarne/program/models/program.models';

interface PrzedmiotWprowadzajacy {
  nazwa: string;
  wymagania: string;
}

interface TrescProgramowa {
  nr_zajec: number | null;
  wyklad: string;
  cwiczenia: string;
}

interface FormModel {
  tryb_studiow: string;
  jednostka: string;
  nazwa_przedmiotu: string;
  kod_przedmiotu: string;
  rok_studiow: number | null;
  semestr_studiow: number | null;
  obligatoryjny: boolean;
  odpowiedzialny: string;
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
  efekty_wiedza_txt: string;
  efekty_umiejetnosci_txt: string;
  efekty_kompetencje_txt: string;
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

const TRYBY_STUDIOW = [
  { label: 'Stacjonarny', value: 'stacjonarny' },
  { label: 'Niestacjonarny', value: 'niestacjonarny' },
];

const JEDNOSTKI = [
  { label: 'Filia w Gdańsku', value: 'Filia w Gdańsku' },
];

@Component({
  selector: 'app-nowy-sylabus',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    PanelModule,
    DividerModule,
    SelectModule,
    DialogModule,
    CheckboxModule,
    MultiSelectModule,
    SylabusPreviewComponent,
  ],
  templateUrl: './nowy-sylabus.component.html',
  styleUrl: './nowy-sylabus.component.css',
})
export class NowySylabusComponent implements OnInit {

  sposobyZaliczenia = SPOSOBY_ZALICZENIA;
  trybOptions = TRYBY_STUDIOW;
  jednostkiOptions = JEDNOSTKI;

  dialogVisible = false;
  jsonPreview = '';

  previewDialogVisible = false;
  previewSylabusData: SylabusData | null = null;

  importDialogVisible = false;
  importJsonText = '';
  importError = '';
  importDragOver = false;

  /** Dostępne opcje z plików JSON */
  metodyWykladOptions: { label: string; value: string }[] = [];
  metodyCwiczeniaOptions: { label: string; value: string }[] = [];
  krytyriaOptions: { label: string; value: string }[] = [];

  form: FormModel = {
    tryb_studiow: 'stacjonarny',
    jednostka: 'Filia w Gdańsku',
    nazwa_przedmiotu: '',
    kod_przedmiotu: '',
    rok_studiow: null,
    semestr_studiow: null,
    obligatoryjny: true,
    odpowiedzialny: '',
    ects: null,
    wyklady: null,
    cwiczenia: null,
    laboratorium: null,
    z_udzialem_prowadzacego_h: null,
    praca_wlasna_studenta_h: null,
    calkowita_liczba_godzin_h: null,
    praca_wlasna_studenta: '',
    zaliczenie_wyklad: '',
    zaliczenie_cwiczenia: '',
    zaliczenie_laboratorium: '',
    cel_dydaktyczny: '',
    cel_dydaktyczny_eng: '',
    kryteria_wyklad: [],
    kryteria_cwiczenia_laboratorium: [],
    metody_wyklad: [],
    metody_cwiczenia_laboratorium: [],
    przedmioty_wprowadzajace: [{ nazwa: '', wymagania: '' }],
    efekty_wiedza_txt: '',
    efekty_umiejetnosci_txt: '',
    efekty_kompetencje_txt: '',
    tresci_programowe: [{ nr_zajec: 1, wyklad: '', cwiczenia: '' }],
    literatura_podstawowa_txt: '',
    literatura_uzupelniajaca_txt: '',
    literatura_internetowa_txt: '',
    informacje_dodatkowe: '',
    rynek_pracy_dziedzina: '',
    rynek_pracy_zawody: '',
    rynek_pracy_prace_txt: '',
    lab_pc_params_txt: '',
    lab_software_txt: '',
    lab_wyposazenie_txt: '',
  };

  constructor(private http: HttpClient, private baseHref: BaseHrefService) {}

  ngOnInit(): void {
    this.http.get<any>(this.baseHref.assetUrl('metody_dydaktyczne.json')).subscribe(data => {
      this.metodyWykladOptions = (data.wyklad as string[]).map(m => ({ label: m, value: m }));
      this.metodyCwiczeniaOptions = (data.cwiczenia_laboratorium as string[]).map(m => ({ label: m, value: m }));
    });
    this.http.get<any>(this.baseHref.assetUrl('metody_weryfikacji.json')).subscribe(data => {
      this.krytyriaOptions = (data.metody_weryfikacji as string[]).map(m => ({ label: m, value: m }));
    });
  }

  get today(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
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
    this.form.z_udzialem_prowadzacego_h = w + c + l || null;
    this.onRecalcPraca();
  }

  addPrzedmiot(): void {
    this.form.przedmioty_wprowadzajace.push({ nazwa: '', wymagania: '' });
  }

  removePrzedmiot(index: number): void {
    this.form.przedmioty_wprowadzajace.splice(index, 1);
  }

  addTresc(): void {
    const nr = (this.form.tresci_programowe.length > 0
      ? (this.form.tresci_programowe[this.form.tresci_programowe.length - 1].nr_zajec ?? 0) + 1
      : 1);
    this.form.tresci_programowe.push({ nr_zajec: nr, wyklad: '', cwiczenia: '' });
  }

  removeTresc(index: number): void {
    this.form.tresci_programowe.splice(index, 1);
  }

  private splitLines(txt: string): string[] {
    return txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }

  buildJson(): object {
    const f = this.form;
    const w = f.wyklady || 0;
    const c = f.cwiczenia || 0;
    const l = f.laboratorium || 0;

    const zaliczenie: Record<string, { sposob: string }> = {};
    if (w > 0 && f.zaliczenie_wyklad) zaliczenie['Wykład'] = { sposob: f.zaliczenie_wyklad };
    if (c > 0 && f.zaliczenie_cwiczenia) zaliczenie['Ćwiczenia'] = { sposob: f.zaliczenie_cwiczenia };
    if (l > 0 && f.zaliczenie_laboratorium) zaliczenie['Laboratorium'] = { sposob: f.zaliczenie_laboratorium };

    const metody: Record<string, string[]> = {};
    if (w > 0 && f.metody_wyklad.length) metody['wyklad'] = f.metody_wyklad;
    if ((c > 0 || l > 0) && f.metody_cwiczenia_laboratorium.length) metody['cwiczenia_laboratorium'] = f.metody_cwiczenia_laboratorium;

    const przedmioty = f.przedmioty_wprowadzajace.filter(p => p.nazwa.trim());

    const lit: Record<string, any> = {
      podstawowa: { pozycje: this.splitLines(f.literatura_podstawowa_txt) },
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
        uczelnia: 'Polsko-Japonska Akademia Technik Komputerowych Filia w Gdansku',
        jednostka: f.jednostka,
        kierunek: 'INFORMATYKA',
        profil: 'praktyczny',
        tryb_studiow: f.tryb_studiow,
        wersja_z_dnia: this.today,
        nazwa_przedmiotu: f.nazwa_przedmiotu,
        kod_przedmiotu: f.kod_przedmiotu,
        rok_studiow: f.rok_studiow,
        semestr_studiow: f.semestr_studiow,
        obligatoryjny: f.obligatoryjny,
        forma_i_liczba_godzin_zajec: {
          wyklady: w || null,
          cwiczenia_lektorat_seminarium: c || null,
          laboratorium_projekt: l || null,
        },
        odpowiedzialny_za_przedmiot: f.odpowiedzialny,
        ects: f.ects,
        godziny: {
          z_udzialem_prowadzacego_h: f.z_udzialem_prowadzacego_h,
          praca_wlasna_studenta_h: f.praca_wlasna_studenta_h,
          calkowita_liczba_godzin_h: f.calkowita_liczba_godzin_h,
          praca_wlasna_studenta: f.praca_wlasna_studenta,
        },
        metody_dydaktyczne: metody,
        zaliczenie,
        kryteria_oceny,
        przedmioty_wprowadzajace: przedmioty,
        cel_dydaktyczny: f.cel_dydaktyczny,
        ...(f.cel_dydaktyczny_eng ? { cel_dydaktyczny_eng: f.cel_dydaktyczny_eng } : {}),
        literatura: lit,
        efekty_ksztalcenia: {
          wiedza: this.splitLines(f.efekty_wiedza_txt),
          umiejetnosci: this.splitLines(f.efekty_umiejetnosci_txt),
          kompetencje_spoleczne: this.splitLines(f.efekty_kompetencje_txt),
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

  previewJson(): void {
    this.jsonPreview = JSON.stringify(this.buildJson(), null, 4);
    this.dialogVisible = true;
  }

  previewSylabus(): void {
    const built = this.buildJson() as { sylabus: SylabusData };
    this.previewSylabusData = built.sylabus;
    this.previewDialogVisible = true;
  }

  openImport(): void {
    this.importJsonText = '';
    this.importError = '';
    this.importDialogVisible = true;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.importDragOver = true;
  }

  onDragLeave(): void {
    this.importDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.importDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.readFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.readFile(file);
    input.value = '';
  }

  private readFile(file: File): void {
    if (!file.name.endsWith('.json')) {
      this.importError = 'Wybrany plik nie jest plikiem JSON.';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.importJsonText = e.target?.result as string ?? '';
      this.importError = '';
    };
    reader.readAsText(file, 'utf-8');
  }

  applyImport(): void {
    this.importError = '';
    if (!this.importJsonText.trim()) {
      this.importError = 'Wklej lub wgraj JSON sylabusa.';
      return;
    }
    try {
      const parsed = JSON.parse(this.importJsonText);
      const s: SylabusData = parsed?.sylabus ?? parsed;
      if (!s || typeof s !== 'object' || !s.nazwa_przedmiotu) {
        this.importError = 'Nieprawidłowy format JSON. Oczekiwana struktura: { "sylabus": { ... } }';
        return;
      }
      this.populateFromSylabus(s);
      this.importDialogVisible = false;
    } catch {
      this.importError = 'Błąd parsowania JSON. Sprawdź poprawność składni.';
    }
  }

  private populateFromSylabus(s: SylabusData): void {
    const join = (val: string | string[] | undefined | null): string => {
      if (!val) return '';
      return Array.isArray(val) ? val.join('\n') : val;
    };
    const getZal = (forma: string): string => s.zaliczenie?.[forma]?.sposob ?? '';
    const getMet = (key: string): string[] => {
      const v = (s.metody_dydaktyczne as any)?.[key];
      return Array.isArray(v) ? v : (v ? [v] : []);
    };
    const docInternet = s.literatura?.dokumentacja_internetowa
      ? Object.keys(s.literatura.dokumentacja_internetowa).join('\n') : '';

    // kryteria_oceny – nowy format obiektowy lub stary (tablica)
    let kryt_wyklad: string[] = [];
    let kryt_cwiczenia: string[] = [];
    const ko = s.kryteria_oceny as any;
    if (ko && !Array.isArray(ko) && typeof ko === 'object') {
      kryt_wyklad = Array.isArray(ko.wyklad) ? ko.wyklad : [];
      kryt_cwiczenia = Array.isArray(ko.cwiczenia_laboratorium) ? ko.cwiczenia_laboratorium : [];
    } else if (Array.isArray(ko)) {
      kryt_wyklad = ko;
    }

    // tresci_programowe – nowy format obiektowy lub stary (tablica stringów)
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
      tryb_studiow: s.tryb_studiow ?? this.form.tryb_studiow,
      jednostka: s.jednostka ?? this.form.jednostka,
      nazwa_przedmiotu: s.nazwa_przedmiotu ?? '',
      kod_przedmiotu: s.kod_przedmiotu ?? '',
      rok_studiow: s.rok_studiow ?? null,
      semestr_studiow: s.semestr_studiow ?? null,
      obligatoryjny: s.obligatoryjny ?? true,
      odpowiedzialny: s.odpowiedzialny_za_przedmiot ?? '',
      ects: s.ects ?? null,
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
      efekty_wiedza_txt: join(s.efekty_ksztalcenia?.wiedza),
      efekty_umiejetnosci_txt: join(s.efekty_ksztalcenia?.umiejetnosci),
      efekty_kompetencje_txt: join(s.efekty_ksztalcenia?.kompetencje_spoleczne),
      tresci_programowe: tresci,
      literatura_podstawowa_txt: join(s.literatura?.podstawowa?.pozycje),
      literatura_uzupelniajaca_txt: join(s.literatura?.uzupelniajaca?.pozycje),
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

  downloadJson(): void {
    const filename = (this.form.kod_przedmiotu.trim() || 'sylabus') + '.json';
    const json = JSON.stringify(this.buildJson(), null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

