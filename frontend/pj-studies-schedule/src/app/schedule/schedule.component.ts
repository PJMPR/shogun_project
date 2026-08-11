import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Semester } from './models/schedule.models';
import { WeeklyViewComponent } from './views/weekly-view/weekly-view.component';
import { ListViewComponent } from './views/list-view/list-view.component';
import { MockDataService } from './services/mock-data.service';

@Component({
  selector: 'app-schedule',
  imports: [FormsModule, SelectButtonModule, SelectModule, ButtonModule, ToastModule, WeeklyViewComponent, ListViewComponent],
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
        <div class="save-actions">
          @if (scheduleStore.hasDirtyPlans()) {
            <span class="dirty-label">Niezapisane plany: {{ scheduleStore.dirtyPlanCount() }}</span>
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
            label="Zapisz wszystkie plany"
            icon="pi pi-save"
            [loading]="scheduleStore.saving()"
            [disabled]="!scheduleStore.hasDirtyPlans()"
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
            [academicYear]="internalAcademicYear"
            [facultyCode]="activeFacultyCode"
            [selectedPlan]="selectedPlan()"
            (planCreated)="selectCreatedPlan($event)"
            (planSelected)="selectPlanFromFilters($event)"
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
  protected internalAcademicYear = this.defaultAcademicYear();
  protected activeFacultyCode = 'WI';
  protected selectedPlanId: string | null = null;
  protected readonly facultyOptions = [
    { label: 'Informatyka', value: 'WI' },
    { label: 'Sztuka Nowych Mediów', value: 'SNM' },
  ];
  protected readonly selectedPlan = computed(() => this.scheduleStore.plans().find((plan) => plan.id === this.selectedPlanId) ?? null);

  async ngOnInit(): Promise<void> {
    try {
      await this.scheduleStore.loadPlans(this.activeFacultyCode);
      await this.selectPlanFor(1, 'stacjonarny');
    } catch { this.messages.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się pobrać listy planów.' }); }
  }

  protected async changeFaculty(facultyCode: string): Promise<void> {
    this.activeFacultyCode = facultyCode;
    this.selectedPlanId = null;
    try {
      await this.scheduleStore.loadPlans(facultyCode);
      await this.selectPlanFor(1, 'stacjonarny');
    } catch {
      this.messages.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się pobrać planów wydziału.' });
    }
  }

  protected selectCreatedPlan(planId: string): void {
    this.selectedPlanId = planId;
  }

  protected selectPlanFromFilters(planId: string | null): void {
    this.selectedPlanId = planId;
    const plan = this.scheduleStore.plans().find((item) => item.id === planId);
    if (plan) this.internalAcademicYear = plan.academicYear;
  }

  private async selectPlanFor(semesterNumber: number, mode: 'stacjonarny' | 'niestacjonarny'): Promise<void> {
    await this.scheduleStore.loadFor(semesterNumber, mode);
    this.selectedPlanId = this.scheduleStore.current()?.id ?? null;
  }

  protected async savePlan(): Promise<void> {
    try {
      const count = await this.scheduleStore.saveAll();
      this.messages.add({ severity: 'success', summary: 'Plany zapisane', detail: `Zapisano zmienione plany: ${count}.` });
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
      await this.scheduleStore.saveCurrent();
      this.messages.add({
        severity: publishing ? 'success' : 'info',
        summary: publishing ? 'Plan opublikowany' : 'Publikacja wycofana',
        detail: publishing ? 'Plan jest teraz widoczny dla wykładowców.' : 'Plan pozostaje dostępny dla planistów jako wersja robocza.',
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
