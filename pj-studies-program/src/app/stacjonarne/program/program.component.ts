import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { TabsModule } from 'primeng/tabs';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TimelineModule } from 'primeng/timeline';

import { ProgramService, SemesterViewModel } from './services/program.service';
import { SubjectRow, SylabusData, SylabusFile, ProgramChange, ProgramChangesData, SylabusTrescProgramowa, SylabusKryteriaOceny } from './models/program.models';
import { BaseHrefService } from '../../shared/base-href.service';
import { SylabusFormComponent } from '../../shared/sylabus-form/sylabus-form.component';

@Component({
  selector: 'app-program',
  standalone: true,
  imports: [
    CommonModule,
    AccordionModule,
    TabsModule,
    TreeTableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    PanelModule,
    CardModule,
    TableModule,
    DividerModule,
    ProgressSpinnerModule,
    TimelineModule,
    SylabusFormComponent,
  ],
  templateUrl: './program.component.html',
  styleUrl: './program.component.css',
})
export class ProgramComponent implements OnInit {
  semesters = signal<SemesterViewModel[]>([]);
  loading = signal(true);
  programPdf = signal<string | null>(null);
  changesMap = signal<Map<number, ProgramChange[]>>(new Map());

  totals = computed(() => {
    const data = this.semesters();
    return {
      ects:     data.reduce((s, sem) => s + sem.totalEcts, 0),
      lecture:  data.reduce((s, sem) => s + sem.totalLecture, 0),
      tutorial: data.reduce((s, sem) => s + sem.totalTutorial, 0),
      lab:      data.reduce((s, sem) => s + sem.totalLab, 0),
    };
  });

  dialogVisible = signal(false);
  dialogTitle = signal('');
  selectedSubject = signal<SubjectRow | null>(null);
  selectedSemester = signal<number>(1);
  sylabus = signal<SylabusData | null>(null);
  sylabusLoading = signal(false);

  private baseHrefService = inject(BaseHrefService);

  constructor(
    private programService: ProgramService,
    private http: HttpClient,
    private router: Router,
  ) {}

  openPdf(pdfPath: string, title: string = 'Program studiów'): void {
    const url = this.baseHrefService.assetUrl(pdfPath.replace(/^assets\//, ''));
    this.router.navigate(['/program/pdf-viewer'], { queryParams: { url, title } });
  }

  getDocUrl(docPath: string): string {
    return this.baseHrefService.assetUrl(docPath.replace(/^assets\//, ''));
  }

  ngOnInit(): void {
    this.http.get<any>(this.baseHrefService.assetUrl('program.json')).subscribe({
      next: (raw) => { if (raw?.pdf) this.programPdf.set(raw.pdf); },
    });
    this.http.get<ProgramChangesData>(this.baseHrefService.assetUrl('changes.json')).subscribe({
      next: (data) => {
        const map = new Map<number, ProgramChange[]>();
        data.programChanges.forEach(sc => map.set(sc.semester, sc.changes));
        this.changesMap.set(map);
      },
    });
    this.programService.loadAll().subscribe({
      next: (data) => {
        this.semesters.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Błąd ładowania danych programu:', err);
        this.loading.set(false);
      },
    });
  }

  openDetails(subject: SubjectRow, semester: number = 1): void {
    this.selectedSubject.set(subject);
    this.selectedSemester.set(semester);
    this.dialogTitle.set(subject.name);
    this.sylabus.set(null);
    this.dialogVisible.set(true);

    if (subject.syllabusFile) {
      this.sylabusLoading.set(true);
      const url = this.baseHrefService.assetUrl(subject.syllabusFile);
      this.http.get<SylabusFile>(url).subscribe({
        next: (data) => {
          this.sylabus.set(data.sylabus);
          this.sylabusLoading.set(false);
        },
        error: () => {
          this.sylabusLoading.set(false);
        },
      });
    }
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedSubject.set(null);
    this.sylabus.set(null);
  }

  getTypeLabel(type: string): string {
    if (type === 'M') return 'Obowiązkowy';
    if (type === 'O') return 'Obieralny';
    return type;
  }

  asArray(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((i: any) => typeof i === 'object' ? (i.peu ?? '') : i);
    return [val];
  }

  isEfektyObjects(val: any): boolean {
    return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && 'peu' in val[0];
  }

  asEfektyItems(val: any): { keu: string; peu: string; metoda_weryfikacji: string }[] {
    return Array.isArray(val) ? val : [];
  }

  normalizeEfekty(val: any): any[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.trim() ? [val] : [];
    return [];
  }

  getZaliczenieEntries(z: Record<string, { sposob: string }> | undefined): { forma: string; sposob: string }[] {
    if (!z) return [];
    return Object.entries(z).map(([forma, v]) => ({ forma, sposob: v.sposob }));
  }

  getMetodyEntries(m: any): { forma: string; metody: string[] }[] {
    if (!m) return [];
    return Object.entries(m)
      .filter(([, v]) => Array.isArray(v) && (v as string[]).length > 0)
      .map(([forma, v]) => ({ forma, metody: v as string[] }));
  }

  getChangesForSemester(semester: number): ProgramChange[] {
    return this.changesMap().get(semester) ?? [];
  }

  getChangeSeverity(type: ProgramChange['type']): 'success' | 'info' | 'warn' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
      nowy: 'success',
      zmiana: 'info',
      przeniesienie: 'warn',
      usunięcie: 'danger',
    };
    return map[type] ?? 'info';
  }

  getChangeIcon(type: ProgramChange['type']): string {
    const map: Record<string, string> = {
      nowy: 'pi pi-plus-circle',
      zmiana: 'pi pi-pencil',
      przeniesienie: 'pi pi-arrow-right-arrow-left',
      usunięcie: 'pi pi-trash',
    };
    return map[type] ?? 'pi pi-info-circle';
  }

  getChangeLabel(type: ProgramChange['type']): string {
    const map: Record<string, string> = {
      nowy: 'Nowy przedmiot',
      zmiana: 'Zmiana',
      przeniesienie: 'Przeniesienie',
      usunięcie: 'Usunięcie',
    };
    return map[type] ?? type;
  }

  isTresciObject(tresci: any): tresci is SylabusTrescProgramowa[] {
    return Array.isArray(tresci) && tresci.length > 0 && typeof tresci[0] === 'object' && 'nr_zajec' in tresci[0];
  }

  asTresciRows(tresci: any): SylabusTrescProgramowa[] {
    return tresci as SylabusTrescProgramowa[];
  }

  getKryteriaOceny(k: any): string[] {
    if (!k) return [];
    if (Array.isArray(k)) return k as string[];
    return [];
  }

  getKryteriaOcenyObj(k: any): SylabusKryteriaOceny | null {
    if (!k || Array.isArray(k)) return null;
    return k as SylabusKryteriaOceny;
  }
}
