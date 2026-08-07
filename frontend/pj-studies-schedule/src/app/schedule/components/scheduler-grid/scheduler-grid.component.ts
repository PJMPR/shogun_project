import { CdkDrag, CdkDragEnd, CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, ElementRef, OnDestroy, ViewChild, computed, input, output } from '@angular/core';
import { ScheduleEntry } from '../../models/schedule.models';
import { ScheduleBlockComponent } from '../schedule-block/schedule-block.component';

const START_HOUR = 8;
const END_HOUR = 20;
const SLOTS_PER_HOUR = 4;

interface CellPosition { col: number; row: number }

@Component({
  selector: 'app-scheduler-grid',
  imports: [CdkDrag, CdkDragHandle, ScheduleBlockComponent],
  templateUrl: './scheduler-grid.component.html',
  styleUrl: './scheduler-grid.component.css',
})
export class SchedulerGridComponent implements OnDestroy {
  readonly entries = input<ScheduleEntry[]>([]);
  readonly conflicts = input<Set<string>>(new Set());
  readonly activeDays = input<number[]>([]);
  readonly groupsPerDay = input<Record<number, string[]>>({});
  readonly rowHeightPx = input(40);

  readonly entryMoved = output<{ id: string; newDay: number; newGroup: number; newStartHour: number }>();
  readonly entryResized = output<{ id: string; newDurationHours: number }>();
  readonly entryClicked = output<string>();
  readonly entryColorChanged = output<{ id: string; color: string }>();
  readonly cellsSelected = output<{ day: number; group: number; groupSpan: number; startHour: number; durationHours: number }>();
  readonly entryCloned = output<{ sourceId: string; newDay: number; newGroup: number; newStartHour: number }>();
  readonly placementRejected = output<void>();

  @ViewChild('surface') private surfaceRef!: ElementRef<HTMLElement>;

  protected readonly totalColumns = computed(() =>
    this.activeDays().reduce((total, day) => total + this.groupCount(day), 0) || 1,
  );
  protected readonly totalRows = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

  protected selection: { start: CellPosition; end: CellPosition } | null = null;
  protected resizePreview: { id: string; slots: number } | null = null;
  private resizing: { entry: ScheduleEntry; startY: number; initialSlots: number } | null = null;
  private dragged = false;

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.resizing) this.updateResize(event);
    else if (this.selection) this.updateSelection(event);
  };
  private readonly onPointerUp = (): void => {
    if (this.resizing) this.finishResize();
    else if (this.selection) this.finishSelection();
  };

  constructor() {
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  }

  protected groupCount(day: number): number {
    return this.groupsPerDay()[day]?.length ?? 1;
  }

  protected entryColumn(entry: ScheduleEntry): number {
    let column = 1;
    for (const day of this.activeDays()) {
      if (day === entry.dayOfWeek) return column + Math.min(entry.group ?? 0, this.groupCount(day) - 1);
      column += this.groupCount(day);
    }
    return 1;
  }

  protected entryRow(entry: ScheduleEntry): number {
    return Math.round((entry.startHour - START_HOUR) * SLOTS_PER_HOUR) + 1;
  }

  protected entryGroupSpan(entry: ScheduleEntry): number {
    return Math.max(1, Math.min(entry.groupSpan ?? 1, this.groupCount(entry.dayOfWeek) - entry.group));
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

  protected startSelection(event: PointerEvent): void {
    if (event.button !== 0 || (event.target as Element).closest('.schedule-item')) return;
    const cell = this.eventToCell(event);
    if (!cell) return;
    event.preventDefault();
    this.selection = { start: cell, end: cell };
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
  }

  private finishSelection(): void {
    if (!this.selection) return;
    const { start, end } = this.selection;
    this.selection = null;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
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

  protected finishDrag(event: CdkDragEnd<ScheduleEntry>): void {
    const entry = event.source.data;
    const surface = this.surfaceRef.nativeElement.getBoundingClientRect();
    const item = event.source.element.nativeElement.getBoundingClientRect();
    const col = Math.max(0, Math.min(this.totalColumns() - 1, Math.floor((item.left - surface.left + item.width / 2) / (surface.width / this.totalColumns()))));
    const row = Math.max(0, Math.min(this.totalRows - this.entrySlots(entry), Math.round((item.top - surface.top) / this.slotHeight())));
    event.source.reset();
    this.dragged = true;
    queueMicrotask(() => (this.dragged = false));
    const target = this.columnToDayGroup(col);
    const day = target.day;
    const group = Math.min(target.group, this.groupCount(day) - this.entryGroupSpan(entry));
    const newStartHour = START_HOUR + row / SLOTS_PER_HOUR;
    const pointer = event.event as MouseEvent;
    if (!this.canPlace(pointer.ctrlKey ? '' : entry.id, day, group, this.entryGroupSpan(entry), newStartHour, entry.durationHours)) {
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
  }

  private finishResize(): void {
    if (!this.resizing || !this.resizePreview) return;
    const { entry } = this.resizing;
    const durationHours = this.resizePreview.slots / SLOTS_PER_HOUR;
    this.resizing = null;
    this.resizePreview = null;
    if (!this.canPlace(entry.id, entry.dayOfWeek, entry.group, this.entryGroupSpan(entry), entry.startHour, durationHours)) {
      this.placementRejected.emit();
      return;
    }
    if (durationHours !== entry.durationHours) this.entryResized.emit({ id: entry.id, newDurationHours: durationHours });
  }

  protected clickEntry(id: string): void {
    if (!this.dragged && !this.resizing) this.entryClicked.emit(id);
  }

  private canPlace(id: string, day: number, group: number, groupSpan: number, start: number, duration: number): boolean {
    const end = start + duration;
    return !this.entries().some((entry) =>
      entry.id !== id && entry.dayOfWeek === day &&
      group < entry.group + (entry.groupSpan ?? 1) && group + groupSpan > entry.group &&
      start < entry.startHour + entry.durationHours && end > entry.startHour,
    );
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
      if (column < offset + count) return { day, group: column - offset };
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

  ngOnDestroy(): void {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }
}
