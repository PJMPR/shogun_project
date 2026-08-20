import { CdkDrag, CdkDragEnd, CdkDragHandle, CdkDragStart } from '@angular/cdk/drag-drop';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { ScheduleEntry, ScheduleLecturerOption } from '../../models/schedule.models';
import { ScheduleBlockComponent } from '../schedule-block/schedule-block.component';
import { LecturerAvailability } from '../../services/lecturer-desiderata.service';

const START_HOUR = 8;
const END_HOUR = 20;
const SLOTS_PER_HOUR = 4;
const COMPACT_LABEL_COLUMN_WIDTH_PX = 112;

interface CellPosition { col: number; row: number }
interface AvailabilityCell extends CellPosition { available: boolean }

@Component({
  selector: 'app-scheduler-grid',
  imports: [CdkDrag, CdkDragHandle, ScheduleBlockComponent],
  templateUrl: './scheduler-grid.component.html',
  styleUrl: './scheduler-grid.component.css',
})
export class SchedulerGridComponent implements AfterViewInit, OnDestroy {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly entries = input<ScheduleEntry[]>([]);
  readonly conflicts = input<Set<string>>(new Set());
  readonly activeDays = input<number[]>([]);
  readonly groupsPerDay = input<Record<number, string[]>>({});
  readonly visibleGroupIndices = input<Record<number, number[]>>({});
  readonly rowHeightPx = input(40);
  readonly availabilityByAssignment = input<Record<number, LecturerAvailability[]>>({});
  readonly commentCounts = input<Partial<Record<string, number>>>({});
  readonly lecturerOptions = input<ScheduleLecturerOption[]>([]);

  readonly entryMoved = output<{ id: string; newDay: number; newGroup: number; newStartHour: number }>();
  readonly entryResized = output<{ id: string; newDurationHours: number }>();
  readonly entryClicked = output<string>();
  readonly entryColorChanged = output<{ id: string; color: string }>();
  readonly cellsSelected = output<{ day: number; group: number; groupSpan: number; startHour: number; durationHours: number }>();
  readonly entryCloned = output<{ sourceId: string; newDay: number; newGroup: number; newStartHour: number }>();
  readonly placementRejected = output<void>();
  readonly commentsRequested = output<string>();
  readonly entryRoomChanged = output<{ id: string; room: string }>();
  readonly entryLecturerChanged = output<{ id: string; lecturer: ScheduleLecturerOption }>();
  readonly entriesMoved = output<{ ids: string[]; dayDelta: number; groupDelta: number; hourDelta: number }>();
  readonly entryGroupRangeChanged = output<{ id: string; group: number; groupSpan: number }>();

  @ViewChild('surface') private surfaceRef!: ElementRef<HTMLElement>;

  protected readonly totalColumns = computed(() =>
    this.activeDays().reduce((total, day) => total + this.groupCount(day), 0) || 1,
  );
  private readonly surfaceWidthPx = signal(0);
  protected readonly compactLabels = computed(() => {
    const width = this.surfaceWidthPx();
    return width > 0 && width / this.totalColumns() < COMPACT_LABEL_COLUMN_WIDTH_PX;
  });
  protected readonly totalRows = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

  protected selection: { start: CellPosition; end: CellPosition } | null = null;
  protected selectionHint: { x: number; y: number; durationMinutes: number } | null = null;
  protected resizePreview: { id: string; slots: number } | null = null;
  protected horizontalResizePreview: { id: string; group: number; groupSpan: number } | null = null;
  protected draggedEntry: ScheduleEntry | null = null;
  protected readonly selectedEntryIds = signal<Set<string>>(new Set());
  private marqueeSelection = false;
  private resizing: { entry: ScheduleEntry; startY: number; initialSlots: number } | null = null;
  private horizontalResizing: { entry: ScheduleEntry; edge: 'left' | 'right'; startX: number; initialGroup: number; initialSpan: number } | null = null;
  private dragged = false;
  private surfaceResizeObserver?: ResizeObserver;

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.horizontalResizing) this.updateHorizontalResize(event);
    else if (this.resizing) this.updateResize(event);
    else if (this.selection) this.updateSelection(event);
  };
  private readonly onPointerUp = (): void => {
    if (this.horizontalResizing) this.finishHorizontalResize();
    else if (this.resizing) this.finishResize();
    else if (this.selection) this.finishSelection();
  };

  constructor() {
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  }

  ngAfterViewInit(): void {
    this.surfaceResizeObserver = new ResizeObserver(([entry]) => {
      this.surfaceWidthPx.set(entry.contentRect.width);
    });
    this.surfaceResizeObserver.observe(this.surfaceRef.nativeElement);
  }

  protected groupCount(day: number): number {
    return this.visibleGroups(day).length || 1;
  }

  protected entryVisible(entry: ScheduleEntry): boolean {
    if (!this.activeDays().includes(entry.dayOfWeek)) return false;
    const endGroup = entry.group + (entry.groupSpan ?? 1);
    return this.visibleGroups(entry.dayOfWeek).some((group) => group >= entry.group && group < endGroup);
  }

  protected entryColumn(entry: ScheduleEntry): number {
    const preview = this.horizontalResizePreview?.id === entry.id ? this.horizontalResizePreview : null;
    const entryGroup = preview?.group ?? entry.group;
    let column = 1;
    for (const day of this.activeDays()) {
      if (day === entry.dayOfWeek) {
        const position = this.visibleGroups(day).findIndex((group) => group >= entryGroup);
        return column + Math.max(0, position);
      }
      column += this.groupCount(day);
    }
    return 1;
  }

  protected entryRow(entry: ScheduleEntry): number {
    return Math.round((entry.startHour - START_HOUR) * SLOTS_PER_HOUR) + 1;
  }

  protected entryGroupSpan(entry: ScheduleEntry): number {
    const preview = this.horizontalResizePreview?.id === entry.id ? this.horizontalResizePreview : null;
    const entryGroup = preview?.group ?? entry.group;
    const endGroup = entryGroup + (preview?.groupSpan ?? entry.groupSpan ?? 1);
    return Math.max(1, this.visibleGroups(entry.dayOfWeek).filter((group) => group >= entryGroup && group < endGroup).length);
  }

  protected entrySlots(entry: ScheduleEntry): number {
    return this.resizePreview?.id === entry.id
      ? this.resizePreview.slots
      : Math.max(1, Math.round(entry.durationHours * SLOTS_PER_HOUR));
  }

  protected selectedCells(): CellPosition[] {
    if (!this.selection) return [];
    const minCol = Math.min(this.selection.start.col, this.selection.end.col);
    const maxCol = Math.max(this.selection.start.col, this.selection.end.col);
    const minRow = Math.min(this.selection.start.row, this.selection.end.row);
    const maxRow = Math.max(this.selection.start.row, this.selection.end.row);
    const cells: CellPosition[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) cells.push({ col, row });
    }
    return cells;
  }

  protected availabilityCells(): AvailabilityCell[] {
    if (!this.draggedEntry?.lecturerAssignmentId) return [];
    const availability = this.availabilityByAssignment()[this.draggedEntry.lecturerAssignmentId];
    if (!availability?.length) return [];
    const cells: AvailabilityCell[] = [];
    for (let col = 0; col < this.totalColumns(); col++) {
      const day = this.columnToDayGroup(col).day;
      for (let row = 0; row < this.totalRows; row++) {
        const start = START_HOUR + row / SLOTS_PER_HOUR;
        cells.push({ col, row, available: this.isAvailable(availability, day, start, 1 / SLOTS_PER_HOUR) });
      }
    }
    return cells;
  }

  protected hasAvailabilityWarning(entry: ScheduleEntry): boolean {
    if (!entry.lecturerAssignmentId) return false;
    const availability = this.availabilityByAssignment()[entry.lecturerAssignmentId];
    return !!availability?.length && !this.isAvailable(availability, entry.dayOfWeek, entry.startHour, entry.durationHours);
  }

  protected startDrag(event: CdkDragStart<ScheduleEntry>): void {
    this.draggedEntry = event.source.data;
  }

  protected startSelection(event: PointerEvent): void {
    if (event.button !== 0 || ((event.target as Element).closest('.schedule-item') && !event.shiftKey)) return;
    const cell = this.eventToCell(event);
    if (!cell) return;
    event.preventDefault();
    this.marqueeSelection = event.shiftKey;
    this.selection = { start: cell, end: cell };
    this.updateSelectionHint(event, cell);
  }

  private updateSelection(event: PointerEvent): void {
    const cell = this.eventToCell(event);
    if (!cell || !this.selection) return;
    const startDay = this.columnToDayGroup(this.selection.start.col).day;
    const currentDay = this.columnToDayGroup(cell.col).day;
    this.selection = {
      ...this.selection,
      end: { col: currentDay === startDay ? cell.col : this.dayEdgeColumn(startDay, cell.col), row: cell.row },
    };
    this.updateSelectionHint(event, cell);
    this.changeDetector.markForCheck();
  }

  private finishSelection(): void {
    if (!this.selection) return;
    const { start, end } = this.selection;
    this.selection = null;
    this.selectionHint = null;
    this.changeDetector.markForCheck();
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    if (this.marqueeSelection) {
      this.marqueeSelection = false;
      this.selectedEntryIds.set(new Set(this.entries().filter((entry) => {
        const col = this.entryColumn(entry) - 1; const row = this.entryRow(entry) - 1;
        return col <= maxCol && col + this.entryGroupSpan(entry) - 1 >= minCol && row <= maxRow && row + this.entrySlots(entry) - 1 >= minRow;
      }).map((entry) => entry.id)));
      return;
    }
    if (minCol === maxCol && minRow === maxRow) return;
    const { day } = this.columnToDayGroup(minCol);
    const { group } = this.columnToDayGroup(minCol);
    this.cellsSelected.emit({
      day,
      group,
      groupSpan: maxCol - minCol + 1,
      startHour: START_HOUR + minRow / SLOTS_PER_HOUR,
      durationHours: (maxRow - minRow + 1) / SLOTS_PER_HOUR,
    });
  }

  protected formatSelectionDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (!hours) return `${minutes} min`;
    if (!remaining) return `${hours} godz.`;
    return `${hours} godz. ${remaining} min`;
  }

  private updateSelectionHint(event: PointerEvent, cell: CellPosition): void {
    if (!this.selection) return;
    const rect = this.surfaceRef.nativeElement.getBoundingClientRect();
    const selectedRows = Math.abs(cell.row - this.selection.start.row) + 1;
    this.selectionHint = {
      x: Math.max(8, Math.min(rect.width - 8, event.clientX - rect.left - 10)),
      y: Math.max(8, Math.min(rect.height - 8, event.clientY - rect.top + 16)),
      durationMinutes: selectedRows * 15,
    };
  }

  protected finishDrag(event: CdkDragEnd<ScheduleEntry>): void {
    const entry = event.source.data;
    const surface = this.surfaceRef.nativeElement.getBoundingClientRect();
    const item = event.source.element.nativeElement.getBoundingClientRect();
    // A wide entry is positioned by its leading (left) edge. Using its centre
    // makes a three-column block start in the second column after dropping it,
    // which changes its logical range and produces false overlap errors.
    const columnWidth = surface.width / this.totalColumns();
    const col = Math.max(0, Math.min(this.totalColumns() - 1, Math.round((item.left - surface.left) / columnWidth)));
    const row = Math.max(0, Math.min(this.totalRows - this.entrySlots(entry), Math.round((item.top - surface.top) / this.slotHeight())));
    event.source.reset();
    this.draggedEntry = null;
    this.dragged = true;
    queueMicrotask(() => (this.dragged = false));
    const target = this.columnToDayGroup(col);
    const day = target.day;
    const group = target.group;
    const newStartHour = START_HOUR + row / SLOTS_PER_HOUR;
    if (this.selectedEntryIds().has(entry.id) && this.selectedEntryIds().size > 1) {
      const dayDelta = this.activeDays().indexOf(day) - this.activeDays().indexOf(entry.dayOfWeek);
      this.entriesMoved.emit({ ids: [...this.selectedEntryIds()], dayDelta, groupDelta: group - entry.group, hourDelta: newStartHour - entry.startHour });
      return;
    }
    const pointer = event.event as MouseEvent;
    if (!this.canPlace(pointer.ctrlKey ? '' : entry.id, day, group, entry.groupSpan ?? 1, newStartHour, entry.durationHours)) {
      this.placementRejected.emit();
      return;
    }
    if (pointer.ctrlKey) this.entryCloned.emit({ sourceId: entry.id, newDay: day, newGroup: group, newStartHour });
    else this.entryMoved.emit({ id: entry.id, newDay: day, newGroup: group, newStartHour });
  }

  protected startResize(event: PointerEvent, entry: ScheduleEntry): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizing = { entry, startY: event.clientY, initialSlots: this.entrySlots(entry) };
    this.resizePreview = { id: entry.id, slots: this.entrySlots(entry) };
  }

  private updateResize(event: PointerEvent): void {
    if (!this.resizing) return;
    const deltaSlots = Math.round((event.clientY - this.resizing.startY) / this.slotHeight());
    const startSlot = this.entryRow(this.resizing.entry) - 1;
    this.resizePreview = {
      id: this.resizing.entry.id,
      slots: Math.max(1, Math.min(this.totalRows - startSlot, this.resizing.initialSlots + deltaSlots)),
    };
    this.changeDetector.markForCheck();
  }

  private finishResize(): void {
    if (!this.resizing || !this.resizePreview) return;
    const { entry } = this.resizing;
    const durationHours = this.resizePreview.slots / SLOTS_PER_HOUR;
    this.resizing = null;
    this.resizePreview = null;
    this.changeDetector.markForCheck();
    if (!this.canPlace(entry.id, entry.dayOfWeek, entry.group, entry.groupSpan ?? 1, entry.startHour, durationHours)) {
      this.placementRejected.emit();
      return;
    }
    if (durationHours !== entry.durationHours) this.entryResized.emit({ id: entry.id, newDurationHours: durationHours });
  }

  protected clickEntry(id: string): void {
    if (!this.dragged && !this.resizing) this.entryClicked.emit(id);
  }

  @HostListener('document:keydown.escape') protected clearSelection(): void { this.selectedEntryIds.set(new Set()); }

  protected startHorizontalResize(event: PointerEvent, entry: ScheduleEntry, edge: 'left' | 'right'): void {
    event.preventDefault();
    event.stopPropagation();
    const initialSpan = entry.groupSpan ?? 1;
    this.horizontalResizing = { entry, edge, startX: event.clientX, initialGroup: entry.group, initialSpan };
    this.horizontalResizePreview = { id: entry.id, group: entry.group, groupSpan: initialSpan };
  }

  private updateHorizontalResize(event: PointerEvent): void {
    if (!this.horizontalResizing) return;
    const state = this.horizontalResizing;
    const columnWidth = this.surfaceRef.nativeElement.getBoundingClientRect().width / this.totalColumns();
    if (columnWidth <= 0) return;
    const delta = Math.round((event.clientX - state.startX) / columnWidth);
    const max = this.groupsPerDay()[state.entry.dayOfWeek]?.length ?? 1;
    let group = state.initialGroup;
    let span = state.initialSpan;
    if (state.edge === 'left') {
      const rightEdge = state.initialGroup + state.initialSpan;
      group = Math.max(0, Math.min(rightEdge - 1, state.initialGroup + delta));
      span = rightEdge - group;
    } else {
      span = Math.max(1, Math.min(max - state.initialGroup, state.initialSpan + delta));
    }
    this.horizontalResizePreview = { id: state.entry.id, group, groupSpan: span };
    this.changeDetector.markForCheck();
  }

  private finishHorizontalResize(): void {
    if (!this.horizontalResizing || !this.horizontalResizePreview) return;
    const { entry } = this.horizontalResizing;
    const { group, groupSpan } = this.horizontalResizePreview;
    this.horizontalResizing = null;
    this.horizontalResizePreview = null;
    this.changeDetector.markForCheck();
    if (group === entry.group && groupSpan === (entry.groupSpan ?? 1)) return;
    if (!this.canPlace(entry.id, entry.dayOfWeek, group, groupSpan, entry.startHour, entry.durationHours)) {
      this.placementRejected.emit();
      return;
    }
    this.entryGroupRangeChanged.emit({ id: entry.id, group, groupSpan });
  }

  private canPlace(id: string, day: number, group: number, groupSpan: number, start: number, duration: number): boolean {
    const groupCount = this.groupsPerDay()[day]?.length ?? 0;
    if (group < 0 || groupSpan < 1 || group + groupSpan > groupCount) return false;
    const end = start + duration;
    return !this.entries().some((entry) =>
      entry.id !== id && entry.dayOfWeek === day &&
      group < entry.group + (entry.groupSpan ?? 1) && group + groupSpan > entry.group &&
      start < entry.startHour + entry.durationHours && end > entry.startHour,
    );
  }

  private isAvailable(availability: LecturerAvailability[], day: number, start: number, duration: number): boolean {
    const end = start + duration;
    const ranges = availability
      .filter((range) => this.dayNumber(range.day) === day)
      .map((range) => ({ from: this.parseTime(range.from), to: this.parseTime(range.to) }))
      .filter((range) => Number.isFinite(range.from) && Number.isFinite(range.to) && range.to > range.from)
      .sort((a, b) => a.from - b.from || a.to - b.to);

    // Treat touching/overlapping ranges as one interval. This makes availability
    // independent of the order returned by the API and handles split declarations.
    let coveredUntil = start;
    for (const range of ranges) {
      if (range.to <= coveredUntil) continue;
      if (range.from > coveredUntil) return false;
      coveredUntil = range.to;
      if (coveredUntil >= end) return true;
    }
    return false;
  }

  private dayNumber(value: string): number {
    const day = value.trim().toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const aliases: Record<string, number> = {
      pn: 0, pon: 0, poniedzialek: 0,
      wt: 1, wtorek: 1,
      sr: 2, sroda: 2,
      cz: 3, czw: 3, czwartek: 3,
      pt: 4, piatek: 4,
      sb: 5, sob: 5, sobota: 5,
      nd: 6, niedz: 6, niedziela: 6,
    };
    return aliases[day] ?? -1;
  }

  private parseTime(value: string): number {
    const [hours, minutes = '0'] = value.split(':');
    return Number(hours) + Number(minutes) / 60;
  }

  private eventToCell(event: PointerEvent): CellPosition | null {
    const rect = this.surfaceRef.nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right) return null;
    return {
      col: Math.max(0, Math.min(this.totalColumns() - 1, Math.floor((event.clientX - rect.left) / (rect.width / this.totalColumns())))),
      row: Math.max(0, Math.min(this.totalRows - 1, Math.floor((event.clientY - rect.top) / this.slotHeight()))),
    };
  }

  private columnToDayGroup(column: number): { day: number; group: number } {
    let offset = 0;
    for (const day of this.activeDays()) {
      const count = this.groupCount(day);
      if (column < offset + count) return { day, group: this.visibleGroups(day)[column - offset] ?? 0 };
      offset += count;
    }
    return { day: this.activeDays().at(-1) ?? 0, group: 0 };
  }

  private dayEdgeColumn(day: number, towardColumn: number): number {
    let first = 0;
    for (const current of this.activeDays()) {
      const last = first + this.groupCount(current) - 1;
      if (current === day) return towardColumn < first ? first : last;
      first = last + 1;
    }
    return 0;
  }

  private slotHeight(): number { return this.rowHeightPx() / 2; }

  private visibleGroups(day: number): number[] {
    return this.visibleGroupIndices()[day] ?? this.groupsPerDay()[day]?.map((_, index) => index) ?? [0];
  }

  ngOnDestroy(): void {
    this.surfaceResizeObserver?.disconnect();
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }
}
