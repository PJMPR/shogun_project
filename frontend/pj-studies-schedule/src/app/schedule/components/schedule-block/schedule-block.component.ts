import { Component, input, output, signal } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { ScheduleEntry, formatHour } from '../../models/schedule.models';

@Component({
  selector: 'app-schedule-block',
  imports: [TooltipModule],
  template: `
    @if (entry(); as e) {
      <div
        class="block"
        [class.conflict]="hasConflict()"
        [style.--block-color]="e.color ?? colors[0]"
        (click)="clicked.emit(e.id)"
      >
        <button
          type="button"
          class="color-button pi pi-palette"
          title="Wybierz kolor"
          aria-label="Wybierz kolor bloku"
          (click)="togglePalette($event)"
        ></button>
        @if (paletteOpen()) {
          <div class="color-palette" role="listbox" aria-label="Kolor bloku" (click)="$event.stopPropagation()">
            @for (color of colors; track color) {
              <button
                type="button"
                class="color-swatch"
                role="option"
                [class.selected]="(e.color ?? colors[0]) === color"
                [attr.aria-selected]="(e.color ?? colors[0]) === color"
                [style.background]="color"
                (click)="selectColor($event, e.id, color)"
              ></button>
            }
          </div>
        }
        <div class="block-subject">{{ e.subjectName }}</div>
        <div class="block-meta">{{ e.lecturerName }}</div>
        <div class="block-meta">{{ e.room }}</div>
        <div class="block-time">{{ fmt(e.startHour) }} – {{ fmt(e.startHour + e.durationHours) }}</div>
        @if (hasConflict()) {
          <i
            class="pi pi-exclamation-triangle block-conflict-icon"
            pTooltip="Konflikt: ta sama sala lub wykładowca w tym czasie"
            tooltipPosition="top"
          ></i>
        }
      </div>
    }
  `,
  styleUrl: './schedule-block.component.css',
})
export class ScheduleBlockComponent {
  readonly entry = input<ScheduleEntry>();
  readonly hasConflict = input<boolean>(false);
  readonly clicked = output<string>();
  readonly colorChanged = output<{ id: string; color: string }>();

  protected readonly paletteOpen = signal(false);
  protected readonly colors = [
    '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6',
    '#22c55e', '#84cc16', '#eab308', '#f59e0b',
    '#f97316', '#ef4444', '#ec4899', '#d946ef',
    '#a855f7', '#8b5cf6', '#64748b', '#78716c',
  ];

  protected readonly fmt = formatHour;

  protected togglePalette(event: MouseEvent): void {
    event.stopPropagation();
    this.paletteOpen.update((open) => !open);
  }

  protected selectColor(event: MouseEvent, id: string, color: string): void {
    event.stopPropagation();
    this.colorChanged.emit({ id, color });
    this.paletteOpen.set(false);
  }
}
