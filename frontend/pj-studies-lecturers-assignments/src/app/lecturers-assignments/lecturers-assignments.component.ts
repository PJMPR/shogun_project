import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import {
  LecturersAssignmentsApiService,
  LecturerAssignmentDto,
} from './lecturers-assignments-api.service';

type StudyMode = 'Stacjonarne' | 'Niestacjonarne';

type ModeFilter = 'Wszystkie' | StudyMode;

const DAY_ORDER: Record<string, number> = {
  Pon: 0, Pn: 0, Wt: 1, Śr: 2, Sr: 2, Czw: 3, Pt: 4, Sob: 5, Nd: 6,
};

function slotLabel(time: string): string {
  return time.padStart(5, '0');
}

@Component({
  selector: 'app-lecturers-assignments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './lecturers-assignments.component.html',
  styleUrl: './lecturers-assignments.component.css',
})
export class LecturersAssignmentsComponent implements OnInit {
  private readonly api = inject(LecturersAssignmentsApiService);

  readonly days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
  readonly slots = (() => {
    const result: { id: string; label: string }[] = [];
    for (let h = 8; h < 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        result.push({ id: time, label: time });
      }
    }
    return result;
  })();

  loading = signal(true);
  error = signal<string | null>(null);
  lecturers = signal<LecturerAssignmentDto[]>([]);
  selectedLecturerId = signal<number | null>(null);
  selectedMode = signal<ModeFilter>('Wszystkie');

  readonly selectedLecturer = computed(() => {
    const id = this.selectedLecturerId();
    return this.lecturers().find((l) => l.id === id) ?? this.lecturers()[0] ?? null;
  });

  readonly filteredSubjects = computed(() => {
    const lecturer = this.selectedLecturer();
    if (!lecturer) return [];
    const mode = this.selectedMode();
    const subjects = lecturer.subjects;
    if (mode === 'Wszystkie') return subjects;
    const modeKey = mode === 'Stacjonarne' ? 'stacjonarny' : 'niestacjonarny';
    return subjects.filter((s) => s.trybStudiow === modeKey);
  });

  readonly stats = computed(() => {
    const all = this.lecturers();
    return {
      lecturers: all.length,
      subjects: all.reduce((sum, l) => sum + l.subjects.length, 0),
      hours: all.reduce(
        (sum, l) => sum + l.subjects.reduce((s2, sub) => s2 + this.subjectHours(sub), 0),
        0,
      ),
    };
  });

  ngOnInit(): void {
    this.api.getLatestPerLecturer().subscribe({
      next: (data) => {
        this.lecturers.set(data);
        if (data.length > 0) {
          this.selectedLecturerId.set(data[0].id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nie udało się pobrać danych. Spróbuj ponownie.');
        this.loading.set(false);
      },
    });
  }

  selectLecturer(id: number): void {
    this.selectedLecturerId.set(id);
    this.selectedMode.set('Wszystkie');
  }

  setMode(mode: ModeFilter): void {
    this.selectedMode.set(mode);
  }

  isAvailable(day: string, slotTime: string): boolean {
    const lecturer = this.selectedLecturer();
    if (!lecturer) return false;
    return lecturer.availability.some(
      (a) => this.dayMatches(a.day, day) && slotTime >= a.from && slotTime < a.to,
    );
  }

  subjectForms(sub: LecturerAssignmentDto['subjects'][number]): string[] {
    const forms: string[] = [];
    if (sub.hasWyklad) forms.push('wykład');
    if (sub.hasCwiczenia) forms.push('ćwiczenia');
    if (sub.hasLab) forms.push('laboratorium');
    return forms;
  }

  subjectHours(sub: LecturerAssignmentDto['subjects'][number]): number {
    return (sub.hasWyklad ? 30 : 0) + (sub.hasCwiczenia ? 15 : 0) + (sub.hasLab ? 30 : 0);
  }

  trybLabel(trybStudiow: string): string {
    return trybStudiow === 'stacjonarny' ? 'Stacjonarne' : 'Niestacjonarne';
  }

  lecturerName(l: LecturerAssignmentDto): string {
    return `${l.lecturerFirstName} ${l.lecturerLastName}`.trim();
  }

  private readonly dayFullLabels: Record<string, string> = {
    Pn: 'Pon', Pon: 'Pon',
    Wt: 'Wt',
    Śr: 'Śr', Sr: 'Śr',
    Cz: 'Czw', Czw: 'Czw',
    Pt: 'Pt',
    Sb: 'Sob', Sob: 'Sob',
    Nd: 'Nd',
  };

  availabilitySorted(lecturer: LecturerAssignmentDto) {
    return lecturer.availability
      .slice()
      .sort((a, b) => (this.dayCanonical[a.day] ?? 99) - (this.dayCanonical[b.day] ?? 99));
  }

  dayFullLabel(day: string): string {
    return this.dayFullLabels[day] ?? day;
  }

  private readonly dayCanonical: Record<string, number> = {
    Pn: 0, Pon: 0,
    Wt: 1,
    Śr: 2, Sr: 2,
    Cz: 3, Czw: 3,
    Pt: 4,
    Sb: 5, Sob: 5,
    Nd: 6,
  };

  private dayMatches(apiDay: string, gridDay: string): boolean {
    return this.dayCanonical[apiDay] === this.dayCanonical[gridDay];
  }

  // unused but kept for template compatibility
  statusSeverity(_: string): 'success' | 'warn' { return 'success'; }
}
