import { Component, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { SchedulerGridComponent } from '../../components/scheduler-grid/scheduler-grid.component';
import { TimeLabelsComponent } from '../../components/time-labels/time-labels.component';
import { EntryDialogComponent } from '../../components/entry-dialog/entry-dialog.component';
import { ConflictDetectionService } from '../../services/conflict-detection.service';
import { MockDataService } from '../../services/mock-data.service';
import { ScheduleEntry, ScheduleFilters, Semester, semesterTypeOf } from '../../models/schedule.models';

@Component({
  selector: 'app-weekly-view',
  imports: [
    FilterBarComponent,
    SchedulerGridComponent,
    TimeLabelsComponent,
    EntryDialogComponent,
    ButtonModule,
    ConfirmDialogModule,
  ],
  templateUrl: './weekly-view.component.html',
  styleUrl: './weekly-view.component.css',
  providers: [ConfirmationService],
})
export class WeeklyViewComponent {
  protected readonly ROW_HEIGHT = 40;

  readonly semesterType = input<Semester>('zimowy');

  @ViewChild('dialog') dialog!: EntryDialogComponent;

  protected readonly filters = signal<ScheduleFilters>({ mode: 'stacjonarny', semesterNumber: null });
  protected readonly groupsPerDay = signal<Record<number, string[]>>({});

  private readonly mockData = inject(MockDataService);
  private readonly conflictService = inject(ConflictDetectionService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  constructor() {
    // Reset semester number when semester type changes
    effect(() => {
      this.semesterType();
      this.filters.update((f) => ({ ...f, semesterNumber: null }));
    });
  }

  protected readonly filteredEntries = computed(() => {
    const f = this.filters();
    const semType = this.semesterType();
    return this.mockData.entries().filter((e) => {
      if (e.studyMode !== f.mode) return false;
      if (semesterTypeOf(e.semesterNumber) !== semType) return false;
      if (f.semesterNumber !== null && e.semesterNumber !== f.semesterNumber) return false;
      return true;
    });
  });

  protected readonly conflictSet = computed(
    () => new Set(this.conflictService.detectConflicts(this.filteredEntries()).map((c) => c.entryId)),
  );

  protected readonly isStacjonarny = computed(() => this.filters().mode === 'stacjonarny');

  protected readonly activeDayNumbers = computed(() =>
    this.isStacjonarny() ? [0, 1, 2, 3, 4] : [4, 5, 6],
  );

  protected readonly totalGroupColumns = computed(() =>
    this.activeDayNumbers().reduce((total, day) => total + this.groupsForDay(day), 0),
  );

  protected readonly dayLabels = computed(() =>
    this.isStacjonarny()
      ? ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek']
      : ['Piątek', 'Sobota', 'Niedziela'],
  );

  protected onFiltersChanged(f: ScheduleFilters): void {
    this.filters.set(f);
  }

  protected groupsForDay(day: number): number {
    return this.groupsPerDay()[day]?.length ?? 1;
  }

  protected groupIndices(day: number): number[] {
    return Array.from({ length: this.groupsForDay(day) }, (_, i) => i);
  }

  protected groupName(day: number, g: number): string {
    return this.groupsPerDay()[day]?.[g] ?? `Gr. ${g + 1}`;
  }

  protected renameGroup(day: number, g: number, name: string): void {
    if (!name.trim()) return;
    this.groupsPerDay.update((m) => {
      const current = [...(m[day] ?? ['Gr. 1'])];
      current[g] = name.trim();
      return { ...m, [day]: current };
    });
  }

  protected addGroup(day: number): void {
    this.groupsPerDay.update((m) => {
      const current = m[day] ?? ['Gr. 1'];
      return { ...m, [day]: [...current, `Gr. ${current.length + 1}`] };
    });
  }

  protected removeGroup(day: number): void {
    this.confirmationService.confirm({
      message: `Czy na pewno usunąć ostatnią grupę dla tego dnia? Wpisy przypisane do tej grupy zostaną przesunięte do poprzedniej.`,
      header: 'Usuń grupę',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const currentGroups = this.groupsPerDay()[day] ?? ['Gr. 1'];
        const newMaxGroup = currentGroups.length - 2;
        this.mockData.entries.update((list) =>
          list.map((e) =>
            e.dayOfWeek === day && e.group > newMaxGroup
              ? { ...e, group: Math.max(0, newMaxGroup) }
              : e,
          ),
        );
        this.groupsPerDay.update((m) => ({ ...m, [day]: (m[day] ?? ['Gr. 1']).slice(0, -1) }));
      },
    });
  }

  protected onEntryMoved(event: { id: string; newDay: number; newGroup: number; newStartHour: number }): void {
    const entry = this.mockData.entries().find((e) => e.id === event.id);
    if (!entry) return;
    this.mockData.updateEntry({ ...entry, dayOfWeek: event.newDay, group: event.newGroup, startHour: event.newStartHour });
  }

  protected onEntryResized(event: { id: string; newDurationHours: number }): void {
    const entry = this.mockData.entries().find((e) => e.id === event.id);
    if (entry) this.mockData.updateEntry({ ...entry, durationHours: event.newDurationHours });
  }

  protected onEntryColorChanged(event: { id: string; color: string }): void {
    const entry = this.mockData.entries().find((e) => e.id === event.id);
    if (entry) this.mockData.updateEntry({ ...entry, color: event.color });
  }

  protected onPlacementRejected(): void {
    this.messageService.add({ severity: 'warn', summary: 'Nie można umieścić zajęć', detail: 'Wybrany termin nakłada się na inne zajęcia w tej grupie.' });
  }

  protected onCellsSelected(event: { day: number; group: number; groupSpan: number; startHour: number; durationHours: number }): void {
    const f = this.filters();
    const semType = this.semesterType();
    const semesterNumber = f.semesterNumber ?? (semType === 'zimowy' ? 1 : 2);
    const endHour = event.startHour + event.durationHours;
    const overlaps = this.filteredEntries().some((entry) =>
      entry.dayOfWeek === event.day &&
      event.group < entry.group + (entry.groupSpan ?? 1) &&
      event.group + event.groupSpan > entry.group &&
      event.startHour < entry.startHour + entry.durationHours && endHour > entry.startHour,
    );
    if (overlaps) {
      this.onPlacementRejected();
      return;
    }
    this.mockData.addEntry({
        id: crypto.randomUUID(),
        subjectName: 'Nowe zajęcia',
        lecturerName: '',
        room: '',
        dayOfWeek: event.day,
        group: event.group,
        groupSpan: event.groupSpan,
        startHour: event.startHour,
        durationHours: event.durationHours,
        semesterNumber,
        academicYear: '2025/2026',
        studyMode: f.mode,
    });
  }

  protected onEntryCloned(event: { sourceId: string; newDay: number; newGroup: number; newStartHour: number }): void {
    const source = this.mockData.entries().find((e) => e.id === event.sourceId);
    if (!source) return;
    this.mockData.addEntry({
      ...source,
      id: crypto.randomUUID(),
      dayOfWeek: event.newDay,
      group: event.newGroup,
      startHour: event.newStartHour,
    });
  }

  protected openCreateDialog(): void {
    this.dialog.open(null);
  }

  protected openEditDialog(id: string): void {
    const entry = this.mockData.entries().find((e) => e.id === id) ?? null;
    this.dialog.open(entry);
  }

  protected onSaved(entry: ScheduleEntry): void {
    if (this.mockData.entries().some((e) => e.id === entry.id)) {
      this.mockData.updateEntry(entry);
      this.messageService.add({ severity: 'success', summary: 'Zaktualizowano', detail: entry.subjectName });
    } else {
      this.mockData.addEntry(entry);
      this.messageService.add({ severity: 'success', summary: 'Dodano', detail: entry.subjectName });
    }
  }

  protected onDeleted(id: string): void {
    const name = this.mockData.entries().find((e) => e.id === id)?.subjectName;
    this.mockData.removeEntry(id);
    this.messageService.add({ severity: 'warn', summary: 'Usunięto', detail: name });
  }
}
