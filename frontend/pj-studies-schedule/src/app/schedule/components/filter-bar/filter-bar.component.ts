import { Component, OnChanges, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ScheduleFilters, Semester, StudyMode } from '../../models/schedule.models';

const ZIMOWE_SEMESTRY = [1, 3, 5, 7];
const LETNIE_SEMESTRY = [2, 4, 6, 8];

@Component({
  selector: 'app-filter-bar',
  imports: [SelectButtonModule, FormsModule],
  template: `
    <div class="filter-bar">
      <p-selectbutton
        [options]="modeOptions"
        [(ngModel)]="mode"
        optionLabel="label"
        optionValue="value"
        (ngModelChange)="emit()"
      />
      <p-selectbutton
        [options]="semestrOptions"
        [(ngModel)]="semesterNumber"
        optionLabel="label"
        optionValue="value"
        (ngModelChange)="emit()"
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
    `,
  ],
})
export class FilterBarComponent implements OnChanges {
  readonly semesterType = input<Semester>('zimowy');
  readonly filtersChanged = output<ScheduleFilters>();

  protected mode: StudyMode = 'stacjonarny';
  protected semesterNumber: number | null = 1;

  protected readonly modeOptions = [
    { label: 'Stacjonarny', value: 'stacjonarny' as StudyMode },
    { label: 'Niestacjonarny', value: 'niestacjonarny' as StudyMode },
  ];

  protected get semestrOptions(): { label: string; value: number }[] {
    const semesters = this.semesterType() === 'zimowy' ? ZIMOWE_SEMESTRY : LETNIE_SEMESTRY;
    return semesters.map((value) => ({ label: `Semestr ${value}`, value }));
  }

  ngOnChanges(): void {
    this.semesterNumber = this.semestrOptions[0].value;
    this.emit();
  }

  setValue(filters: ScheduleFilters): void {
    this.mode = filters.mode;
    this.semesterNumber = filters.semesterNumber;
  }

  protected emit(): void {
    this.filtersChanged.emit({ mode: this.mode, semesterNumber: this.semesterNumber });
  }

}
