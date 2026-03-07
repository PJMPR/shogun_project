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

import { NiestacjonarneProgramService, SemesterViewModel } from './services/niestacjonarne-program.service';
import { SubjectRow, SylabusData, SylabusFile } from '../../stacjonarne/program/models/program.models';
import { BaseHrefService } from '../../shared/base-href.service';
import { SylabusFormComponent } from '../../shared/sylabus-form/sylabus-form.component';

@Component({
  selector: 'app-niestacjonarne-program',
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
    SylabusFormComponent,
  ],
  templateUrl: './niestacjonarne-program.component.html',
  styleUrl: './niestacjonarne-program.component.css',
})
export class NiestacjonarneProgramComponent implements OnInit {
  semesters = signal<SemesterViewModel[]>([]);
  loading = signal(true);
  programPdf = signal<string | null>(null);

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
    private programService: NiestacjonarneProgramService,
    private http: HttpClient,
    private router: Router,
  ) {}

  openPdf(pdfPath: string, title: string = 'Program studiów'): void {
    const url = this.baseHrefService.assetUrl(pdfPath.replace(/^assets\//, ''));
    this.router.navigate(['/pdf-viewer'], { queryParams: { url, title } });
  }


  getDocUrl(docPath: string): string {
    return this.baseHrefService.assetUrl(docPath.replace(/^assets\//, ''));
  }

  ngOnInit(): void {
    this.http.get<any>(this.baseHrefService.assetUrl('niestacjonarne/program.json')).subscribe({
      next: (raw) => { if (raw?.pdf) this.programPdf.set(raw.pdf); },
    });
    this.programService.loadAll().subscribe({
      next: (data) => {
        this.semesters.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Błąd ładowania danych programu niestacjonarnego:', err);
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

  asArray(val: string | string[] | undefined | null): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [val];
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
}


