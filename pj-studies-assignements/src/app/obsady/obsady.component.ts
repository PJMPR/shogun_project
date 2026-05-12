import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';

import { ObsadyService, SemesterConfig } from './obsady.service';
import { SemesterViewModel } from './obsady.service';
import { SubjectRow, SylabusData, SylabusFile } from '../models/program.models';
import { BaseHrefService } from '../shared/base-href.service';
import { SylabusPreviewComponent } from '../shared/sylabus-preview/sylabus-preview.component';

export interface SelectedSubjectEntry {
  tryb: 'stacjonarny' | 'niestacjonarny';
  semester: number;
  subject: SubjectRow;
}

export interface AvailabilityEntry {
  day: string;
  from: string;
  to: string;
}

export interface SubjectTypeSelection {
  wyklad: boolean;
  lab: boolean;
  cwiczenia: boolean;
}

interface SeasonTrybEntry {
  tryb_studiow: string;
  rocznik: number;
  semestry: SemesterConfig[];
}

interface SeasonConfig {
  nazwa: string;
  semestry: SeasonTrybEntry[];
}

@Component({
  selector: 'app-obsady',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    TreeTableModule,
    ButtonModule,
    DialogModule,
    ProgressSpinnerModule,
    TagModule,
    CheckboxModule,
    TableModule,
    SylabusPreviewComponent,
  ],
  templateUrl: './obsady.component.html',
  styleUrl: './obsady.component.css',
})
export class ObsadyComponent implements OnInit {
  private http = inject(HttpClient);
  private baseHrefService = inject(BaseHrefService);
  private obsadyService = inject(ObsadyService);

  loading = signal(true);
  activeSeason = signal<'zimowy' | 'letni'>('zimowy');
  stacSemesters = signal<SemesterViewModel[]>([]);
  niestacSemesters = signal<SemesterViewModel[]>([]);

  dialogVisible = signal(false);
  dialogTitle = signal('');
  selectedSubject = signal<SubjectRow | null>(null);
  selectedSemester = signal<number>(1);
  sylabus = signal<SylabusData | null>(null);
  sylabusLoading = signal(false);

  // Selection state: key = `${tryb}:${semester}:${code}:${name}`
  selectedKeys = signal<Set<string>>(new Set());

  zgloszenieVisible = signal(false);

  selectedEntries = computed<SelectedSubjectEntry[]>(() => {
    const keys = this.selectedKeys();
    const result: SelectedSubjectEntry[] = [];
    const addFromSemesters = (sems: SemesterViewModel[], tryb: 'stacjonarny' | 'niestacjonarny') => {
      for (const sem of sems) {
        this.collectLeafRows(sem.nodes).forEach(row => {
          if (keys.has(this.rowKey(tryb, sem.semester, row))) {
            result.push({ tryb, semester: sem.semester, subject: row });
          }
        });
      }
    };
    addFromSemesters(this.stacSemesters(), 'stacjonarny');
    addFromSemesters(this.niestacSemesters(), 'niestacjonarny');
    return result.sort((a, b) => {
      const trybOrder = a.tryb.localeCompare(b.tryb);
      return trybOrder !== 0 ? trybOrder : a.semester - b.semester;
    });
  });

  private collectLeafRows(nodes: any[]): SubjectRow[] {
    const result: SubjectRow[] = [];
    for (const node of nodes) {
      if (node.children?.length) {
        result.push(...this.collectLeafRows(node.children));
      } else if (!node.data?.isGroup) {
        result.push(node.data as SubjectRow);
      }
    }
    return result;
  }

  rowKey(tryb: 'stacjonarny' | 'niestacjonarny', semester: number, row: SubjectRow): string {
    return `${tryb}:${semester}:${row.code}:${row.name}`;
  }

  isSelected(tryb: 'stacjonarny' | 'niestacjonarny', semester: number, row: SubjectRow): boolean {
    return this.selectedKeys().has(this.rowKey(tryb, semester, row));
  }

  toggleSelection(tryb: 'stacjonarny' | 'niestacjonarny', semester: number, row: SubjectRow): void {
    const key = this.rowKey(tryb, semester, row);
    const current = new Set(this.selectedKeys());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.selectedKeys.set(current);
  }

  removeSelection(entry: SelectedSubjectEntry): void {
    const key = this.rowKey(entry.tryb, entry.semester, entry.subject);
    const current = new Set(this.selectedKeys());
    current.delete(key);
    this.selectedKeys.set(current);
  }

  // === Type selections per subject (key = rowKey) ===
  typeSelections = signal<Map<string, SubjectTypeSelection>>(new Map());

  getTypeSelection(entry: SelectedSubjectEntry): SubjectTypeSelection {
    const key = this.rowKey(entry.tryb, entry.semester, entry.subject);
    return this.typeSelections().get(key) ?? { wyklad: true, lab: true, cwiczenia: true };
  }

  setTypeSelection(entry: SelectedSubjectEntry, field: keyof SubjectTypeSelection, value: boolean): void {
    const key = this.rowKey(entry.tryb, entry.semester, entry.subject);
    const current = new Map(this.typeSelections());
    const existing = current.get(key) ?? { wyklad: false, lab: false, cwiczenia: false };
    current.set(key, { ...existing, [field]: value });
    this.typeSelections.set(current);
  }

  // === Availability (dyspozycyjność) ===
  availabilityRows = signal<AvailabilityEntry[]>([{ day: '', from: '08:00', to: '16:00' }]);
  uwagi = '';

  // Available days computed from selected entries tryby
  availableDays = computed<{ value: string; label: string }[]>(() => {
    const entries = this.selectedEntries();
    const hasStac = entries.some(e => e.tryb === 'stacjonarny');
    const hasNstac = entries.some(e => e.tryb === 'niestacjonarny');
    const all = [
      { value: 'Pn', label: 'Poniedziałek' },
      { value: 'Wt', label: 'Wtorek' },
      { value: 'Śr', label: 'Środa' },
      { value: 'Cz', label: 'Czwartek' },
      { value: 'Pt', label: 'Piątek' },
      { value: 'Sb', label: 'Sobota' },
      { value: 'Nd', label: 'Niedziela' },
    ];
    if (hasStac && hasNstac) return all;
    if (hasNstac) return all.slice(5); // Sb, Nd
    return all.slice(0, 5); // Pn-Pt
  });

  addAvailabilityRow(): void {
    this.availabilityRows.update(rows => [...rows, { day: '', from: '08:00', to: '16:00' }]);
  }

  removeAvailabilityRow(index: number): void {
    this.availabilityRows.update(rows => rows.filter((_, i) => i !== index));
  }

  updateAvailabilityRow(index: number, field: keyof AvailabilityEntry, value: string): void {
    this.availabilityRows.update(rows =>
      rows.map((r, i) => i === index ? { ...r, [field]: value } : r)
    );
  }

  openZgloszenie(): void {
    this.zgloszenieVisible.set(true);
  }

  private zimConfig: SeasonConfig | null = null;
  private letConfig: SeasonConfig | null = null;

  ngOnInit(): void {
    forkJoin({
      zim: this.http.get<SeasonConfig>(this.baseHrefService.assetUrl('semestr_zimowy_2627.json')),
      let: this.http.get<SeasonConfig>(this.baseHrefService.assetUrl('semestr_letni_2627.json')),
    }).subscribe({
      next: ({ zim, let: letCfg }) => {
        this.zimConfig = zim;
        this.letConfig = letCfg;
        this.loadSeason();
      },
      error: (err) => {
        console.error('Błąd ładowania konfiguracji sezonów:', err);
        this.loading.set(false);
      },
    });
  }

  setSeason(season: 'zimowy' | 'letni'): void {
    if (this.activeSeason() === season) return;
    this.activeSeason.set(season);
    this.selectedKeys.set(new Set());
    this.typeSelections.set(new Map());
    this.availabilityRows.set([{ day: '', from: '08:00', to: '16:00' }]);
    this.uwagi = '';
    this.loadSeason();
  }

  private getSeasonConfig(season: 'zimowy' | 'letni'): SeasonConfig | null {
    return season === 'zimowy' ? this.zimConfig : this.letConfig;
  }

  private loadSeason(): void {
    const config = this.getSeasonConfig(this.activeSeason());
    if (!config) return;

    const stacEntry = config.semestry.find(s => s.tryb_studiow === 'stacjonarny');
    const niestacEntry = config.semestry.find(s => s.tryb_studiow === 'niestacjonarny');

    const stacSemestry = stacEntry?.semestry ?? [];
    const niestacSemestry = niestacEntry?.semestry ?? [];

    this.loading.set(true);

    forkJoin({
      stac: this.obsadyService.loadSemestry(stacSemestry, 'stacjonarny'),
      nstac: this.obsadyService.loadSemestry(niestacSemestry, 'niestacjonarny'),
    }).subscribe({
      next: ({ stac, nstac }) => {
        this.stacSemesters.set(stac);
        this.niestacSemesters.set(nstac);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Błąd ładowania obsad:', err);
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
}
