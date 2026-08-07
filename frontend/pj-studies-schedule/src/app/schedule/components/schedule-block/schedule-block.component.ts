import { Component, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { ScheduleEntry, formatHour } from '../../models/schedule.models';

@Component({
  selector: 'app-schedule-block',
  imports: [TooltipModule],
  template: `
    @if (entry(); as e) {
      <div class="block" [class.conflict]="hasConflict()" (click)="clicked.emit(e.id)">
        <span class="block-handle gs-drag-handle pi pi-arrows-alt"></span>
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

  protected readonly fmt = formatHour;
}
