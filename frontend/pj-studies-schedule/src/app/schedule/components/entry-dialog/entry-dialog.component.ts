import { Component, output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ScheduleEntry, StudyMode } from '../../models/schedule.models';
import { DesideratumOption } from '../../services/lecturer-desiderata.service';

type EntryForm = Omit<ScheduleEntry, 'id'>;

// Keyed by dayOfWeek — values are number of groups for that day

interface DayOption {
  label: string;
  value: number;
}

const STAC_DAYS: DayOption[] = [
  { label: 'Poniedziałek', value: 0 },
  { label: 'Wtorek', value: 1 },
  { label: 'Środa', value: 2 },
  { label: 'Czwartek', value: 3 },
  { label: 'Piątek', value: 4 },
];

const NIESTAC_DAYS: DayOption[] = [
  { label: 'Piątek', value: 4 },
  { label: 'Sobota', value: 5 },
  { label: 'Niedziela', value: 6 },
];

const MODE_OPTIONS: { label: string; value: StudyMode }[] = [
  { label: 'Stacjonarny', value: 'stacjonarny' },
  { label: 'Niestacjonarny', value: 'niestacjonarny' },
];

const SEMESTER_NUMBER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-entry-dialog',
  imports: [DialogModule, FormsModule, InputTextModule, InputNumberModule, SelectModule, ButtonModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      [header]="isEditing ? 'Edytuj wpis' : 'Nowy wpis'"
      [modal]="true"
      [style]="{ width: '920px', maxWidth: '96vw' }"
      (onHide)="onHide()"
    >
      <div class="dialog-body">
        <aside class="desiderata-panel">
          <div class="desiderata-heading">Dezyderaty dla wybranego semestru</div>
          @if (desiderataLoading()) {
            <div class="desiderata-state">Pobieranie dezyderatów…</div>
          } @else if (desiderataError()) {
            <div class="desiderata-state error">{{ desiderataError() }}</div>
          } @else if (desiderata().length === 0) {
            <div class="desiderata-state">Brak pasujących przedmiotów.</div>
          } @else {
            <div class="desiderata-list">
              @for (item of desiderata(); track item.assignmentId + ':' + item.id) {
                <button type="button" class="desideratum-card" (click)="applyDesideratum(item)">
                  <strong>{{ item.name }}</strong>
                  <span class="subject-code">{{ item.code || 'Brak kodu' }}</span>
                  <span>{{ item.lecturerName }}</span>
                </button>
              }
            </div>
          }
        </aside>

        <div class="dialog-form">
        <div class="form-row">
          <label>Przedmiot</label>
          <input pInputText [(ngModel)]="form.subjectName" placeholder="Nazwa przedmiotu" class="w-full" />
        </div>
        <div class="form-row">
          <label>Kod przedmiotu</label>
          <input pInputText [(ngModel)]="form.subjectCode" placeholder="Kod przedmiotu" class="w-full" />
        </div>
        <div class="form-row">
          <label>Forma zajęć</label>
          <p-select [options]="classTypeOptions" [(ngModel)]="form.classType" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="form-row">
          <label>Wykładowca</label>
          <input
            pInputText
            [(ngModel)]="form.lecturerName"
            (ngModelChange)="onLecturerNameChange($event)"
            placeholder="Imię i nazwisko"
            class="w-full"
          />
        </div>
        <div class="form-row">
          <label>E-mail wykładowcy</label>
          <input pInputText [(ngModel)]="form.lecturerEmail" placeholder="Opcjonalnie" class="w-full" />
        </div>
        <div class="form-row">
          <label>Keycloak userId wykładowcy</label>
          <input pInputText [(ngModel)]="form.lecturerUserId" placeholder="Identyfikator z Keycloak" class="w-full" />
        </div>
        <div class="form-row">
          <label>Sala (opcjonalnie)</label>
          <input pInputText [(ngModel)]="form.room" placeholder="np. 201, lab 105" class="w-full" />
        </div>
        <div class="form-row">
          <label>Tryb studiów</label>
          <p-select
            [options]="modeOptions"
            [(ngModel)]="form.studyMode"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            (ngModelChange)="onModeChange()"
          />
        </div>
        <div class="form-row">
          <label>Dzień tygodnia</label>
          <p-select
            [options]="dayOptions"
            [(ngModel)]="form.dayOfWeek"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="form-row-two">
          <div class="form-row">
            <label>Godzina rozpoczęcia</label>
            <p-inputnumber
              [(ngModel)]="form.startHour"
              [min]="8"
              [max]="20"
              [step]="0.5"
              [minFractionDigits]="1"
              [maxFractionDigits]="1"
              class="w-full"
            />
          </div>
          <div class="form-row">
            <label>Czas trwania (h)</label>
            <p-inputnumber
              [(ngModel)]="form.durationHours"
              [min]="0.5"
              [max]="6"
              [step]="0.5"
              [minFractionDigits]="1"
              [maxFractionDigits]="1"
              class="w-full"
            />
          </div>
        </div>
        <div class="form-row">
          <label>Numer semestru</label>
          <p-select
            [options]="semesterNumberOptions"
            [(ngModel)]="form.semesterNumber"
            placeholder="Wybierz semestr"
            class="w-full"
          />
        </div>
        <div class="form-row">
          <label>Grupa</label>
          <p-select
            [options]="groupOptions"
            [(ngModel)]="form.group"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="form-row">
          <label>Rok akademicki</label>
          <input
            pInputText
            [(ngModel)]="form.academicYear"
            placeholder="np. 2026/2027"
            class="w-full"
          />
        </div>
        </div>
      </div>

      <ng-template #footer>
        <div class="dialog-footer">
          @if (isEditing) {
            <p-button
              label="Usuń"
              severity="danger"
              [outlined]="true"
              icon="pi pi-trash"
              (onClick)="onDelete()"
            />
          }
          <p-button
            label="Anuluj"
            severity="secondary"
            [outlined]="true"
            (onClick)="close()"
          />
          <p-button label="Zapisz" icon="pi pi-check" (onClick)="onSave()" [disabled]="!isValid()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-top: 0.25rem;
      }
      .dialog-body {
        display: grid;
        grid-template-columns: minmax(230px, 0.8fr) minmax(320px, 1.2fr);
        gap: 1rem;
        max-height: 68vh;
      }
      .desiderata-panel {
        min-width: 0;
        padding-right: 0.75rem;
        border-right: 1px solid var(--p-surface-200);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .desiderata-heading {
        margin-bottom: 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--p-surface-700);
      }
      .desiderata-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        overflow-y: auto;
        padding: 2px 5px 2px 2px;
      }
      .desideratum-card {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        width: 100%;
        padding: 0.6rem;
        text-align: left;
        color: var(--p-surface-700);
        border: 1px solid var(--p-surface-300);
        border-radius: 7px;
        background: var(--p-surface-0, white);
        cursor: pointer;
      }
      .desideratum-card:hover {
        border-color: var(--p-primary-400);
        background: var(--p-primary-50);
      }
      .desideratum-card strong { color: var(--p-surface-900); }
      .desideratum-card span { font-size: 0.78rem; }
      .desideratum-card .subject-code { color: var(--p-primary-600); font-weight: 600; }
      .desiderata-state { padding: 1rem 0.25rem; font-size: 0.82rem; color: var(--p-surface-500); }
      .desiderata-state.error { color: var(--p-red-600); }
      .form-row {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .form-row label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--p-surface-700);
      }
      .form-row-two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      .dialog-footer {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      .w-full {
        width: 100%;
      }
      @media (max-width: 700px) {
        .dialog-body { grid-template-columns: 1fr; max-height: 72vh; overflow-y: auto; }
        .desiderata-panel { max-height: 230px; padding-right: 0; padding-bottom: 0.75rem; border-right: 0; border-bottom: 1px solid var(--p-surface-200); }
      }
    `,
  ],
})
export class EntryDialogComponent {
  readonly saved = output<ScheduleEntry>();
  readonly deleted = output<string>();
  readonly groupsPerDay = input<Record<number, string[]>>({});
  readonly desiderata = input<DesideratumOption[]>([]);
  readonly desiderataLoading = input(false);
  readonly desiderataError = input<string | null>(null);

  protected get groupOptions(): { label: string; value: number }[] {
    const groups = this.groupsPerDay()[this.form.dayOfWeek];
    if (groups?.length) return groups.map((name, i) => ({ label: name, value: i }));
    return [{ label: 'Gr. 1', value: 0 }];
  }

  protected visible = false;
  protected isEditing = false;
  protected dayOptions: DayOption[] = STAC_DAYS;

  private currentId: string | null = null;

  protected form: EntryForm = this.defaultForm();

  protected readonly modeOptions = MODE_OPTIONS;
  protected readonly semesterNumberOptions = SEMESTER_NUMBER_OPTIONS;
  protected readonly classTypeOptions = [
    { label: 'Wykład', value: 'lecture' }, { label: 'Ćwiczenia', value: 'exercises' },
    { label: 'Laboratorium', value: 'laboratory' }, { label: 'Projekt', value: 'project' },
    { label: 'Seminarium', value: 'seminar' }, { label: 'Inne', value: 'other' },
  ];

  open(entry: ScheduleEntry | null): void {
    this.isEditing = !!entry;
    this.currentId = entry?.id ?? null;

    if (entry) {
      const { id: _id, ...rest } = entry;
      this.form = { ...rest };
    } else {
      this.form = this.defaultForm();
    }

    this.dayOptions = this.form.studyMode === 'niestacjonarny' ? NIESTAC_DAYS : STAC_DAYS;
    this.visible = true;
  }

  protected onModeChange(): void {
    this.dayOptions = this.form.studyMode === 'niestacjonarny' ? NIESTAC_DAYS : STAC_DAYS;
    const valid = this.dayOptions.some((d) => d.value === this.form.dayOfWeek);
    if (!valid) this.form.dayOfWeek = this.dayOptions[0].value;
  }

  protected applyDesideratum(item: DesideratumOption): void {
    this.form = {
      ...this.form,
      subjectName: item.name,
      subjectCode: item.code ?? '',
      lecturerName: item.lecturerName,
      lecturerEmail: item.lecturerEmail,
      lecturerUserId: item.lecturerUserId,
      lecturerAssignmentId: item.assignmentId,
      studyMode: item.trybStudiow as StudyMode,
      semesterNumber: item.semester,
      academicYear: item.academicYear,
    };
    this.onModeChange();
  }

  protected onLecturerNameChange(name: string): void {
    const linked = this.desiderata().find((item) => item.assignmentId === this.form.lecturerAssignmentId);
    if (!linked || linked.lecturerName !== name) {
      this.form.lecturerAssignmentId = undefined;
      this.form.lecturerEmail = '';
      this.form.lecturerUserId = '';
    }
  }

  protected isValid(): boolean {
    return !!(this.form.subjectName?.trim() && this.form.lecturerName?.trim() && this.form.lecturerUserId?.trim());
  }

  protected onSave(): void {
    if (!this.isValid()) return;
    this.saved.emit({
      ...(this.form as EntryForm),
      id: this.currentId ?? crypto.randomUUID(),
    });
    this.close();
  }

  protected onDelete(): void {
    if (this.currentId) this.deleted.emit(this.currentId);
    this.close();
  }

  protected onHide(): void {
    this.visible = false;
  }

  protected close(): void {
    this.visible = false;
  }

  private defaultForm(): EntryForm {
    return {
      subjectName: '',
      subjectCode: '',
      lecturerName: '',
      lecturerEmail: '',
      lecturerUserId: '',
      classType: 'other',
      room: '',
      studyMode: 'stacjonarny',
      dayOfWeek: 0,
      group: 0,
      startHour: 8,
      durationHours: 1.5,
      semesterNumber: 1,
      academicYear: '2026/2027',
    };
  }
}
