import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { SylabusPreviewComponent } from '../../shared/sylabus-preview/sylabus-preview.component';
import { SylabusData } from '../../stacjonarne/program/models/program.models';

interface PrzedmiotWprowadzajacy {
  nazwa: string;
  wymagania: string;
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
    SylabusPreviewComponent,
  ],
  templateUrl: './nowy-sylabus.component.html',
  styleUrl: './nowy-sylabus.component.css',
})
export class NowySylabusComponent {

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
    zaliczenie_wyklad: '',
    zaliczenie_cwiczenia: '',
    zaliczenie_laboratorium: '',
    cel_dydaktyczny: '',
    cel_dydaktyczny_eng: '',
    kryteria_oceny_txt: '',
    metody_wyklad_txt: '',
    metody_cwiczenia_txt: '',
    metody_laboratorium_txt: '',
    przedmioty_wprowadzajace: [{ nazwa: '', wymagania: '' }],
    efekty_wiedza_txt: '',
    efekty_umiejetnosci_txt: '',
    efekty_kompetencje_txt: '',
    tresci_programowe_txt: '',
    literatura_podstawowa_txt: '',
    literatura_uzupelniajaca_txt: '',
    literatura_internetowa_txt: '',
  };

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
    if (w > 0 && f.metody_wyklad_txt) metody['wyklad'] = this.splitLines(f.metody_wyklad_txt);
    if (c > 0 && f.metody_cwiczenia_txt) metody['cwiczenia'] = this.splitLines(f.metody_cwiczenia_txt);
    if (l > 0 && f.metody_laboratorium_txt) metody['laboratorium'] = this.splitLines(f.metody_laboratorium_txt);

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
        },
        metody_dydaktyczne: metody,
        zaliczenie,
        kryteria_oceny: this.splitLines(f.kryteria_oceny_txt),
        przedmioty_wprowadzajace: przedmioty,
        cel_dydaktyczny: f.cel_dydaktyczny,
        ...(f.cel_dydaktyczny_eng ? { cel_dydaktyczny_eng: f.cel_dydaktyczny_eng } : {}),
        literatura: lit,
        efekty_ksztalcenia: {
          wiedza: this.splitLines(f.efekty_wiedza_txt),
          umiejetnosci: this.splitLines(f.efekty_umiejetnosci_txt),
          kompetencje_spoleczne: this.splitLines(f.efekty_kompetencje_txt),
        },
        tresci_programowe: this.splitLines(f.tresci_programowe_txt),
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
    const getMet = (key: string): string => join((s.metody_dydaktyczne as any)?.[key]);
    const docInternet = s.literatura?.dokumentacja_internetowa
      ? Object.keys(s.literatura.dokumentacja_internetowa).join('\n') : '';

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
      zaliczenie_wyklad: getZal('Wykład'),
      zaliczenie_cwiczenia: getZal('Ćwiczenia'),
      zaliczenie_laboratorium: getZal('Laboratorium'),
      cel_dydaktyczny: s.cel_dydaktyczny ?? '',
      cel_dydaktyczny_eng: s.cel_dydaktyczny_eng ?? '',
      kryteria_oceny_txt: join(s.kryteria_oceny),
      metody_wyklad_txt: getMet('wyklad'),
      metody_cwiczenia_txt: getMet('cwiczenia'),
      metody_laboratorium_txt: getMet('laboratorium'),
      przedmioty_wprowadzajace: s.przedmioty_wprowadzajace?.length
        ? s.przedmioty_wprowadzajace.map(p => ({ nazwa: p.nazwa, wymagania: p.wymagania }))
        : [{ nazwa: '', wymagania: '' }],
      efekty_wiedza_txt: join(s.efekty_ksztalcenia?.wiedza),
      efekty_umiejetnosci_txt: join(s.efekty_ksztalcenia?.umiejetnosci),
      efekty_kompetencje_txt: join(s.efekty_ksztalcenia?.kompetencje_spoleczne),
      tresci_programowe_txt: join(s.tresci_programowe),
      literatura_podstawowa_txt: join(s.literatura?.podstawowa?.pozycje),
      literatura_uzupelniajaca_txt: join(s.literatura?.uzupelniajaca?.pozycje),
      literatura_internetowa_txt: docInternet,
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

