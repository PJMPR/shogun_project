import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-time-labels',
  template: `
    <div class="time-labels" [style.--row-height.px]="rowHeightPx()">
      @for (label of labels(); track label) {
        <div class="time-label">{{ label }}</div>
      }
    </div>
  `,
  styleUrl: './time-labels.component.css',
})
export class TimeLabelsComponent {
  readonly startHour = input<number>(8);
  readonly endHour = input<number>(20);
  readonly rowHeightPx = input<number>(40);

  readonly labels = computed(() => {
    const result: string[] = [];
    for (let h = this.startHour(); h < this.endHour(); h++) {
      result.push(`${String(h).padStart(2, '0')}:00`);
      result.push('');
    }
    return result;
  });
}
