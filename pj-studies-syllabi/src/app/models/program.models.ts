export interface ProgramChange {
  subject: string;
  type: 'przeniesienie' | 'zmiana' | 'nowy' | 'usunięcie';
  reason: string;
}

export interface SemesterChanges {
  semester: number;
  changes: ProgramChange[];
}

export interface ProgramChangesData {
  programChanges: SemesterChanges[];
}

export interface Subject {
  name: string;
  type: 'M' | 'O';
  code: string;
  lecture: number;
  tutorial: number;
  lab: number;
  form: string;
  ects: number;
  electiveGroup?: string;
}

export interface SemesterSummary {
  ects: number;
  lecture: number;
  tutorial: number;
  lab: number;
}

export interface Semester {
  semester: number;
  summary: SemesterSummary;
  description: string;
  subjects: Subject[];
}

export interface ProgramData {
  semesters: Semester[];
}

export interface ElectiveItem {
  name: string;
  code: string;
  lecture: number;
  tutorial: number;
  lab: number;
  form: string;
  ects: number;
  semester?: number;
  syllabusFile?: string;
  pdf?: string;
  docFile?: string;
}

export interface ElectiveGroup {
  id: string;
  label: string;
  semester: number;
  items: ElectiveItem[];
}

export interface ElectivesOtherData {
  groups: ElectiveGroup[];
}

export interface SpecializationItem extends ElectiveItem {
  semester: number;
}

export interface Specialization {
  name: string;
  items: SpecializationItem[];
}

export interface ElectivesSpecializationsData {
  specializations: Specialization[];
}

export interface SubjectTreeNode {
  data: SubjectRow;
  children?: SubjectTreeNode[];
  leaf?: boolean;
}

export interface SubjectRow {
  name: string;
  type: string;
  code: string;
  lecture: number | string;
  tutorial: number | string;
  lab: number | string;
  form: string;
  ects: number | string;
  isGroup?: boolean;
  electiveGroup?: string;
  syllabusFile?: string;
  pdf?: string;
  docFile?: string;
}

// ---- Sylabus JSON structures ----
export interface SylabusGodziny {
  wyklady: number | null;
  cwiczenia_lektorat_seminarium: number | null;
  laboratorium_projekt: number | null;
}

export interface SylabusGodzinyEcts {
  z_udzialem_prowadzacego_h: number | null;
  praca_wlasna_studenta_h: number | null;
  calkowita_liczba_godzin_h: number | null;
  praca_wlasna_studenta?: string;
}

export interface SylabusKryteriaOceny {
  wyklad?: string[];
  cwiczenia_laboratorium?: string[];
}

export interface SylabusTrescProgramowa {
  nr_zajec: number;
  wyklad: string;
  cwiczenia: string;
}

export interface SylabusRynekPracy {
  dziedzina_gospodarki?: string;
  zawody?: string;
  prace_dyplomowe?: string[];
}

export interface SylabusWymaganiaLaboratorium {
  pc_params?: string[];
  software?: string[];
  wyposazenie_dodatkowe?: string[];
}

export interface SylabusZaliczenie {
  [forma: string]: { sposob: string };
}

export interface SylabusPrzedmiotWprowadzajacy {
  nazwa: string;
  wymagania: string;
}

export interface SylabusLiteratura {
  podstawowa?: { pozycje: string[] };
  uzupelniajaca?: { pozycje: string[] };
  dokumentacja_internetowa?: { [key: string]: string };
}

export interface SylabusEfektyItem {
  keu: string;
  peu: string;
  metoda_weryfikacji: string;
}

export interface SylabusEfekty {
  wiedza?: SylabusEfektyItem[] | string[] | string;
  umiejetnosci?: SylabusEfektyItem[] | string[] | string;
  kompetencje_spoleczne?: SylabusEfektyItem[] | string[] | string;
}

export interface SylabusMetodyDydaktyczne {
  wyklad?: string[];
  cwiczenia?: string[];
  laboratorium?: string[];
  lektorat?: string[];
  projekt?: string[];
}

export interface SylabusData {
  uczelnia: string;
  jednostka: string;
  kierunek: string;
  profil: string;
  tryb_studiow: string;
  wersja_z_dnia: string;
  nazwa_przedmiotu: string;
  kod_przedmiotu: string;
  rok_studiow: number | null;
  semestr_studiow: number | null;
  obligatoryjny: boolean;
  forma_i_liczba_godzin_zajec: SylabusGodziny;
  odpowiedzialny_za_przedmiot: string;
  ects: number | null;
  godziny: SylabusGodzinyEcts;
  metody_dydaktyczne: SylabusMetodyDydaktyczne;
  zaliczenie: SylabusZaliczenie;
  kryteria_oceny: SylabusKryteriaOceny | string[];
  przedmioty_wprowadzajace: SylabusPrzedmiotWprowadzajacy[];
  cel_dydaktyczny: string;
  cel_dydaktyczny_eng?: string;
  literatura: SylabusLiteratura;
  efekty_ksztalcenia: SylabusEfekty;
  tresci_programowe: SylabusTrescProgramowa[] | string[];
  informacje_dodatkowe?: string;
  rynek_pracy?: SylabusRynekPracy;
  wymagania_laboratorium?: SylabusWymaganiaLaboratorium;
}

export interface SylabusFile {
  sylabus: SylabusData;
}

