import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Semester } from './models/schedule.models';
import { WeeklyViewComponent } from './views/weekly-view/weekly-view.component';
import { ListViewComponent } from './views/list-view/list-view.component';

@Component({
  selector: 'app-schedule',
  imports: [FormsModule, SelectButtonModule, ToastModule, WeeklyViewComponent, ListViewComponent],
  providers: [MessageService],
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <h2>Plan zajęć</h2>
        <p-selectbutton
          [options]="semesterOptions"
          [(ngModel)]="activeSemester"
          optionLabel="label"
          optionValue="value"
        />
        <p-selectbutton
          [options]="viewOptions"
          [(ngModel)]="activeView"
          optionLabel="label"
          optionValue="value"
        />
      </div>

      <div class="page-content">
        @if (activeView === 'weekly') {
          <app-weekly-view [semesterType]="activeSemester" />
        } @else {
          <app-list-view [semesterType]="activeSemester" />
        }
      </div>
    </div>

    <p-toast position="bottom-right" />
  `,
  styleUrl: './schedule.component.css',
})
export class ScheduleComponent {
  protected activeView: 'weekly' | 'list' = 'weekly';
  protected activeSemester: Semester = 'zimowy';

  protected readonly semesterOptions = [
    { label: 'Semestr zimowy', value: 'zimowy' as Semester },
    { label: 'Semestr letni', value: 'letni' as Semester },
  ];

  protected readonly viewOptions = [
    { label: 'Widok tygodniowy', value: 'weekly', icon: 'pi pi-calendar' },
    { label: 'Lista', value: 'list', icon: 'pi pi-list' },
  ];
}
