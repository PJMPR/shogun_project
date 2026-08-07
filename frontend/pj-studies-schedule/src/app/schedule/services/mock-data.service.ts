import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScheduleEntry, ScheduleGroup, SchedulePlan, SchedulePlanSummary, StudyMode } from '../models/schedule.models';

interface ApiEntry {
  id: string; subjectSource?: string; subjectExternalId?: string; subjectCode?: string; subjectName: string;
  classType: ScheduleEntry['classType']; lecturerEmail: string; lecturerDisplayName: string; room?: string;
  dayOfWeek: number; startMinute: number; durationMinutes: number; color?: string; groupIds: string[];
  concurrencyToken: string; commentCount: number;
}
interface ApiPlan extends Omit<SchedulePlan, 'entries'> { entries: ApiEntry[] }

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.scheduleApiBaseUrl}/api/v1/schedules`;

  readonly entries = signal<ScheduleEntry[]>([]);
  readonly conflictContextEntries = signal<ScheduleEntry[]>([]);
  readonly groups = signal<ScheduleGroup[]>([]);
  readonly plans = signal<SchedulePlanSummary[]>([]);
  readonly current = signal<SchedulePlanSummary | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly stale = signal(false);
  readonly error = signal<string | null>(null);

  async loadPlans(facultyCode = 'WI'): Promise<void> {
    this.plans.set(await firstValueFrom(this.http.get<SchedulePlanSummary[]>(`${this.base}?facultyCode=${encodeURIComponent(facultyCode)}`)));
    this.error.set(null);
  }

  async loadFor(academicYear: string, semesterNumber: number, mode: StudyMode): Promise<void> {
    const apiMode = mode === 'stacjonarny' ? 'stationary' : 'partTime';
    const summary = this.plans().find((x) => x.academicYear === academicYear && x.semesterNumber === semesterNumber && x.studyMode === apiMode);
    if (!summary) { this.current.set(null); this.entries.set([]); this.groups.set([]); this.conflictContextEntries.set([]); this.dirty.set(false); this.stale.set(false); this.error.set(null); return; }
    await this.reload(summary.id);
  }

  async reload(id = this.current()?.id): Promise<void> {
    if (!id) return;
    this.loading.set(true); this.error.set(null);
    try {
      const plan = await firstValueFrom(this.http.get<ApiPlan>(`${this.base}/${id}`));
      this.applyPlan(plan); this.dirty.set(false); this.stale.set(false);
      await this.loadConflictContext(plan);
    } catch { this.error.set('Nie udało się pobrać planu.'); }
    finally { this.loading.set(false); }
  }

  async createPlan(facultyCode: string, academicYear: string, semesterNumber: number, mode: StudyMode): Promise<void> {
    const created = await firstValueFrom(this.http.post<ApiPlan>(this.base, {
      facultyCode, academicYear, semesterNumber,
      studyMode: mode === 'stacjonarny' ? 'stationary' : 'partTime',
      name: `Plan ${academicYear} · semestr ${semesterNumber}`,
    }));
    await this.loadPlans(facultyCode); this.applyPlan(created); await this.loadConflictContext(created); this.dirty.set(false); this.stale.set(false); this.error.set(null);
  }

  async deleteCurrent(): Promise<void> {
    const plan = this.current(); if (!plan) return;
    await firstValueFrom(this.http.delete(`${this.base}/${plan.id}`, { body: { concurrencyToken: plan.concurrencyToken } }));
    this.current.set(null); this.entries.set([]); this.groups.set([]); this.conflictContextEntries.set([]); this.dirty.set(false); this.stale.set(false); await this.loadPlans(plan.facultyCode);
  }

  async save(): Promise<void> {
    const plan = this.current(); if (!plan || !this.dirty() || this.stale()) return;
    this.saving.set(true); this.error.set(null);
    try {
      const groups = this.groups();
      const saved = await firstValueFrom(this.http.put<ApiPlan>(`${this.base}/${plan.id}/save`, {
        concurrencyToken: plan.concurrencyToken, name: plan.name, status: plan.status,
        groups: groups.map((g, i) => ({ id: g.id, code: g.code, name: g.name, sortOrder: i })),
        entries: this.entries().map((e) => ({
          id: e.id, subjectSource: e.lecturerAssignmentId !== undefined ? 'assignments' : undefined,
          subjectExternalId: e.lecturerAssignmentId !== undefined ? String(e.lecturerAssignmentId) : undefined,
          subjectCode: e.subjectCode, subjectName: e.subjectName,
          classType: e.classType ?? 'other', lecturerEmail: e.lecturerEmail,
          lecturerDisplayName: e.lecturerName, room: e.room || null, dayOfWeek: e.dayOfWeek,
          startMinute: Math.round(e.startHour * 60), durationMinutes: Math.round(e.durationHours * 60),
          color: e.color, groupIds: this.groupIdsForEntry(e, groups),
        })),
      }));
      this.applyPlan(saved); this.dirty.set(false); await this.loadPlans(plan.facultyCode); await this.loadConflictContext(saved);
    } catch (error) {
      const detail = error instanceof HttpErrorResponse && typeof error.error?.detail === 'string' ? error.error.detail : null;
      const exceptionType = error instanceof HttpErrorResponse && typeof error.error?.exceptionType === 'string' ? error.error.exceptionType : null;
      const stackTrace = error instanceof HttpErrorResponse && typeof error.error?.stackTrace === 'string' ? error.error.stackTrace : null;
      const isStale = error instanceof HttpErrorResponse && error.status === 409 && detail?.includes('zmieniony przez innego użytkownika');
      this.stale.set(Boolean(isStale));
      this.error.set([
        detail ?? 'Nie udało się zapisać planu.',
        exceptionType ? `Typ: ${exceptionType}` : null,
        stackTrace ? `Stack trace:\n${stackTrace}` : null,
      ].filter(Boolean).join('\n\n'));
      throw error;
    } finally { this.saving.set(false); }
  }

  addEntry(entry: ScheduleEntry): void { this.entries.update((list) => [...list, entry]); this.markDirty(); }
  updateEntry(updated: ScheduleEntry): void { this.entries.update((list) => list.map((e) => e.id === updated.id ? updated : e)); this.markDirty(); }
  removeEntry(id: string): void { this.entries.update((list) => list.filter((e) => e.id !== id)); this.markDirty(); }
  setGroups(groups: ScheduleGroup[]): void { this.groups.set(groups.map((g, i) => ({ ...g, sortOrder: i }))); this.markDirty(); }

  private markDirty(): void { if (this.current()) this.dirty.set(true); }
  private applyPlan(plan: ApiPlan): void {
    const groups = [...plan.groups].sort((a, b) => a.sortOrder - b.sortOrder);
    this.groups.set(groups);
    this.entries.set(this.mapEntries(plan, groups));
    const { entries: _entries, groups: _groups, ...summary } = plan;
    this.current.set(summary);
  }
  private mapEntries(plan: ApiPlan, groups = [...plan.groups].sort((a, b) => a.sortOrder - b.sortOrder)): ScheduleEntry[] {
    return plan.entries.map((e) => {
      const indices = e.groupIds.map((id) => groups.findIndex((g) => g.id === id)).filter((i) => i >= 0).sort((a, b) => a - b);
      const assignmentId = e.subjectSource === 'assignments' && e.subjectExternalId !== undefined
        ? Number(e.subjectExternalId)
        : undefined;
      return { id: e.id, subjectName: e.subjectName, subjectCode: e.subjectCode,
        lecturerAssignmentId: Number.isFinite(assignmentId) ? assignmentId : undefined,
        lecturerName: e.lecturerDisplayName,
        lecturerEmail: e.lecturerEmail, classType: e.classType, room: e.room ?? '', dayOfWeek: e.dayOfWeek,
        group: indices[0] ?? 0, groupSpan: Math.max(1, indices.length), color: e.color,
        startHour: e.startMinute / 60, durationHours: e.durationMinutes / 60,
        semesterNumber: plan.semesterNumber, academicYear: plan.academicYear,
        studyMode: plan.studyMode === 'stationary' ? 'stacjonarny' : 'niestacjonarny',
        groupIds: e.groupIds, concurrencyToken: e.concurrencyToken, commentCount: e.commentCount };
    });
  }
  private async loadConflictContext(plan: ApiPlan): Promise<void> {
    const relatedPlans = this.plans().filter((item) =>
      item.academicYear === plan.academicYear &&
      item.semesterNumber % 2 === plan.semesterNumber % 2,
    );
    const aggregates = await Promise.all(relatedPlans.map((item) =>
      item.id === plan.id ? Promise.resolve(plan) : firstValueFrom(this.http.get<ApiPlan>(`${this.base}/${item.id}`)),
    ));
    this.conflictContextEntries.set(aggregates.flatMap((item) => this.mapEntries(item)));
  }
  private groupIdsForEntry(entry: ScheduleEntry, groups: ScheduleGroup[]): string[] {
    return groups.slice(entry.group, entry.group + (entry.groupSpan ?? 1)).map((g) => g.id);
  }
}
