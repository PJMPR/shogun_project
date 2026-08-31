import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TreeTableModule } from 'primeng/treetable';
import { ScheduleEntry, StudyMode } from '../../models/schedule.models';
import { MockDataService } from '../../services/mock-data.service';

interface StaffingRow {
  kind: 'lecturer' | 'mode' | 'subject';
  name: string;
  mode?: StudyMode;
  semesters?: string;
  lessonHours: number;
}

interface SubjectAggregate {
  name: string;
  semesters: Set<number>;
  lessonHours: number;
}

interface ModeAggregate {
  mode: StudyMode;
  subjects: Map<string, SubjectAggregate>;
  lessonHours: number;
}

interface LecturerAggregate {
  name: string;
  modes: Map<StudyMode, ModeAggregate>;
  lessonHours: number;
}

@Component({
  selector: 'app-list-view',
  imports: [FormsModule, InputTextModule, TagModule, TreeTableModule],
  template: `
    <section class="staffing-view">
      <div class="summary">
        <div><span>Wykładowcy</span><strong>{{ totals().lecturers }}</strong></div>
        <div><span>Przedmioty</span><strong>{{ totals().subjects }}</strong></div>
        <div class="hours"><span>Godziny lekcyjne (45 min)</span><strong>{{ number(totals().lessonHours) }}</strong></div>
      </div>

      <p-treetable
        [value]="nodes()"
        styleClass="p-treetable-sm semester-table staffing-table"
        [showGridlines]="true"
        (onNodeExpand)="keepPagePosition()"
        (onNodeCollapse)="keepPagePosition()"
      >
        <ng-template pTemplate="header">
          <tr>
            <th class="name-column">
              <span>Nazwa</span>
              <input pInputText type="search" class="lecturer-filter" placeholder="Filtruj po nazwisku" [ngModel]="lecturerFilter()" (ngModelChange)="lecturerFilter.set($event)" />
            </th>
            <th class="mode-column">Tryb studiów</th>
            <th class="semester-column text-center">Semestr</th>
            <th class="hours-column text-center">Godziny lekcyjne</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-rowNode let-rowData="rowData">
          <tr [ttRow]="rowNode" [class.group-row]="rowData.kind === 'lecturer'" [class.child-row]="rowData.kind !== 'lecturer'" [class.mode-row]="rowData.kind === 'mode'">
            <td class="name-column">
              <p-treeTableToggler [rowNode]="rowNode" />
              <span class="row-name" [class.group-label]="rowData.kind === 'lecturer'">{{ rowData.name }}</span>
            </td>
            <td class="mode-column">
              @if (rowData.kind === 'subject' && rowData.mode) {
                <p-tag [value]="modeLabel(rowData.mode)" [severity]="rowData.mode === 'stacjonarny' ? 'info' : 'secondary'" />
              }
            </td>
            <td class="semester-column text-center">{{ rowData.semesters ?? '' }}</td>
            <td class="hours-column text-center">
              @if (rowData.kind === 'subject') {
                <span>{{ number(rowData.lessonHours) }}</span>
              } @else {
                <strong>{{ number(rowData.lessonHours) }}</strong>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4" class="empty">Brak zajęć w planach dla roku akademickiego {{ academicYear() }}.</td></tr>
        </ng-template>
      </p-treetable>
    </section>
  `,
  styles: [`
    .staffing-view { padding: 1rem 0; display: grid; gap: 1rem; color: var(--p-text-color); }
    .summary { display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)) minmax(220px, 1.5fr); gap: .75rem; }
    .summary > div { padding: 1rem 1.15rem; border: 1px solid var(--p-content-border-color); border-radius: 12px; background: var(--p-content-background); display: flex; flex-direction: column; gap: .25rem; }
    .summary span { font-size: .78rem; color: var(--p-text-muted-color); }
    .summary strong { font-size: 1.5rem; }
    .summary .hours { background: var(--p-primary-50); border-color: var(--p-primary-200); }
    :host ::ng-deep .staffing-table { width: 50%; margin-bottom: 1rem; }
    :host ::ng-deep .staffing-table .p-treetable-table { width: 100%; min-width: 0; table-layout: fixed; }
    :host ::ng-deep .staffing-table .name-column { width: 62% !important; }
    :host ::ng-deep .staffing-table .mode-column { width: 20% !important; }
    :host ::ng-deep .staffing-table .semester-column { width: 8% !important; }
    :host ::ng-deep .staffing-table .hours-column { width: 10% !important; }
    :host ::ng-deep .staffing-table .p-treetable-thead > tr > th { background: #e5e7eb !important; color: #374151; font-size: .8rem; font-weight: 600; }
    :host ::ng-deep .staffing-table .p-treetable-thead > tr > th { text-align: left !important; }
    :host ::ng-deep .staffing-table .p-treetable-thead > tr > th.text-center,
    :host ::ng-deep .staffing-table td.text-center { text-align: center !important; }
    .lecturer-filter { display: block; width: min(240px, 95%); height: 28px; margin-top: .4rem; padding: .25rem .5rem; font-size: .75rem; font-weight: 400; background: white; }
    :host ::ng-deep .staffing-table .p-treetable-tbody > tr > td { padding: .55rem .75rem; font-size: .8rem; }
    :host ::ng-deep .staffing-table .p-treetable-tbody > tr:nth-child(even) > td { background: #f3f4f6; }
    .row-name { vertical-align: middle; }
    :host ::ng-deep .staffing-table .group-row > td { background: #fff5f5 !important; font-weight: 600; }
    :host ::ng-deep .staffing-table .child-row > td { background: #fffafa; }
    :host ::ng-deep .staffing-table .child-row:nth-child(even) > td { background: #f3f4f6; }
    .group-label { font-weight: 600; }
    .group-row .row-name { font-size: .9rem; }
    .group-row td:last-child strong { color: #dc2626; font-size: .95rem; }
    .mode-row .row-name { font-weight: 600; }
    .empty { padding: 3rem !important; text-align: center; color: var(--p-text-muted-color); }
    @media (max-width: 750px) { .summary { grid-template-columns: 1fr 1fr; } }
  `],
})
export class ListViewComponent {
  readonly academicYear = input.required<string>();
  private readonly store = inject(MockDataService);
  protected readonly lecturerFilter = signal('');

  protected readonly nodes = computed<TreeNode<StaffingRow>[]>(() => {
    const lecturers = this.aggregate();
    return [...lecturers.entries()]
      .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'pl'))
      .map(([lecturerKey, lecturer]) => ({
        key: lecturerKey,
        data: { kind: 'lecturer', name: lecturer.name, lessonHours: lecturer.lessonHours },
        children: [...lecturer.modes.values()]
          .sort((a, b) => this.modeLabel(a.mode).localeCompare(this.modeLabel(b.mode), 'pl'))
          .map((mode) => ({
            key: `${lecturerKey}-${mode.mode}`,
            data: { kind: 'mode', name: this.modeLabel(mode.mode), mode: mode.mode, lessonHours: mode.lessonHours },
            children: [...mode.subjects.entries()]
              .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'pl'))
              .map(([subjectKey, subject]) => ({
                key: `${lecturerKey}-${mode.mode}-${subjectKey}`,
                data: {
                  kind: 'subject', name: subject.name, mode: mode.mode,
                  semesters: [...subject.semesters].sort((a, b) => a - b).join(', '),
                  lessonHours: subject.lessonHours,
                },
                leaf: true,
              })),
          })),
      }));
  });

  protected readonly totals = computed(() => {
    const lecturers = this.aggregate();
    const subjects = new Set<string>();
    let lessonHours = 0;
    for (const [lecturerKey, lecturer] of lecturers) {
      lessonHours += lecturer.lessonHours;
      for (const mode of lecturer.modes.values()) for (const [subjectKey, subject] of mode.subjects) {
        subjects.add(`${lecturerKey}-${mode.mode}-${subjectKey}`);
      }
    }
    return { lecturers: lecturers.size, subjects: subjects.size, lessonHours };
  });

  protected modeLabel(mode: StudyMode): string { return mode === 'stacjonarny' ? 'Dzienne' : 'Zaoczne'; }
  protected number(value: number): string { return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value); }
  protected keepPagePosition(): void {
    const left = window.scrollX;
    const top = window.scrollY;
    requestAnimationFrame(() => window.scrollTo({ left, top, behavior: 'auto' }));
  }

  private aggregate(): Map<string, LecturerAggregate> {
    const lecturers = new Map<string, LecturerAggregate>();
    const lecturerFilter = this.lecturerFilter().trim().toLocaleLowerCase('pl-PL');
    for (const { entry } of this.store.allPlanEntries()) {
      if (entry.academicYear !== this.academicYear() || !entry.lecturerName.trim()) continue;
      if (lecturerFilter && !entry.lecturerName.toLocaleLowerCase('pl-PL').includes(lecturerFilter)) continue;
      // Across plans the same lecturer may have a user id, an e-mail, or only a
      // display name. Group by the normalized display name so those variants
      // do not create separate rows in the staffing summary.
      const lecturerKey = this.normalizeLecturerName(entry.lecturerName);
      const subjectKey = (entry.subjectCode || entry.subjectName).trim().toLocaleLowerCase('pl-PL');
      const lecturer = lecturers.get(lecturerKey) ?? { name: entry.lecturerName, modes: new Map(), lessonHours: 0 };
      const mode = lecturer.modes.get(entry.studyMode) ?? { mode: entry.studyMode, subjects: new Map(), lessonHours: 0 };
      const subject = mode.subjects.get(subjectKey) ?? { name: entry.subjectName, semesters: new Set(), lessonHours: 0 };
      const hours = this.lessonHours(entry);
      subject.semesters.add(entry.semesterNumber);
      subject.lessonHours += hours; mode.lessonHours += hours; lecturer.lessonHours += hours;
      mode.subjects.set(subjectKey, subject); lecturer.modes.set(entry.studyMode, mode); lecturers.set(lecturerKey, lecturer);
    }
    return lecturers;
  }

  private lessonHours(entry: ScheduleEntry): number {
    if ((entry.staffingLessonHoursOverride ?? 0) > 0) return entry.staffingLessonHoursOverride!;
    const meetings = entry.meetingCountOverride ?? (entry.dates?.length ? entry.dates.length : entry.studyMode === 'stacjonarny' ? 15 : 8);
    return entry.durationHours * 60 / 45 * meetings;
  }

  private normalizeLecturerName(name: string): string {
    return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL');
  }
}
