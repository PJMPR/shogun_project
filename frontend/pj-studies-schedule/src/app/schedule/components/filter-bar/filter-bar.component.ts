import { Component, OnChanges, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ScheduleFilters, Semester, StudyMode } from '../../models/schedule.models';

const ZIMOWE_SEMESTRY = [1, 3, 5, 7];
const LETNIE_SEMESTRY = [2, 4, 6, 8];

@Component({
  selector: 'app-filter-bar',
  imports: [SelectButtonModule, SelectModule, FormsModule, ButtonModule],
  template: `
    <div class="filter-bar">
      <p-selectbutton
        [options]="modeOptions"
        [(ngModel)]="mode"
        optionLabel="label"
        optionValue="value"
        (ngModelChange)="emit()"
      />
      <p-select
        [options]="semestrOptions"
        [(ngModel)]="semesterNumber"
        placeholder="Semestr"
        [showClear]="true"
        (ngModelChange)="emit()"
        styleClass="filter-select"
      />
      <p-button
        label="Wyczyść"
        severity="secondary"
        [outlined]="true"
        size="small"
        icon="pi pi-times"
        (onClick)="clearFilters()"
      />
    </div>
  `,
  styles: [
    `
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      :host ::ng-deep .filter-select {
        min-width: 130px;
      }
    `,
  ],
})
export class FilterBarComponent implements OnChanges {
  readonly semesterType = input<Semester>('zimowy');
  readonly filtersChanged = output<ScheduleFilters>();

  protected mode: StudyMode = 'stacjonarny';
  protected semesterNumber: number | null = null;

  protected readonly modeOptions = [
    { label: 'Stacjonarny', value: 'stacjonarny' as StudyMode },
    { label: 'Niestacjonarny', value: 'niestacjonarny' as StudyMode },
  ];

  protected get semestrOptions(): number[] {
    return this.semesterType() === 'zimowy' ? ZIMOWE_SEMESTRY : LETNIE_SEMESTRY;
  }

  ngOnChanges(): void {
    this.semesterNumber = null;
    this.emit();
  }

  protected emit(): void {
    this.filtersChanged.emit({ mode: this.mode, semesterNumber: this.semesterNumber });
  }

  protected clearFilters(): void {
    this.semesterNumber = null;
    this.emit();
  }
}
