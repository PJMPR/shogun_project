import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScheduleEntry, ScheduleGroup, SchedulePlan, SchedulePlanSummary, StudyMode } from '../models/schedule.models';

interface ApiEntry {
  id: string; subjectSource?: string; subjectExternalId?: string; subjectCode?: string; subjectName: string;
  classType: ScheduleEntry['classType']; lecturerUserId?: string; lecturerEmail?: string; lecturerDisplayName: string; room?: string;
  dayOfWeek: number; startMinute: number; durationMinutes: number; color?: string; groupIds: string[];
  concurrencyToken: string; commentCount: number;
}
interface ApiPlan extends Omit<SchedulePlan, 'entries'> { entries: ApiEntry[] }
interface PlanWorkingCopy {
  summary: SchedulePlanSummary;
  entries: ScheduleEntry[];
  groups: ScheduleGroup[];
  conflictContextEntries: ScheduleEntry[];
  dirty: boolean;
  stale: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.scheduleApiBaseUrl}/api/v1/schedules`;
  private readonly workingCopies = new Map<string, PlanWorkingCopy>();
  private readonly workingCopyRevision = signal(0);

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
  readonly dirtyPlanCount = computed(() => {
    this.workingCopyRevision();
    const ids = new Set([...this.workingCopies.entries()].filter(([, copy]) => copy.dirty).map(([id]) => id));
    if (this.dirty() && this.current()) ids.add(this.current()!.id);
    return ids.size;
  });
  readonly hasDirtyPlans = computed(() => this.dirtyPlanCount() > 0);

  async loadPlans(facultyCode = 'WI'): Promise<void> {
    this.rememberWorkingCopy();
    const summaries = await firstValueFrom(this.http.get<SchedulePlanSummary[]>(`${this.base}?facultyCode=${encodeURIComponent(facultyCode)}`));
    this.plans.set(summaries);
    await Promise.all(summaries.map(async (summary) => {
      const existing = this.workingCopies.get(summary.id);
      if (existing?.dirty || existing?.stale) return;
      const plan = await firstValueFrom(this.http.get<ApiPlan>(`${this.base}/${summary.id}`));
      this.workingCopies.set(summary.id, this.workingCopyFromApi(plan));
    }));
    this.bumpWorkingCopies();
    this.error.set(null);
  }

  async loadFor(semesterNumber: number, mode: StudyMode): Promise<void> {
    this.rememberWorkingCopy();
    const apiMode = mode === 'stacjonarny' ? 'stationary' : 'partTime';
    const matching = this.plans().filter((x) => x.semesterNumber === semesterNumber && x.studyMode === apiMode);
    const summary = matching.find((x) => x.status === 'published') ?? matching[0];
    if (!summary) { this.clearActivePlan(); return; }
    const workingCopy = this.workingCopies.get(summary.id);
    if (workingCopy) { this.restoreWorkingCopy(workingCopy); return; }
    await this.reload(summary.id);
  }

  async reload(id = this.current()?.id): Promise<void> {
    if (!id) return;
    this.workingCopies.delete(id);
    this.loading.set(true); this.error.set(null);
    try {
      const plan = await firstValueFrom(this.http.get<ApiPlan>(`${this.base}/${id}`));
      this.applyPlan(plan); this.workingCopies.set(id, this.workingCopyFromApi(plan)); this.bumpWorkingCopies(); this.dirty.set(false); this.stale.set(false);
      await this.loadConflictContext(plan);
    } catch { this.error.set('Nie udało się pobrać planu.'); }
    finally { this.loading.set(false); }
  }

  async createPlan(facultyCode: string, academicYear: string, semesterNumber: number, mode: StudyMode): Promise<void> {
    const created = await firstValueFrom(this.http.post<ApiPlan>(this.base, {
      facultyCode, academicYear, semesterNumber,
      studyMode: mode === 'stacjonarny' ? 'stationary' : 'partTime',
      name: `Semestr ${semesterNumber} · ${mode === 'stacjonarny' ? 'stacjonarne' : 'niestacjonarne'}`,
    }));
    await this.loadPlans(facultyCode); this.applyPlan(created); await this.loadConflictContext(created); this.dirty.set(false); this.stale.set(false); this.error.set(null);
  }

  async deleteCurrent(): Promise<void> {
    const plan = this.current(); if (!plan) return;
    await firstValueFrom(this.http.delete(`${this.base}/${plan.id}`, { body: { concurrencyToken: plan.concurrencyToken } }));
    this.workingCopies.delete(plan.id); this.bumpWorkingCopies(); this.clearActivePlan(); await this.loadPlans(plan.facultyCode);
  }

  async saveAll(): Promise<number> {
    if (this.saving()) return 0;
    this.rememberWorkingCopy();
    const dirtyCopies = [...this.workingCopies.values()].filter((copy) => copy.dirty);
    if (dirtyCopies.length === 0) return 0;
    this.saving.set(true); this.error.set(null);
    let savedCount = 0;
    try {
      for (const copy of dirtyCopies) { await this.saveWorkingCopy(copy); savedCount++; }
      await this.loadPlans(this.current()?.facultyCode ?? dirtyCopies[0].summary.facultyCode);
      return savedCount;
    } catch (error) { this.handleSaveError(error); throw error; }
    finally { this.saving.set(false); }
  }

  async saveCurrent(): Promise<void> {
    const plan = this.current(); if (!plan || !this.dirty() || this.saving()) return;
    this.rememberWorkingCopy();
    const copy = this.workingCopies.get(plan.id); if (!copy) return;
    this.saving.set(true); this.error.set(null);
    try { await this.saveWorkingCopy(copy); await this.loadPlans(plan.facultyCode); }
    catch (error) { this.handleSaveError(error); throw error; }
    finally { this.saving.set(false); }
  }

  addEntry(entry: ScheduleEntry): void { this.entries.update((list) => [...list, entry]); this.markDirty(); }
  setPublished(published: boolean): void {
    this.current.update((plan) => plan ? { ...plan, status: published ? 'published' : 'draft' } : plan);
    this.markDirty();
  }
  updateEntry(updated: ScheduleEntry): void { this.entries.update((list) => list.map((e) => e.id === updated.id ? updated : e)); this.markDirty(); }
  removeEntry(id: string): void { this.entries.update((list) => list.filter((e) => e.id !== id)); this.markDirty(); }
  setGroups(groups: ScheduleGroup[]): void { this.groups.set(groups.map((g, i) => ({ ...g, sortOrder: i }))); this.markDirty(); }

  private markDirty(): void { if (this.current()) this.dirty.set(true); }
  private bumpWorkingCopies(): void { this.workingCopyRevision.update((value) => value + 1); }
  private rememberWorkingCopy(): void {
    const summary = this.current();
    if (!summary || (!this.dirty() && !this.stale())) return;
    this.workingCopies.set(summary.id, {
      summary: { ...summary }, entries: this.entries().map((entry) => ({ ...entry })),
      groups: this.groups().map((group) => ({ ...group })),
      conflictContextEntries: this.conflictContextEntries().map((entry) => ({ ...entry })),
      dirty: this.dirty(), stale: this.stale(), error: this.error(),
    });
    this.bumpWorkingCopies();
  }
  private restoreWorkingCopy(copy: PlanWorkingCopy): void {
    this.current.set({ ...copy.summary });
    this.entries.set(copy.entries.map((entry) => ({ ...entry })));
    this.groups.set(copy.groups.map((group) => ({ ...group })));
    const relatedEntries = [...this.workingCopies.values()]
      .filter((item) => item.summary.academicYear === copy.summary.academicYear && item.summary.semesterNumber % 2 === copy.summary.semesterNumber % 2)
      .flatMap((item) => item.entries.map((entry) => ({ ...entry })));
    this.conflictContextEntries.set(copy.conflictContextEntries.length ? copy.conflictContextEntries.map((entry) => ({ ...entry })) : relatedEntries);
    this.dirty.set(copy.dirty); this.stale.set(copy.stale); this.error.set(copy.error);
  }
  private clearActivePlan(): void {
    this.current.set(null); this.entries.set([]); this.groups.set([]); this.conflictContextEntries.set([]);
    this.dirty.set(false); this.stale.set(false); this.error.set(null);
  }
  private workingCopyFromApi(plan: ApiPlan): PlanWorkingCopy {
    const groups = [...plan.groups].sort((a, b) => a.sortOrder - b.sortOrder);
    const { entries: _entries, groups: _groups, ...summary } = plan;
    return { summary, entries: this.mapEntries(plan, groups), groups, conflictContextEntries: [], dirty: false, stale: false, error: null };
  }
  private async saveWorkingCopy(copy: PlanWorkingCopy): Promise<void> {
    if (copy.stale) throw new Error(`Plan ${copy.summary.semesterNumber} wymaga odświeżenia.`);
    const saved = await firstValueFrom(this.http.put<ApiPlan>(`${this.base}/${copy.summary.id}/save`, this.savePayload(copy)));
    const cleanCopy = this.workingCopyFromApi(saved);
    this.workingCopies.set(saved.id, cleanCopy);
    this.plans.update((plans) => plans.map((plan) => plan.id === saved.id ? cleanCopy.summary : plan));
    if (this.current()?.id === saved.id) {
      this.applyPlan(saved); this.dirty.set(false); this.stale.set(false); this.error.set(null);
      await this.loadConflictContext(saved);
    }
    this.bumpWorkingCopies();
  }
  private savePayload(copy: PlanWorkingCopy): object {
    const groups = copy.groups;
    return {
      concurrencyToken: copy.summary.concurrencyToken, name: copy.summary.name, status: copy.summary.status,
      groups: groups.map((group, index) => ({ id: group.id, code: group.code, name: group.name, sortOrder: index })),
      entries: copy.entries.map((entry) => ({
        id: entry.id, subjectSource: entry.lecturerAssignmentId !== undefined ? 'assignments' : undefined,
        subjectExternalId: entry.lecturerAssignmentId !== undefined ? String(entry.lecturerAssignmentId) : undefined,
        subjectCode: entry.subjectCode, subjectName: entry.subjectName, classType: entry.classType ?? 'other',
        lecturerUserId: entry.lecturerUserId, lecturerEmail: entry.lecturerEmail, lecturerDisplayName: entry.lecturerName,
        room: entry.room || null, dayOfWeek: entry.dayOfWeek, startMinute: Math.round(entry.startHour * 60),
        durationMinutes: Math.round(entry.durationHours * 60), color: entry.color,
        groupIds: this.groupIdsForEntry(entry, groups),
      })),
    };
  }
  private handleSaveError(error: unknown): void {
    const detail = error instanceof HttpErrorResponse && typeof error.error?.detail === 'string' ? error.error.detail : null;
    const isStale = error instanceof HttpErrorResponse && error.status === 409;
    this.stale.set(Boolean(isStale));
    this.error.set(isStale ? 'Co najmniej jeden plan został zmieniony przez innego użytkownika.' : detail ?? 'Nie udało się zapisać wszystkich planów.');
  }
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
        lecturerUserId: e.lecturerUserId ?? '', lecturerEmail: e.lecturerEmail, classType: e.classType, room: e.room ?? '', dayOfWeek: e.dayOfWeek,
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
