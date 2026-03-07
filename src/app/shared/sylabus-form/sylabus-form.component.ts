import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { SubjectRow } from '../../stacjonarne/program/models/program.models';

interface PrzedmiotWprowadzajacy {
  nazwa: string;
  wymagania: string;
}

interface FormModel {
  odpowiedzialny: string;
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
  tryb_studiow: string;
  uczelnia: string;
  jednostka: string;
}

const SPOSOBY_ZALICZENIA = [
  { label: '—', value: '' },
  { label: 'Zaliczenie', value: 'Zaliczenie' },
  { label: 'Zaliczenie z oceną', value: 'Zaliczenie z oceną' },
  { label: 'Egzamin', value: 'Egzamin' },
];

@Component({
  selector: 'app-sylabus-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    PanelModule,
    DividerModule,
    SelectModule,
  ],
  templateUrl: './sylabus-form.component.html',
  styleUrl: './sylabus-form.component.css',
})
export class SylabusFormComponent implements OnInit {
  @Input() subject!: SubjectRow;
  @Input() semester!: number;
  @Input() trybStudiow: string = 'stacjonarny';

  sposobyZaliczenia = SPOSOBY_ZALICZENIA;

  form: FormModel = {
    odpowiedzialny: '',
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
    tryb_studiow: 'stacjonarny',
    uczelnia: 'Polsko-Japońska Akademia Technik Komputerowych Filia w Gdańsku',
    jednostka: 'Filia w Gdańsku',
  };

  ngOnInit(): void {
    this.form.tryb_studiow = this.trybStudiow;
    // Ustaw godziny z_udzialem jako suma godzin kontaktowych
    const w = (this.subject.lecture as number) || 0;
    const c = (this.subject.tutorial as number) || 0;
    const l = (this.subject.lab as number) || 0;
    this.form.z_udzialem_prowadzacego_h = w + c + l;
    const ects = (this.subject.ects as number) || 0;
    this.form.calkowita_liczba_godzin_h = ects * 25;
    this.form.praca_wlasna_studenta_h =
      this.form.calkowita_liczba_godzin_h - this.form.z_udzialem_prowadzacego_h;

    // Ustaw domyślne formy zaliczenia na podstawie form przedmiotu
    const form = this.subject.form;
    if (w > 0) this.form.zaliczenie_wyklad = form === 'EZ' ? 'Egzamin' : 'Zaliczenie z oceną';
    if (c > 0) this.form.zaliczenie_cwiczenia = 'Zaliczenie z oceną';
    if (l > 0) this.form.zaliczenie_laboratorium = 'Zaliczenie z oceną';
  }

  get lectureH(): number { return Number(this.subject?.lecture) || 0; }
  get tutorialH(): number { return Number(this.subject?.tutorial) || 0; }
  get labH(): number { return Number(this.subject?.lab) || 0; }

  get rokStudiow(): number {
    return Math.ceil(this.semester / 2);
  }

  addPrzedmiot(): void {
    this.form.przedmioty_wprowadzajace.push({ nazwa: '', wymagania: '' });
  }

  removePrzedmiot(index: number): void {
    this.form.przedmioty_wprowadzajace.splice(index, 1);
  }

  private splitLines(txt: string): string[] {
    return txt
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  onRecalcPraca(): void {
    const z = this.form.z_udzialem_prowadzacego_h || 0;
    const c = this.form.calkowita_liczba_godzin_h || 0;
    this.form.praca_wlasna_studenta_h = c - z;
  }

  buildJson(): object {
    const s = this.subject;
    const zaliczenie: Record<string, { sposob: string }> = {};
    const w = (s.lecture as number) || 0;
    const c = (s.tutorial as number) || 0;
    const l = (s.lab as number) || 0;

    if (w > 0 && this.form.zaliczenie_wyklad)
      zaliczenie['Wykład'] = { sposob: this.form.zaliczenie_wyklad };
    if (c > 0 && this.form.zaliczenie_cwiczenia)
      zaliczenie['Ćwiczenia'] = { sposob: this.form.zaliczenie_cwiczenia };
    if (l > 0 && this.form.zaliczenie_laboratorium)
      zaliczenie['Laboratorium'] = { sposob: this.form.zaliczenie_laboratorium };

    const metody: Record<string, string[]> = {};
    if (w > 0 && this.form.metody_wyklad_txt)
      metody['wyklad'] = this.splitLines(this.form.metody_wyklad_txt);
    if (c > 0 && this.form.metody_cwiczenia_txt)
      metody['cwiczenia'] = this.splitLines(this.form.metody_cwiczenia_txt);
    if (l > 0 && this.form.metody_laboratorium_txt)
      metody['laboratorium'] = this.splitLines(this.form.metody_laboratorium_txt);

    const przedmioty = this.form.przedmioty_wprowadzajace.filter((p) => p.nazwa.trim());

    return {
      sylabus: {
        uczelnia: this.form.uczelnia,
        jednostka: this.form.jednostka,
        kierunek: 'INFORMATYKA',
        profil: 'praktyczny',
        tryb_studiow: this.form.tryb_studiow,
        wersja_z_dnia: '19.02.2026',
        nazwa_przedmiotu: s.name,
        kod_przedmiotu: s.code,
        rok_studiow: this.rokStudiow,
        semestr_studiow: this.semester,
        obligatoryjny: s.type === 'Obowiązkowy' || s.type === 'M',
        forma_i_liczba_godzin_zajec: {
          wyklady: w || null,
          cwiczenia_lektorat_seminarium: c || null,
          laboratorium_projekt: l || null,
        },
        odpowiedzialny_za_przedmiot: this.form.odpowiedzialny,
        ects: s.ects as number,
        godziny: {
          z_udzialem_prowadzacego_h: this.form.z_udzialem_prowadzacego_h,
          praca_wlasna_studenta_h: this.form.praca_wlasna_studenta_h,
          calkowita_liczba_godzin_h: this.form.calkowita_liczba_godzin_h,
        },
        metody_dydaktyczne: metody,
        zaliczenie,
        kryteria_oceny: this.splitLines(this.form.kryteria_oceny_txt),
        przedmioty_wprowadzajace: przedmioty,
        cel_dydaktyczny: this.form.cel_dydaktyczny,
        cel_dydaktyczny_eng: this.form.cel_dydaktyczny_eng || undefined,
        literatura: {
          podstawowa: {
            pozycje: this.splitLines(this.form.literatura_podstawowa_txt),
          },
          uzupelniajaca: {
            pozycje: this.splitLines(this.form.literatura_uzupelniajaca_txt),
          },
        },
        efekty_ksztalcenia: {
          wiedza: this.splitLines(this.form.efekty_wiedza_txt),
          umiejetnosci: this.splitLines(this.form.efekty_umiejetnosci_txt),
          kompetencje_spoleczne: this.splitLines(this.form.efekty_kompetencje_txt),
        },
        tresci_programowe: this.splitLines(this.form.tresci_programowe_txt),
      },
    };
  }

  downloadJson(): void {
    const json = JSON.stringify(this.buildJson(), null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.subject.code}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

