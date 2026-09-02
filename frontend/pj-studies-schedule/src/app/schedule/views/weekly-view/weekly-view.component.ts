import { Component, HostListener, ViewChild, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { SchedulerGridComponent } from '../../components/scheduler-grid/scheduler-grid.component';
import { TimeLabelsComponent } from '../../components/time-labels/time-labels.component';
import { EntryDialogComponent } from '../../components/entry-dialog/entry-dialog.component';
import { ConflictDetectionService } from '../../services/conflict-detection.service';
import { MockDataService } from '../../services/mock-data.service';
import { DesideratumOption, LecturerDesiderataService } from '../../services/lecturer-desiderata.service';
import { ScheduleEntry, ScheduleFilters, ScheduleGroup, ScheduleLecturerOption, SchedulePlanSummary, Semester, semesterTypeOf } from '../../models/schedule.models';
import { CommentsDrawerComponent } from '../../components/comments-drawer/comments-drawer.component';
import { ScheduleCommentsService } from '../../services/schedule-comments.service';
import { ScheduleNotesService } from '../../services/schedule-notes.service';
import { PlanNotesDrawerComponent } from '../../components/plan-notes-drawer/plan-notes-drawer.component';

@Component({
  selector: 'app-weekly-view',
  imports: [
    FilterBarComponent,
    SchedulerGridComponent,
    TimeLabelsComponent,
    EntryDialogComponent,
    ButtonModule,
    ConfirmDialogModule,
    CommentsDrawerComponent,
    PlanNotesDrawerComponent,
  ],
  templateUrl: './weekly-view.component.html',
  styleUrl: './weekly-view.component.css',
  providers: [ConfirmationService],
})
export class WeeklyViewComponent {
  protected readonly ROW_HEIGHT = 40;

  readonly semesterType = input<Semester>('zimowy');
  readonly academicYear = input.required<string>();
  readonly facultyCode = input.required<string>();
  readonly selectedPlan = input<SchedulePlanSummary | null>(null);
  readonly planCreated = output<string>();
  readonly planSelected = output<string | null>();

  @ViewChild('dialog') dialog!: EntryDialogComponent;

  protected readonly filters = signal<ScheduleFilters>({ mode: 'stacjonarny', semesterNumber: null });
  protected readonly hiddenGroupsByDay = signal<Record<number, number[]>>({});
  protected readonly groupsPerDay = computed<Record<number, string[]>>(() =>
    Object.fromEntries(this.activeDayNumbers().map((day) => [day, this.mockData.groups().map((group) => group.name)])),
  );
  protected readonly visibleGroupIndices = computed<Record<number, number[]>>(() =>
    Object.fromEntries(this.activeDayNumbers().map((day) => {
      const hidden = new Set(this.hiddenGroupsByDay()[day] ?? []);
      return [day, this.mockData.groups().map((_, index) => index).filter((index) => !hidden.has(index))];
    })),
  );

  protected readonly mockData = inject(MockDataService);
  private readonly conflictService = inject(ConflictDetectionService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  protected readonly desiderataService = inject(LecturerDesiderataService);
  protected readonly commentsService = inject(ScheduleCommentsService);
  protected readonly notesService = inject(ScheduleNotesService);
  protected readonly commentsDrawerOpen = signal(false);
  protected readonly selectedCommentEntryId = signal<string | null>(null);
  protected readonly creatingPlan = signal(false);
  protected readonly notesDrawerOpen = signal(false);
  protected readonly expandedDay = signal<number | null>(null);

  constructor() {
    this.desiderataService.load();
    // Reset semester number when semester type changes
    effect(() => {
      this.semesterType();
      this.filters.update((f) => ({ ...f, semesterNumber: this.semesterType() === 'zimowy' ? 1 : 2 }));
    });
    effect(() => {
      const selected = this.selectedPlan();
      if (!selected) return;
      this.filters.set({
        mode: selected.studyMode === 'stationary' ? 'stacjonarny' : 'niestacjonarny',
        semesterNumber: selected.semesterNumber,
      });
      const currentPlanId = untracked(() => this.mockData.current()?.id);
      if (currentPlanId !== selected.id) void this.mockData.reload(selected.id);
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

  protected readonly allDesiderataOptions = computed<DesideratumOption[]>(() =>
    this.desiderataService.items().flatMap((assignment) => assignment.subjects.map((subject) => ({
      ...subject,
      assignmentId: assignment.id,
      lecturerName: `${assignment.lecturerFirstName} ${assignment.lecturerLastName}`.trim(),
      lecturerEmail: assignment.lecturerEmail ?? undefined,
      lecturerUserId: assignment.lecturerUserId ?? '',
      semesterType: assignment.semesterType,
      academicYear: assignment.academicYear,
    }))),
  );

  protected readonly desiderataOptions = computed<DesideratumOption[]>(() => {
    const filters = this.filters();
    const semesterType = this.semesterType();
    return this.allDesiderataOptions().filter((item) =>
      this.normalizeSemesterType(item.semesterType) === semesterType &&
      this.normalizeStudyMode(item.trybStudiow) === filters.mode &&
      semesterTypeOf(item.semester) === semesterType &&
      (filters.semesterNumber === null || item.semester === filters.semesterNumber),
    );
  });

  protected readonly lecturerOptions = computed<ScheduleLecturerOption[]>(() => {
    const options = new Map<string, ScheduleLecturerOption>();
    for (const item of this.desiderataOptions()) {
      const key = this.lecturerKey(item.lecturerUserId, item.lecturerEmail, item.lecturerName);
      if (!options.has(key)) options.set(key, {
        key, name: item.lecturerName, lecturerAssignmentId: item.assignmentId,
        lecturerUserId: item.lecturerUserId, lecturerEmail: item.lecturerEmail,
      });
    }
    for (const item of this.mockData.lecturers()) {
      const key = this.lecturerKey(undefined, item.email, item.displayName);
      if (!options.has(key)) options.set(key, { key, name: item.displayName, lecturerEmail: item.email });
    }
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  });

  private normalizeSemesterType(value: string): Semester | null {
    const normalized = value.trim().toLocaleLowerCase('pl-PL');
    if (normalized.includes('zimow')) return 'zimowy';
    if (normalized.includes('letn')) return 'letni';
    return null;
  }

  private lecturerKey(userId: string | undefined, email: string | undefined, name: string): string {
    return (userId || email || name).trim().toLocaleLowerCase('pl-PL');
  }

  private normalizeStudyMode(value: string): ScheduleFilters['mode'] | null {
    const normalized = value.trim().toLocaleLowerCase('pl-PL');
    if (normalized === 'stationary' || normalized.startsWith('stacjonarn')) return 'stacjonarny';
    if (normalized === 'parttime' || normalized === 'part-time' || normalized.startsWith('niestacjonarn')) return 'niestacjonarny';
    return null;
  }

  protected readonly resolvedEntries = computed(() => this.filteredEntries().map((entry) => {
    if (entry.lecturerAssignmentId !== undefined) return entry;
    const userId = entry.lecturerUserId;
    const candidates = this.desiderataOptions().filter((item) =>
      item.lecturerUserId === userId &&
      (item.code === entry.subjectCode || item.name === entry.subjectName),
    );
    return candidates.length === 1 ? { ...entry, lecturerAssignmentId: candidates[0].assignmentId } : entry;
  }));

  protected readonly availabilityByAssignment = computed(() =>
    Object.fromEntries(
      this.desiderataService.items().map((assignment) => [assignment.id, assignment.availability ?? []]),
    ),
  );

  protected readonly commentCounts = computed(() => {
    this.commentsService.comments();
    return Object.fromEntries(this.mockData.entries().map((entry) => [entry.id, this.commentsService.count(entry.id)]));
  });

  protected readonly conflictSet = computed(
    () => {
      const currentEntries = this.resolvedEntries();
      const currentIds = new Set(currentEntries.map((entry) => entry.id));
      const otherPlans = this.mockData.conflictContextEntries().filter((entry) => !currentIds.has(entry.id));
      return new Set(this.conflictService.detectConflicts([...otherPlans, ...currentEntries]).map((c) => c.entryId));
    },
  );

  protected readonly isStacjonarny = computed(() => this.filters().mode === 'stacjonarny');

  protected readonly activeDayNumbers = computed(() => {
    const days = this.isStacjonarny() ? [0, 1, 2, 3, 4] : [4, 5, 6];
    const expanded = this.expandedDay(); return expanded === null ? days : days.filter((day) => day === expanded);
  });

  protected readonly totalGroupColumns = computed(() =>
    this.activeDayNumbers().reduce((total, day) => total + this.groupsForDay(day), 0),
  );

  protected readonly dayLabels = computed(() =>
    this.isStacjonarny()
      ? ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek']
      : ['Piątek', 'Sobota', 'Niedziela'],
  );

  protected async onFiltersChanged(f: ScheduleFilters): Promise<void> {
    this.filters.set(f);
    const current = this.mockData.current();
    const apiMode = f.mode === 'stacjonarny' ? 'stationary' : 'partTime';
    if (f.semesterNumber === null || (current?.semesterNumber === f.semesterNumber && current.studyMode === apiMode)) return;

    await this.mockData.loadFor(f.semesterNumber, f.mode);
    this.hiddenGroupsByDay.set({});
    this.closeComments();
    this.planSelected.emit(this.mockData.current()?.id ?? null);
  }

  protected dayLabel(day: number): string { return ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'][day]; }
  protected toggleExpandedDay(day: number): void { this.expandedDay.update((current) => current === day ? null : day); }
  @HostListener('document:keydown.escape') protected closeExpandedDay(): void { this.expandedDay.set(null); }

  protected groupsForDay(day: number): number {
    return Math.max(1, this.visibleGroupIndices()[day]?.length ?? 0);
  }

  protected groupIndices(day: number): number[] {
    return this.visibleGroupIndices()[day] ?? [];
  }

  protected hideGroup(day: number, group: number): void {
    if (this.groupsForDay(day) <= 1) return;
    this.hiddenGroupsByDay.update((hidden) => ({
      ...hidden,
      [day]: [...(hidden[day] ?? []), group],
    }));
  }

  protected restoreGroups(day: number): void {
    this.hiddenGroupsByDay.update((hidden) => ({ ...hidden, [day]: [] }));
  }

  protected hiddenGroupCount(day: number): number {
    return this.hiddenGroupsByDay()[day]?.length ?? 0;
  }

  protected groupName(day: number, g: number): string {
    return this.groupsPerDay()[day]?.[g] ?? `Gr. ${g + 1}`;
  }

  protected renameGroup(day: number, g: number, name: string): void {
    if (!name.trim()) return;
    const groups = [...this.mockData.groups()];
    if (groups[g]) { groups[g] = { ...groups[g], name: name.trim() }; this.mockData.setGroups(groups); }
  }

  protected addGroup(day: number): void {
    const groups = this.mockData.groups();
    const number = groups.length + 1;
    this.mockData.setGroups([...groups, { id: crypto.randomUUID(), code: `G${number}`, name: `Gr. ${number}`, sortOrder: groups.length }]);
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
        const currentGroups = this.mockData.groups();
        const newMaxGroup = currentGroups.length - 2;
        this.mockData.entries.update((list) =>
          list.map((e) =>
            e.dayOfWeek === day && e.group > newMaxGroup
              ? { ...e, group: Math.max(0, newMaxGroup) }
              : e,
          ),
        );
        this.mockData.setGroups(currentGroups.slice(0, -1));
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

  protected onEntryRoomChanged(event: { id: string; room: string }): void {
    const entry = this.mockData.entries().find((item) => item.id === event.id);
    if (entry) this.mockData.updateEntry({ ...entry, room: event.room });
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
        lecturerEmail: '',
        lecturerUserId: '',
        room: '',
        dayOfWeek: event.day,
        group: event.group,
        groupSpan: event.groupSpan,
        startHour: event.startHour,
        durationHours: event.durationHours,
        semesterNumber,
        academicYear: this.academicYear(),
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

  protected async createCurrentPlan(): Promise<void> {
    const filters = this.filters(); if (filters.semesterNumber === null) return;
    if (this.creatingPlan()) return;
    this.creatingPlan.set(true);
    try {
      await this.mockData.createPlan(this.facultyCode(), this.academicYear(), filters.semesterNumber, filters.mode);
      const createdId = this.mockData.current()?.id;
      if (createdId) this.planCreated.emit(createdId);
      this.messageService.add({ severity: 'success', summary: 'Utworzono plan', detail: `Semestr ${filters.semesterNumber}` });
    }
    catch { this.messageService.add({ severity: 'error', summary: 'Nie utworzono planu', detail: 'Spróbuj ponownie.' }); }
    finally { this.creatingPlan.set(false); }
  }

  protected onEntryLecturerChanged(event: { id: string; lecturer: ScheduleLecturerOption }): void {
    const entry = this.mockData.entries().find((item) => item.id === event.id);
    if (!entry) return;
    this.mockData.updateEntry({
      ...entry,
      lecturerName: event.lecturer.name,
      lecturerAssignmentId: event.lecturer.lecturerAssignmentId,
      lecturerUserId: event.lecturer.lecturerUserId ?? '',
      lecturerEmail: event.lecturer.lecturerEmail ?? '',
    });
  }

  protected onEntriesMoved(event: { ids: string[]; dayDelta: number; groupDelta: number; hourDelta: number }): void {
    const days = this.filters().mode === 'stacjonarny' ? [0, 1, 2, 3, 4] : [4, 5, 6]; const selected = new Set(event.ids);
    const moved = this.mockData.entries().map((entry) => {
      if (!selected.has(entry.id)) return entry;
      const day = days[days.indexOf(entry.dayOfWeek) + event.dayDelta];
      return { ...entry, dayOfWeek: day, group: entry.group + event.groupDelta, startHour: entry.startHour + event.hourDelta };
    });
    const valid = moved.filter((entry) => selected.has(entry.id)).every((entry) => entry.dayOfWeek !== undefined && entry.group >= 0 && entry.group + (entry.groupSpan ?? 1) <= this.mockData.groups().length && entry.startHour >= 8 && entry.startHour + entry.durationHours <= 20 && !moved.some((other) => other.id !== entry.id && other.dayOfWeek === entry.dayOfWeek && entry.group < other.group + (other.groupSpan ?? 1) && entry.group + (entry.groupSpan ?? 1) > other.group && entry.startHour < other.startHour + other.durationHours && entry.startHour + entry.durationHours > other.startHour));
    if (!valid) { this.onPlacementRejected(); return; }
    this.mockData.entries.set(moved); this.mockData.markEntriesDirty();
  }

  protected onEntryGroupRangeChanged(event: { id: string; group: number; groupSpan: number }): void {
    const entry = this.mockData.entries().find((item) => item.id === event.id); if (entry) this.mockData.updateEntry({ ...entry, group: event.group, groupSpan: event.groupSpan });
  }

  protected async saveChanges(): Promise<void> {
    try { await this.mockData.saveAll(); this.messageService.add({ severity: 'success', summary: 'Zapisano plany' }); }
    catch { this.messageService.add({ severity: this.mockData.stale() ? 'warn' : 'error', summary: this.mockData.stale() ? 'Plan jest nieaktualny' : 'Błąd zapisu', detail: this.mockData.error() ?? undefined }); }
  }

  protected refreshPlan(): void {
    const reload = () => void this.mockData.reload();
    if (!this.mockData.dirty()) { reload(); return; }
    this.confirmationService.confirm({ header: 'Odśwież plan', message: 'Niezapisane zmiany zostaną utracone. Kontynuować?', icon: 'pi pi-exclamation-triangle', acceptLabel: 'Odśwież', rejectLabel: 'Anuluj', accept: reload });
  }

  protected deleteCurrentPlan(): void {
    const plan = this.mockData.current(); if (!plan) return;
    this.confirmationService.confirm({ header: 'Usuń plan', message: `Usunąć plan dla semestru ${plan.semesterNumber}?`, icon: 'pi pi-trash', acceptLabel: 'Usuń', rejectLabel: 'Anuluj', acceptButtonStyleClass: 'p-button-danger', accept: async () => { try { await this.mockData.deleteCurrent(); this.planSelected.emit(null); this.messageService.add({ severity: 'warn', summary: 'Usunięto plan' }); } catch { this.messageService.add({ severity: 'error', summary: 'Nie udało się usunąć planu' }); } } });
  }

  protected openComments(id: string): void {
    const entry = this.mockData.entries().find((item) => item.id === id);
    if (!entry) return;
    if (!entry.concurrencyToken) {
      this.messageService.add({ severity: 'info', summary: 'Najpierw zapisz plan', detail: 'Komentarze można dodać po zapisaniu nowego bloczka.' });
      return;
    }
    this.commentsService.load(id);
    this.selectedCommentEntryId.set(id);
    this.commentsDrawerOpen.set(true);
  }

  protected openCommentsOverview(): void {
    this.selectedCommentEntryId.set(null);
    this.commentsDrawerOpen.set(true);
  }
  protected openNotes(): void { const id = this.mockData.current()?.id; if (!id) return; void this.notesService.load(id); this.notesDrawerOpen.set(true); }

  protected closeComments(): void {
    this.commentsDrawerOpen.set(false);
    this.selectedCommentEntryId.set(null);
  }

  protected onSaved(entry: ScheduleEntry): void {
    const plan = this.mockData.current();
    if (plan) entry = {
      ...entry,
      academicYear: plan.academicYear,
      semesterNumber: plan.semesterNumber,
      studyMode: plan.studyMode === 'stationary' ? 'stacjonarny' : 'niestacjonarny',
    };
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
    this.commentsService.removeForEntry(id);
    if (this.selectedCommentEntryId() === id) this.closeComments();
    this.messageService.add({ severity: 'warn', summary: 'Usunięto', detail: name });
  }
}
