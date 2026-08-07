import {
  ApplicationRef,
  Component,
  ComponentRef,
  EnvironmentInjector,
  OnDestroy,
  ViewChild,
  ElementRef,
  afterNextRender,
  createComponent,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { GridStack, GridStackNode } from 'gridstack';
import { ScheduleEntry } from '../../models/schedule.models';
import { ScheduleBlockComponent } from '../schedule-block/schedule-block.component';

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;
const SLOTS_PER_HOUR = 4; // one slot = 15 min (cellHeight = rowHeightPx/2 = 20px)

/** Generate and inject .gs-{N} CSS if not already present (GridStack only ships gs-12 CSS). */
function injectColumnCSS(column: number): void {
  const id = `gs-col-${column}`;
  if (document.getElementById(id)) return;
  const pct = (n: number) => `${((n / column) * 100).toFixed(6)}%`;
  const lines: string[] = [`#${id}{}`]; // anchor
  const sel = `.gs-${column}>.grid-stack-item`;
  lines.push(`${sel}{width:${pct(1)}}`);
  for (let i = 1; i < column; i++) lines.push(`${sel}[gs-x="${i}"]{left:${pct(i)}}`);
  for (let w = 2; w <= column; w++) lines.push(`${sel}[gs-w="${w}"]{width:${pct(w)}}`);
  const style = document.createElement('style');
  style.id = id;
  style.textContent = lines.join('');
  document.head.appendChild(style);
}

@Component({
  selector: 'app-gridstack',
  template: `<div class="grid-stack" #container></div>`,
  styleUrl: './gridstack.component.css',
})
export class GridstackComponent implements OnDestroy {
  readonly entries = input<ScheduleEntry[]>([]);
  readonly conflicts = input<Set<string>>(new Set());
  /** Active day numbers in display order, e.g. [0,1,2,3,4] or [4,5,6] */
  readonly activeDays = input<number[]>([]);
  /** Number of group sub-columns per day; value is array of group names */
  readonly groupsPerDay = input<Record<number, string[]>>({});
  readonly rowHeightPx = input<number>(40);

  readonly entryMoved = output<{ id: string; newDay: number; newGroup: number; newStartHour: number }>();
  readonly entryClicked = output<string>();
  readonly cellsSelected = output<{ day: number; groups: number[]; startHour: number; durationHours: number }>();
  readonly entryCloned = output<{ sourceId: string; newDay: number; newGroup: number; newStartHour: number }>();

  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;

  private grid: GridStack | null = null;
  private readonly compRefs = new Map<string, ComponentRef<ScheduleBlockComponent>>();
  private isSyncing = false;
  private _lastTotalCols = -1;
  private readonly gridReady = signal(false);

  // Selection state
  private selEl: HTMLElement | null = null;
  private isSelecting = false;
  private selStartCol = 0;
  private selStartRow = 0;
  private selEndCol = 0;
  private selEndRow = 0;

  // Ctrl+drag copy state
  private ctrlPressed = false;
  private preDragNode: { id: string; x: number; y: number } | null = null;

  // Bound refs for removeEventListener in ngOnDestroy
  private readonly _onKeyDown = (e: KeyboardEvent): void => { if (e.key === 'Control') this.ctrlPressed = true; };
  private readonly _onKeyUp = (e: KeyboardEvent): void => { if (e.key === 'Control') this.ctrlPressed = false; };
  private readonly _onMouseMove = (e: MouseEvent): void => this.onSelectionMove(e);
  private readonly _onMouseUp = (e: MouseEvent): void => this.onSelectionEnd(e);

  private readonly envInjector = inject(EnvironmentInjector);
  private readonly appRef = inject(ApplicationRef);

  constructor() {
    afterNextRender(() => {
      const total = this.computeTotalCols();
      this._lastTotalCols = total;
      this.initGrid(total);
      this.gridReady.set(true);
    });

    effect(() => {
      if (!this.gridReady()) return;
      const total = this.computeTotalCols();
      const entries = this.entries();
      const conflicts = this.conflicts();

      if (total !== this._lastTotalCols) {
        this._lastTotalCols = total;
        this.rebuildGrid(total, entries, conflicts);
      } else {
        this.syncGrid(entries, conflicts);
      }
    });
  }

  private computeTotalCols(): number {
    return this.activeDays().reduce((s, d) => s + (this.groupsPerDay()[d]?.length ?? 1), 0) || 1;
  }

  private entryToX(entry: ScheduleEntry): number {
    let x = 0;
    for (const d of this.activeDays()) {
      if (d === entry.dayOfWeek) {
        const maxGroup = (this.groupsPerDay()[d]?.length ?? 1) - 1;
        return x + Math.min(entry.group ?? 0, maxGroup);
      }
      x += this.groupsPerDay()[d]?.length ?? 1;
    }
    return x;
  }

  private xToDayGroup(x: number): { day: number; group: number } {
    let col = 0;
    const days = this.activeDays();
    for (const d of days) {
      const n = this.groupsPerDay()[d]?.length ?? 1;
      if (x < col + n) return { day: d, group: x - col };
      col += n;
    }
    return { day: days[days.length - 1] ?? 0, group: 0 };
  }

  private initGrid(totalCols: number): void {
    injectColumnCSS(totalCols);
    const totalRows = (GRID_END_HOUR - GRID_START_HOUR) * SLOTS_PER_HOUR;
    this.grid = GridStack.init(
      {
        column: totalCols,
        cellHeight: this.rowHeightPx() / 2, // 20px per 15-min slot
        float: true,
        animate: false,
        resizable: { handles: 's' },
        draggable: { handle: '.gs-drag-handle' },
        margin: 2,
        minRow: totalRows,
      },
      this.containerRef.nativeElement,
    );

    this.grid.on('dragstart', (_: Event, el: Element) => {
      const node = this.grid!.engine.nodes.find((n) => n.el === el);
      if (node) this.preDragNode = { id: String(node.id), x: node.x ?? 0, y: node.y ?? 0 };
    });

    this.grid.on('change', (_: Event, items: GridStackNode[]) => {
      if (this.isSyncing) return;
      for (const item of items) {
        if (!item.id) continue;
        const { day, group } = this.xToDayGroup(item.x ?? 0);
        const newStartHour = GRID_START_HOUR + (item.y ?? 0) / SLOTS_PER_HOUR;

        if (this.ctrlPressed && this.preDragNode?.id === String(item.id)) {
          // Ctrl+drag: restore original position and emit clone
          const origEl = this.containerRef.nativeElement.querySelector(
            `[gs-id="${item.id}"]`,
          ) as HTMLElement | null;
          if (origEl && this.preDragNode) {
            this.isSyncing = true;
            this.grid!.update(origEl, { x: this.preDragNode.x, y: this.preDragNode.y });
            this.isSyncing = false;
          }
          this.entryCloned.emit({ sourceId: String(item.id), newDay: day, newGroup: group, newStartHour });
        } else {
          this.entryMoved.emit({ id: String(item.id), newDay: day, newGroup: group, newStartHour });
        }
      }
      this.preDragNode = null;
    });

    this.setupSelectionHandlers();
    this.syncGrid(this.entries(), this.conflicts());
  }

  private setupSelectionHandlers(): void {
    const container = this.containerRef.nativeElement;

    const selEl = document.createElement('div');
    // Inline styles bypass Angular CSS encapsulation on dynamic elements
    Object.assign(selEl.style, {
      position: 'absolute',
      display: 'none',
      background: 'rgba(99,102,241,0.18)',
      border: '2px dashed #818cf8',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '10',
      boxSizing: 'border-box',
    });
    container.appendChild(selEl);
    this.selEl = selEl;

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);

    container.addEventListener('mousedown', (e: MouseEvent) => this.onSelectionStart(e));
    container.addEventListener('mouseover', (e: MouseEvent) => {
      container.style.cursor = (e.target as Element).closest('.grid-stack-item') ? '' : 'crosshair';
    });
  }

  private onSelectionStart(e: MouseEvent): void {
    if (e.button !== 0) return;
    if ((e.target as Element).closest('.grid-stack-item')) return;
    const pos = this.mouseToColRow(e);
    if (!pos) return;
    this.isSelecting = true;
    this.selStartCol = this.selEndCol = pos.col;
    this.selStartRow = this.selEndRow = pos.row;
    this.renderSelectionRect();
  }

  private onSelectionMove(e: MouseEvent): void {
    if (!this.isSelecting) return;
    const pos = this.mouseToColRow(e);
    if (!pos) return;

    // Constrain horizontal selection to the same day as start
    const startDay = this.xToDayGroup(this.selStartCol).day;
    const { day: newDay } = this.xToDayGroup(pos.col);

    if (newDay !== startDay) {
      let col = 0;
      for (const d of this.activeDays()) {
        const n = this.groupsPerDay()[d]?.length ?? 1;
        if (d === startDay) {
          this.selEndCol = pos.col > this.selStartCol ? col + n - 1 : col;
          break;
        }
        col += n;
      }
    } else {
      this.selEndCol = pos.col;
    }

    this.selEndRow = pos.row;
    this.renderSelectionRect();
  }

  private onSelectionEnd(_e: MouseEvent): void {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    if (this.selEl) this.selEl.style.display = 'none';

    const minCol = Math.min(this.selStartCol, this.selEndCol);
    const maxCol = Math.max(this.selStartCol, this.selEndCol);
    const minRow = Math.min(this.selStartRow, this.selEndRow);
    const maxRow = Math.max(this.selStartRow, this.selEndRow);

    // Require at least a minimal drag (not just a click)
    if (maxRow - minRow < 1 && maxCol - minCol < 1) return;

    const startHour = GRID_START_HOUR + minRow / SLOTS_PER_HOUR;
    const durationHours = (maxRow - minRow + 1) / SLOTS_PER_HOUR;
    const { day } = this.xToDayGroup(minCol);

    const groups: number[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      const { day: d, group } = this.xToDayGroup(col);
      if (d === day && !groups.includes(group)) groups.push(group);
    }

    this.cellsSelected.emit({ day, groups, startHour, durationHours });
  }

  private mouseToColRow(e: MouseEvent): { col: number; row: number } | null {
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width) return null;
    const total = this.computeTotalCols();
    const cellH = this.rowHeightPx() / 2; // 15-min cell height
    const col = Math.max(0, Math.min(total - 1, Math.floor(x / (rect.width / total))));
    const row = Math.max(0, Math.floor(y / cellH));
    return { col, row };
  }

  private renderSelectionRect(): void {
    if (!this.selEl) return;
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const total = this.computeTotalCols();
    const cellW = rect.width / total;
    const cellH = this.rowHeightPx() / 2; // 15-min cell height
    const minCol = Math.min(this.selStartCol, this.selEndCol);
    const maxCol = Math.max(this.selStartCol, this.selEndCol);
    const minRow = Math.min(this.selStartRow, this.selEndRow);
    const maxRow = Math.max(this.selStartRow, this.selEndRow);
    this.selEl.style.display = 'block';
    this.selEl.style.left = `${minCol * cellW}px`;
    this.selEl.style.top = `${minRow * cellH}px`;
    this.selEl.style.width = `${(maxCol - minCol + 1) * cellW}px`;
    this.selEl.style.height = `${(maxRow - minRow + 1) * cellH}px`;
  }

  private rebuildGrid(total: number, entries: ScheduleEntry[], conflicts: Set<string>): void {
    injectColumnCSS(total);
    for (const compRef of this.compRefs.values()) compRef.destroy();
    this.compRefs.clear();
    this.grid!.removeAll(false);
    this.containerRef.nativeElement
      .querySelectorAll('.grid-stack-item')
      .forEach((el) => el.remove());
    this.grid!.column(total);
    this.syncGrid(entries, conflicts);
  }

  private syncGrid(entries: ScheduleEntry[], conflicts: Set<string>): void {
    if (!this.grid) return;
    const entryIds = new Set(entries.map((e) => e.id));

    for (const [id, compRef] of this.compRefs) {
      if (entryIds.has(id)) continue;
      const el = this.containerRef.nativeElement.querySelector(
        `[gs-id="${id}"]`,
      ) as HTMLElement | null;
      if (el) this.grid.removeWidget(el, true, false);
      compRef.destroy();
      this.compRefs.delete(id);
    }

    for (const entry of entries) {
      const existingEl = this.containerRef.nativeElement.querySelector(
        `[gs-id="${entry.id}"]`,
      ) as HTMLElement | null;

      const x = this.entryToX(entry);
      const y = Math.round((entry.startHour - GRID_START_HOUR) * SLOTS_PER_HOUR);
      const h = Math.max(1, Math.round(entry.durationHours * SLOTS_PER_HOUR));

      if (existingEl) {
        const node = this.grid.engine.nodes.find((n) => n.id === entry.id);
        if (node && (node.x !== x || node.y !== y || node.h !== h)) {
          this.isSyncing = true;
          this.grid.update(existingEl, { x, y, h });
          this.isSyncing = false;
        }
        const compRef = this.compRefs.get(entry.id);
        if (compRef) {
          compRef.setInput('entry', entry);
          compRef.setInput('hasConflict', conflicts.has(entry.id));
          compRef.changeDetectorRef.detectChanges();
        }
        continue;
      }

      const itemEl = document.createElement('div');
      itemEl.classList.add('grid-stack-item');
      const contentEl = document.createElement('div');
      contentEl.classList.add('grid-stack-item-content');
      itemEl.appendChild(contentEl);

      const compRef = createComponent(ScheduleBlockComponent, {
        environmentInjector: this.envInjector,
        hostElement: contentEl,
      });
      compRef.setInput('entry', entry);
      compRef.setInput('hasConflict', conflicts.has(entry.id));
      compRef.instance.clicked.subscribe((id: string) => this.entryClicked.emit(id));
      this.appRef.attachView(compRef.hostView);
      this.compRefs.set(entry.id, compRef);

      itemEl.setAttribute('gs-id', entry.id);
      itemEl.setAttribute('gs-x', String(x));
      itemEl.setAttribute('gs-y', String(y));
      itemEl.setAttribute('gs-w', '1');
      itemEl.setAttribute('gs-h', String(h));

      this.grid.makeWidget(itemEl);
    }
  }

  ngOnDestroy(): void {
    for (const compRef of this.compRefs.values()) compRef.destroy();
    this.grid?.destroy(false);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }
}
