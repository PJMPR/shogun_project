import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Semester } from './models/schedule.models';
import { WeeklyViewComponent } from './views/weekly-view/weekly-view.component';
import { ListViewComponent } from './views/list-view/list-view.component';
import { MockDataService } from './services/mock-data.service';

@Component({
  selector: 'app-schedule',
  imports: [FormsModule, SelectButtonModule, SelectModule, InputTextModule, ButtonModule, ToastModule, WeeklyViewComponent, ListViewComponent],
  providers: [MessageService],
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <h2>Plan zajęć</h2>
        <p-select
          [options]="facultyOptions"
          [(ngModel)]="activeFacultyCode"
          optionLabel="label"
          optionValue="value"
          (ngModelChange)="changeFaculty($event)"
        />
        <p-select
          [options]="savedPlanOptions()"
          [(ngModel)]="selectedPlanId"
          optionLabel="label"
          optionValue="value"
          placeholder="Zapisane plany"
          [showClear]="true"
          emptyMessage="Brak zapisanych planów"
          (ngModelChange)="selectSavedPlan($event)"
        />
        <p-selectbutton
          [options]="semesterOptions"
          [(ngModel)]="activeSemester"
          optionLabel="label"
          optionValue="value"
        />
        <div class="year-controls">
          <input
            pInputText
            [(ngModel)]="academicYearInput"
            placeholder="Rok akademicki"
            maxlength="9"
            aria-label="Rok akademicki"
            (blur)="applyAcademicYear()"
            (keydown.enter)="applyAcademicYear()"
          />
        </div>
        <p-selectbutton
          [options]="viewOptions"
          [(ngModel)]="activeView"
          optionLabel="label"
          optionValue="value"
        />
        <div class="save-actions">
          @if (scheduleStore.dirty()) {
            <span class="dirty-label">Niezapisane zmiany</span>
          }
          <p-button
            label="Odśwież plan"
            icon="pi pi-refresh"
            severity="secondary"
            [outlined]="true"
            [disabled]="!scheduleStore.current() || scheduleStore.loading()"
            (onClick)="reloadPlan()"
          />
          <p-button
            label="Zapisz plan"
            icon="pi pi-save"
            [loading]="scheduleStore.saving()"
            [disabled]="!scheduleStore.current() || !scheduleStore.dirty() || scheduleStore.stale()"
            (onClick)="savePlan()"
          />
          @if (scheduleStore.current(); as plan) {
            <p-button
              [label]="plan.status === 'published' ? 'Wycofaj publikację' : 'Opublikuj plan'"
              [icon]="plan.status === 'published' ? 'pi pi-eye-slash' : 'pi pi-send'"
              [severity]="plan.status === 'published' ? 'secondary' : 'success'"
              [outlined]="plan.status === 'published'"
              [loading]="scheduleStore.saving()"
              (onClick)="togglePublication()"
            />
          }
        </div>
      </div>

      <div class="page-content">
        @if (scheduleStore.error()) {
          <details class="diagnostic-error" open>
            <summary>Błąd operacji — szczegóły diagnostyczne</summary>
            <pre>{{ scheduleStore.error() }}</pre>
          </details>
        }
        @if (activeView === 'weekly') {
          <app-weekly-view
            [semesterType]="activeSemester"
            [academicYear]="activeAcademicYear"
            [facultyCode]="activeFacultyCode"
            [selectedPlan]="selectedPlan()"
            (planCreated)="selectCreatedPlan($event)"
          />
        } @else {
          <app-list-view [semesterType]="activeSemester" />
        }
      </div>
    </div>

    <p-toast position="bottom-right" />
  `,
  styleUrl: './schedule.component.css',
})
export class ScheduleComponent implements OnInit {
  private static readonly FIRST_ACADEMIC_YEAR = 2026;
  protected readonly scheduleStore = inject(MockDataService);
  private readonly messages = inject(MessageService);
  protected activeView: 'weekly' | 'list' = 'weekly';
  protected activeSemester: Semester = 'zimowy';
  protected activeAcademicYear = this.defaultAcademicYear();
  protected academicYearInput = this.activeAcademicYear;
  protected activeFacultyCode = 'WI';
  protected selectedPlanId: string | null = null;
  protected readonly facultyOptions = [
    { label: 'Informatyka', value: 'WI' },
    { label: 'Sztuka Nowych Mediów', value: 'SNM' },
  ];
  protected readonly academicYearOptions = computed(() => {
    const years = [...new Set(this.scheduleStore.plans()
      .map((plan) => plan.academicYear)
      .filter((year) => Number(year.slice(0, 4)) >= ScheduleComponent.FIRST_ACADEMIC_YEAR))]
      .sort()
      .reverse();
    return years.includes(this.activeAcademicYear) ? years : [this.activeAcademicYear, ...years];
  });
  protected readonly savedPlanOptions = computed(() => this.scheduleStore.plans().map((plan) => ({
    label: `${plan.status === 'published' ? '● Opublikowany · ' : ''}${plan.academicYear} · semestr ${plan.semesterNumber} · ${plan.studyMode === 'stationary' ? 'stacjonarne' : 'niestacjonarne'}`,
    value: plan.id,
  })));
  protected readonly selectedPlan = computed(() => this.scheduleStore.plans().find((plan) => plan.id === this.selectedPlanId) ?? null);

  async ngOnInit(): Promise<void> {
    try {
      await this.scheduleStore.loadPlans(this.activeFacultyCode);
      this.activeAcademicYear = this.academicYearOptions()[0] ?? this.activeAcademicYear;
      this.academicYearInput = this.activeAcademicYear;
      this.selectedPlanId = this.scheduleStore.current()?.id ?? null;
    } catch { this.messages.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się pobrać listy planów.' }); }
  }

  protected applyAcademicYear(): void {
    const match = /^(\d{4})\/(\d{4})$/.exec(this.academicYearInput.trim());
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      this.messages.add({ severity: 'warn', summary: 'Nieprawidłowy rocznik', detail: 'Wpisz rok w formacie 2026/2027.' });
      return;
    }
    this.activeAcademicYear = `${match[1]}/${match[2]}`;
    this.academicYearInput = this.activeAcademicYear;
    this.selectedPlanId = null;
  }

  protected async changeFaculty(facultyCode: string): Promise<void> {
    this.activeFacultyCode = facultyCode;
    this.selectedPlanId = null;
    try {
      await this.scheduleStore.loadPlans(facultyCode);
      this.activeAcademicYear = this.academicYearOptions()[0] ?? this.defaultAcademicYear();
      this.academicYearInput = this.activeAcademicYear;
    } catch {
      this.messages.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się pobrać planów wydziału.' });
    }
  }

  protected async selectSavedPlan(planId: string | null): Promise<void> {
    this.selectedPlanId = planId;
    if (!planId) return;
    const plan = this.scheduleStore.plans().find((item) => item.id === planId);
    if (!plan) return;
    this.activeAcademicYear = plan.academicYear;
    this.academicYearInput = plan.academicYear;
    this.activeSemester = plan.semesterNumber % 2 === 1 ? 'zimowy' : 'letni';
    await this.scheduleStore.reload(planId);
  }

  protected selectCreatedPlan(planId: string): void {
    this.selectedPlanId = planId;
  }

  protected async savePlan(): Promise<void> {
    try {
      await this.scheduleStore.save();
      this.messages.add({ severity: 'success', summary: 'Plan zapisany', detail: 'Wszystkie zmiany zostały zapisane.' });
    } catch {
      const detail = this.scheduleStore.error() ?? 'Nie udało się zapisać planu.';
      this.messages.add({ severity: 'error', summary: 'Błąd zapisu', detail });
    }
  }

  protected async reloadPlan(): Promise<void> {
    await this.scheduleStore.reload();
    if (this.scheduleStore.error()) {
      this.messages.add({ severity: 'error', summary: 'Błąd', detail: this.scheduleStore.error()! });
      return;
    }
    this.messages.add({ severity: 'info', summary: 'Plan odświeżony', detail: 'Pobrano aktualną wersję planu.' });
  }

  protected async togglePublication(): Promise<void> {
    const plan = this.scheduleStore.current();
    if (!plan) return;
    const publishing = plan.status !== 'published';
    this.scheduleStore.setPublished(publishing);
    try {
      await this.scheduleStore.save();
      this.messages.add({
        severity: publishing ? 'success' : 'info',
        summary: publishing ? 'Plan opublikowany' : 'Publikacja wycofana',
        detail: publishing ? 'To jest teraz aktualny plan wydziału dostępny do komentowania.' : 'Plan nie jest już dostępny do komentowania.',
      });
    } catch {
      this.scheduleStore.setPublished(!publishing);
      this.messages.add({ severity: 'error', summary: 'Nie udało się zmienić publikacji', detail: this.scheduleStore.error() ?? undefined });
    }
  }

  private defaultAcademicYear(): string {
    const start = ScheduleComponent.FIRST_ACADEMIC_YEAR;
    return `${start}/${start + 1}`;
  }

  protected readonly semesterOptions = [
    { label: 'Semestr zimowy', value: 'zimowy' as Semester },
    { label: 'Semestr letni', value: 'letni' as Semester },
  ];

  protected readonly viewOptions = [
    { label: 'Widok tygodniowy', value: 'weekly', icon: 'pi pi-calendar' },
    { label: 'Lista', value: 'list', icon: 'pi pi-list' },
  ];
}
