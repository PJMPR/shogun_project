import { Component, computed, inject, output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ScheduleEntry, ScheduleLecturer, ScheduleSubject, ScheduleSubjectLecturer, StudyMode } from '../../models/schedule.models';
import { DesideratumOption } from '../../services/lecturer-desiderata.service';
import { MockDataService } from '../../services/mock-data.service';

type EntryForm = Omit<ScheduleEntry, 'id'>;

// Keyed by dayOfWeek — values are number of groups for that day

interface DayOption {
  label: string;
  value: number;
}

interface DesiderataSubjectColumn {
  key: string;
  code: string;
  name: string;
  customSubject?: ScheduleSubject;
  lecturers: DesideratumOption[];
}

interface LecturerChoice {
  key: string;
  name: string;
  email?: string;
  userId?: string;
  assignmentId?: number;
}

interface ColumnLecturer extends LecturerChoice { persistedAssignment?: ScheduleSubjectLecturer }

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
      [style]="{ width: '1240px', maxWidth: '96vw' }"
      (onHide)="onHide()"
    >
      <div class="dialog-body">
        <aside class="desiderata-panel">
          <div class="desiderata-heading">Dezyderaty dla wybranego semestru</div>
          <div class="catalog-tools">
            <div class="catalog-form subject-form">
              <input pInputText [(ngModel)]="newSubjectName" placeholder="Nazwa nowego przedmiotu" />
              <input pInputText [(ngModel)]="newSubjectCode" placeholder="Kod" />
              <p-button icon="pi pi-plus" label="Przedmiot" size="small" [loading]="catalogSaving" (onClick)="addSubject()" />
            </div>
            <div class="catalog-form lecturer-form">
              <input pInputText [(ngModel)]="newLecturerName" placeholder="Imię i nazwisko wykładowcy" />
              <input pInputText [(ngModel)]="newLecturerEmail" placeholder="E-mail (opcjonalnie)" />
              <p-button icon="pi pi-user-plus" label="Wykładowca" size="small" [loading]="catalogSaving" (onClick)="addLecturer()" />
            </div>
            @if (customLecturers().length) {
              <div class="custom-lecturers">
                @for (lecturer of customLecturers(); track lecturer.id) {
                  <span class="catalog-chip">
                    {{ lecturer.displayName }}
                    @if (isAdmin) {
                      <button type="button" title="Edytuj" (click)="editLecturer(lecturer)"><i class="pi pi-pencil"></i></button>
                      <button type="button" title="Usuń" (click)="deleteLecturer(lecturer)"><i class="pi pi-trash"></i></button>
                    }
                  </span>
                }
              </div>
            }
          </div>
          @if (desiderataLoading()) {
            <div class="desiderata-state">Pobieranie dezyderatów…</div>
          } @else if (desiderataError()) {
            <div class="desiderata-state error">{{ desiderataError() }}</div>
          } @else if (desiderataMatrix().length === 0) {
            <div class="desiderata-state">Brak pasujących przedmiotów.</div>
          } @else {
            <div class="desiderata-matrix">
              @for (column of desiderataMatrix(); track column.key) {
                <section class="subject-column">
                  <div class="subject-heading" [title]="column.name">
                    <span>{{ column.name }}</span>
                    @if (column.customSubject && isAdmin) {
                      <span class="heading-actions">
                        <button type="button" title="Edytuj" (click)="editSubject(column.customSubject)"><i class="pi pi-pencil"></i></button>
                        <button type="button" title="Usuń" (click)="deleteSubject(column.customSubject)"><i class="pi pi-trash"></i></button>
                      </span>
                    }
                  </div>
                  <div class="lecturers-list">
                    @for (item of columnLecturers(column); track item.key) {
                      <div class="lecturer-card-row">
                        <button type="button" class="desideratum-card" (click)="applyColumnLecturer(column, item)">{{ item.name }}</button>
                        @if (item.persistedAssignment) {
                          <button type="button" class="remove-assignment" title="Odepnij od przedmiotu" (click)="removeSubjectLecturer(item.persistedAssignment)"><i class="pi pi-times"></i></button>
                        }
                      </div>
                    }
                    <p-select
                      [options]="availableLecturers(column)"
                      optionLabel="name"
                      placeholder="Wybierz prowadzącego"
                      appendTo="body"
                      class="lecturer-select"
                      [disabled]="availableLecturers(column).length === 0"
                      (onChange)="addSubjectLecturer(column, $event.value)"
                    />
                  </div>
                </section>
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
          <label>Daty zajęć (DD.MM)</label>
          <input pInputText [(ngModel)]="datesDraft" placeholder="np. 05.10, 19.10, 02.11" class="w-full" />
          @if (datesInvalid()) { <small class="field-error">Podaj poprawne daty DD.MM oddzielone przecinkami.</small> }
        </div>
        <label class="visibility-toggle"><input type="checkbox" [(ngModel)]="form.hiddenInPublished" /> Ukryj te zajęcia w opublikowanym planie</label>
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
        grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.85fr);
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
      .catalog-tools { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.65rem; }
      .catalog-form { display: grid; gap: 0.35rem; }
      .subject-form { grid-template-columns: minmax(150px, 1fr) 90px auto; }
      .lecturer-form { grid-template-columns: minmax(150px, 1fr) minmax(150px, 1fr) auto; }
      .catalog-form input { min-width: 0; width: 100%; font-size: 0.78rem; }
      .custom-lecturers { display: flex; gap: 0.3rem; overflow-x: auto; padding-bottom: 2px; }
      .catalog-chip { display: inline-flex; align-items: center; flex: 0 0 auto; gap: 0.2rem; padding: 0.25rem 0.4rem; font-size: 0.72rem; border-radius: 99px; color: var(--p-surface-700); background: var(--p-surface-100); }
      .catalog-chip button, .heading-actions button { padding: 0.1rem; color: inherit; border: 0; background: transparent; cursor: pointer; }
      .desiderata-matrix {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(170px, 1fr);
        gap: 0.65rem;
        min-height: 0;
        overflow-x: auto;
        padding: 2px 5px 8px 2px;
      }
      .subject-column {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        border: 1px solid var(--p-surface-200);
        border-radius: 8px;
        background: var(--p-surface-50);
        overflow: hidden;
      }
      .subject-heading {
        display: flex;
        justify-content: space-between;
        gap: 0.4rem;
        min-height: 3.2rem;
        padding: 0.65rem;
        font-size: 0.82rem;
        font-weight: 700;
        line-height: 1.25;
        color: var(--p-surface-900);
        border-bottom: 1px solid var(--p-surface-200);
        background: var(--p-surface-100);
      }
      .heading-actions { display: inline-flex; flex: 0 0 auto; gap: 0.15rem; }
      .lecturers-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        min-height: 0;
        overflow-y: auto;
        padding: 0.5rem;
      }
      .desideratum-card {
        width: 100%;
        padding: 0.6rem;
        text-align: left;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--p-surface-700);
        border: 1px solid var(--p-surface-300);
        border-radius: 7px;
        background: var(--p-surface-0, white);
        cursor: pointer;
      }
      .lecturer-card-row { display: flex; align-items: stretch; gap: 0.2rem; }
      .lecturer-card-row .desideratum-card { flex: 1; }
      .remove-assignment { flex: 0 0 24px; padding: 0; border: 1px solid var(--p-surface-300); border-radius: 5px; color: var(--p-red-600); background: var(--p-surface-0); cursor: pointer; }
      .desideratum-card:hover {
        border-color: var(--p-primary-400);
        background: var(--p-primary-50);
      }
      .lecturer-select { width: 100%; margin-top: auto; font-size: 0.78rem; }
      .desiderata-state { padding: 1rem 0.25rem; font-size: 0.82rem; color: var(--p-surface-500); }
      .desiderata-state.error { color: var(--p-red-600); }
      .field-error { color: var(--p-red-600); }
      .visibility-toggle { display: flex; align-items: center; gap: .5rem; font-size: .82rem; color: var(--p-surface-700); }
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
        .desiderata-matrix { min-height: 170px; }
        .subject-form, .lecturer-form { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class EntryDialogComponent {
  private readonly mockData = inject(MockDataService);
  private readonly messages = inject(MessageService);
  readonly saved = output<ScheduleEntry>();
  readonly deleted = output<string>();
  readonly groupsPerDay = input<Record<number, string[]>>({});
  readonly desiderata = input<DesideratumOption[]>([]);
  readonly desiderataLoading = input(false);
  readonly desiderataError = input<string | null>(null);
  protected readonly customLecturers = this.mockData.lecturers;
  protected readonly desiderataMatrix = computed<DesiderataSubjectColumn[]>(() => {
    const columns = new Map<string, DesiderataSubjectColumn>();

    for (const item of this.desiderata()) {
      const normalizedCode = item.code?.trim().toLocaleUpperCase('pl-PL');
      const key = normalizedCode || `name:${item.name.trim().toLocaleLowerCase('pl-PL')}`;
      const existing = columns.get(key);

      if (existing) {
        existing.lecturers.push(item);
      } else {
        columns.set(key, { key, code: item.code ?? '', name: item.name, lecturers: [item] });
      }
    }

    for (const subject of this.mockData.subjects()) {
      const key = subject.code.trim().toLocaleUpperCase('pl-PL');
      const existing = columns.get(key);
      if (existing) existing.customSubject = subject;
      else columns.set(key, { key, code: subject.code, name: subject.name, customSubject: subject, lecturers: [] });
    }

    return [...columns.values()];
  });
  protected readonly lecturerOptions = computed<LecturerChoice[]>(() => {
    const choices = new Map<string, LecturerChoice>();
    for (const item of this.desiderata()) {
      const key = this.lecturerKey(item.lecturerUserId, item.lecturerEmail, item.lecturerName);
      if (!choices.has(key)) choices.set(key, { key, name: item.lecturerName, email: item.lecturerEmail, userId: item.lecturerUserId, assignmentId: item.assignmentId });
    }
    for (const item of this.mockData.lecturers()) {
      const key = this.lecturerKey(undefined, item.email, item.displayName);
      if (!choices.has(key)) choices.set(key, { key, name: item.displayName, email: item.email });
    }
    return [...choices.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  });
  protected newSubjectName = '';
  protected newSubjectCode = '';
  protected newLecturerName = '';
  protected newLecturerEmail = '';
  protected catalogSaving = false;
  protected datesDraft = '';
  protected readonly isAdmin = this.currentRoles().includes('admin');

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
      this.datesDraft = (entry.dates ?? []).join(', ');
    } else {
      this.form = this.defaultForm();
      this.datesDraft = '';
    }

    this.dayOptions = this.form.studyMode === 'niestacjonarny' ? NIESTAC_DAYS : STAC_DAYS;
    this.visible = true;
  }

  protected onModeChange(): void {
    this.dayOptions = this.form.studyMode === 'niestacjonarny' ? NIESTAC_DAYS : STAC_DAYS;
    const valid = this.dayOptions.some((d) => d.value === this.form.dayOfWeek);
    if (!valid) this.form.dayOfWeek = this.dayOptions[0].value;
  }

  protected async addSubject(): Promise<void> {
    const name = this.newSubjectName.trim(); const code = this.newSubjectCode.trim().toLocaleUpperCase('pl-PL');
    if (!name || !code) { this.warn('Podaj nazwę i kod przedmiotu.'); return; }
    if (this.desiderataMatrix().some((item) => item.key === code)) { this.warn('Przedmiot o tym kodzie już istnieje.'); return; }
    await this.catalogAction(async () => {
      await this.mockData.addSubject(code, name); this.newSubjectName = ''; this.newSubjectCode = '';
      this.messages.add({ severity: 'success', summary: 'Dodano przedmiot', detail: name });
    });
  }

  protected async addLecturer(): Promise<void> {
    const name = this.newLecturerName.trim(); const email = this.newLecturerEmail.trim();
    if (!name) { this.warn('Podaj imię i nazwisko wykładowcy.'); return; }
    await this.catalogAction(async () => {
      await this.mockData.addLecturer(name, email); this.newLecturerName = ''; this.newLecturerEmail = '';
      this.messages.add({ severity: 'success', summary: 'Dodano wykładowcę', detail: name });
    });
  }

  protected async editSubject(subject: ScheduleSubject): Promise<void> {
    const name = window.prompt('Nazwa przedmiotu', subject.name)?.trim(); if (!name) return;
    const code = window.prompt('Kod przedmiotu', subject.code)?.trim(); if (!code) return;
    await this.catalogAction(async () => { await this.mockData.updateSubject(subject.id, code, name); });
  }

  protected async deleteSubject(subject: ScheduleSubject): Promise<void> {
    if (!window.confirm(`Usunąć przedmiot „${subject.name}” z katalogu tego planu?`)) return;
    await this.catalogAction(async () => { await this.mockData.deleteSubject(subject.id); });
  }

  protected async editLecturer(lecturer: ScheduleLecturer): Promise<void> {
    const name = window.prompt('Imię i nazwisko wykładowcy', lecturer.displayName)?.trim(); if (!name) return;
    const email = window.prompt('E-mail (opcjonalnie)', lecturer.email ?? '')?.trim(); if (email === undefined) return;
    await this.catalogAction(async () => { await this.mockData.updateLecturer(lecturer.id, name, email); });
  }

  protected async deleteLecturer(lecturer: ScheduleLecturer): Promise<void> {
    if (!window.confirm(`Usunąć wykładowcę „${lecturer.displayName}” z katalogu tego planu?`)) return;
    await this.catalogAction(async () => { await this.mockData.deleteLecturer(lecturer.id); });
  }

  protected columnLecturers(column: DesiderataSubjectColumn): ColumnLecturer[] {
    const items = new Map<string, ColumnLecturer>();
    for (const item of column.lecturers) {
      const key = this.lecturerKey(item.lecturerUserId, item.lecturerEmail, item.lecturerName);
      items.set(key, { key, name: item.lecturerName, email: item.lecturerEmail, userId: item.lecturerUserId, assignmentId: item.assignmentId });
    }
    for (const item of this.mockData.subjectLecturers().filter((x) => x.subjectCode.toLocaleUpperCase('pl-PL') === column.code.toLocaleUpperCase('pl-PL'))) {
      if (!items.has(item.lecturerKey)) items.set(item.lecturerKey, { key: item.lecturerKey, name: item.lecturerDisplayName, email: item.lecturerEmail, userId: item.lecturerUserId, assignmentId: item.lecturerAssignmentId, persistedAssignment: item });
    }
    return [...items.values()];
  }

  protected availableLecturers(column: DesiderataSubjectColumn): LecturerChoice[] {
    const assigned = new Set(this.columnLecturers(column).map((item) => item.key));
    return this.lecturerOptions().filter((item) => !assigned.has(item.key));
  }

  protected async addSubjectLecturer(column: DesiderataSubjectColumn, lecturer: LecturerChoice): Promise<void> {
    await this.catalogAction(async () => { await this.mockData.addSubjectLecturer(column.code, lecturer); });
  }

  protected async removeSubjectLecturer(item: ScheduleSubjectLecturer): Promise<void> {
    await this.catalogAction(async () => { await this.mockData.deleteSubjectLecturer(item.id); });
  }

  protected applyColumnLecturer(column: DesiderataSubjectColumn, lecturer: ColumnLecturer): void {
    const desideratum = column.lecturers.find((item) => this.lecturerKey(item.lecturerUserId, item.lecturerEmail, item.lecturerName) === lecturer.key);
    if (desideratum) { this.applyDesideratum(desideratum); return; }
    this.form = { ...this.form, subjectName: column.name, subjectCode: column.code, lecturerName: lecturer.name, lecturerEmail: lecturer.email ?? '', lecturerUserId: lecturer.userId ?? '', lecturerAssignmentId: lecturer.assignmentId };
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
    return !!this.form.subjectName?.trim() && !this.datesInvalid();
  }

  protected datesInvalid(): boolean { return this.parseDates().some((value) => !this.validDate(value)); }

  protected onSave(): void {
    if (!this.isValid()) return;
    this.saved.emit({
      ...(this.form as EntryForm),
      dates: this.parseDates(),
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
      dates: [],
      hiddenInPublished: false,
    };
  }

  private lecturerKey(userId: string | undefined, email: string | undefined, name: string): string {
    return (userId || email || name).trim().toLocaleLowerCase('pl-PL');
  }

  private parseDates(): string[] { return this.datesDraft.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean); }
  private validDate(value: string): boolean { const match = /^(\d{2})\.(\d{2})$/.exec(value); if (!match) return false; const day = Number(match[1]); const month = Number(match[2]); return month >= 1 && month <= 12 && day >= 1 && day <= new Date(2000, month, 0).getDate(); }

  private currentRoles(): string[] {
    try { return JSON.parse(sessionStorage.getItem('shogun_roles') ?? '[]'); } catch { return []; }
  }

  private async catalogAction(action: () => Promise<void>): Promise<void> {
    if (this.catalogSaving) return; this.catalogSaving = true;
    try { await action(); }
    catch (error: any) { this.messages.add({ severity: 'error', summary: 'Nie udało się zapisać', detail: error?.error?.detail ?? 'Spróbuj ponownie.' }); }
    finally { this.catalogSaving = false; }
  }

  private warn(detail: string): void { this.messages.add({ severity: 'warn', summary: 'Uzupełnij dane', detail }); }
}
