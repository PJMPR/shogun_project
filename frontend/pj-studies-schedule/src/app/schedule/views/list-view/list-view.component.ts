import { Component, ViewChild, computed, inject, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EntryDialogComponent } from '../../components/entry-dialog/entry-dialog.component';
import { ConflictDetectionService } from '../../services/conflict-detection.service';
import { MockDataService } from '../../services/mock-data.service';
import { DAY_NAMES, ScheduleEntry, Semester, formatHour, semesterTypeOf } from '../../models/schedule.models';

@Component({
  selector: 'app-list-view',
  imports: [TableModule, ButtonModule, TagModule, TooltipModule, EntryDialogComponent],
  template: `
    <div class="list-view">
      <p-table
        [value]="filteredEntries()"
        styleClass="p-datatable-sm cockpit-schedule-table"
        [paginator]="true"
        [rows]="15"
        [rowsPerPageOptions]="[10, 15, 25]"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Tryb</th>
            <th>Semestr</th>
            <th>Dzień</th>
            <th>Godziny</th>
            <th>Przedmiot</th>
            <th>Wykładowca</th>
            <th>Sala</th>
            <th>Status</th>
            <th>Akcje</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-entry>
          <tr>
            <td>
              <p-tag
                [value]="entry.studyMode === 'stacjonarny' ? 'Stac.' : 'Niestac.'"
                [severity]="entry.studyMode === 'stacjonarny' ? 'info' : 'secondary'"
              />
            </td>
            <td>{{ entry.semesterNumber }}</td>
            <td>{{ dayNames[entry.dayOfWeek] }}</td>
            <td>{{ fmt(entry.startHour) }} – {{ fmt(entry.startHour + entry.durationHours) }}</td>
            <td>{{ entry.subjectName }}</td>
            <td>{{ entry.lecturerName }}</td>
            <td>{{ entry.room }}</td>
            <td>
              @if (conflictIds().has(entry.id)) {
                <p-tag
                  value="Konflikt"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                  pTooltip="Prowadzący lub wybrana sala mają w tym czasie inne zajęcia"
                />
              } @else {
                <p-tag value="OK" severity="success" />
              }
            </td>
            <td>
              <p-button
                icon="pi pi-pencil"
                size="small"
                [text]="true"
                (onClick)="openEdit(entry)"
              />
              <p-button
                icon="pi pi-trash"
                size="small"
                [text]="true"
                severity="danger"
                (onClick)="onDelete(entry)"
              />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="9" style="text-align:center; padding: 2rem">Brak wpisów w planie</td>
          </tr>
        </ng-template>
      </p-table>

      <app-entry-dialog #dialog (saved)="onSaved($event)" (deleted)="onDeleted($event)" />
    </div>
  `,
  styles: [
    `
      .list-view {
        padding-top: 0.5rem;
      }
    `,
  ],
})
export class ListViewComponent {
  @ViewChild('dialog') dialog!: EntryDialogComponent;

  readonly semesterType = input<Semester>('zimowy');

  protected readonly mockData = inject(MockDataService);
  private readonly conflictService = inject(ConflictDetectionService);
  private readonly messageService = inject(MessageService);

  protected readonly dayNames = DAY_NAMES;
  protected readonly fmt = formatHour;

  protected readonly filteredEntries = computed(() => {
    const semType = this.semesterType();
    return this.mockData.entries().filter((e) => semesterTypeOf(e.semesterNumber) === semType);
  });

  protected readonly conflictIds = computed(
    () =>
      new Set(
        this.conflictService.detectConflicts(this.mockData.entries()).map((c) => c.entryId),
      ),
  );

  protected openEdit(entry: ScheduleEntry): void {
    this.dialog.open(entry);
  }

  protected onSaved(entry: ScheduleEntry): void {
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
    this.messageService.add({ severity: 'warn', summary: 'Usunięto', detail: name });
  }

  protected onDelete(entry: ScheduleEntry): void {
    this.mockData.removeEntry(entry.id);
    this.messageService.add({ severity: 'warn', summary: 'Usunięto', detail: entry.subjectName });
  }
}
