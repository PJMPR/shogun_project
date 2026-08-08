import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type StudyMode = 'stationary' | 'partTime';
type Scope = 'all' | 'mine';
type View = 'weekly' | 'list';
type AuthorRole = 'admin' | 'planner' | 'lecturer';

interface PlanSummary { id: string; facultyCode: string; facultyName: string; academicYear: string; semesterNumber: number; studyMode: StudyMode; status: 'draft' | 'published' }
interface Group { id: string; code: string; name: string; sortOrder: number }
interface Entry { id: string; subjectName: string; subjectCode?: string; lecturerDisplayName: string; lecturerEmail: string; classType: string; room?: string; dayOfWeek: number; startMinute: number; durationMinutes: number; color?: string; groupIds: string[]; commentCount: number }
interface Plan extends PlanSummary { groups: Group[]; entries: Entry[] }
interface ApiComment { id: string; scheduleEntryId: string; body: string; authorEmail: string; authorDisplayName: string; authorRole: AuthorRole; createdAt: string; updatedAt?: string; canEdit: boolean; canDelete: boolean }

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const START_MINUTE = 8 * 60;
const END_MINUTE = 20 * 60;
const COMPACT_LABEL_COLUMN_WIDTH_PX = 112;

@Component({
  selector: 'app-schedule-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-viewer.component.html',
  styleUrl: './schedule-viewer.component.css',
})
export class ScheduleViewerComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.scheduleApiBaseUrl}/api/v1`;
  protected readonly days = DAYS;
  protected readonly plans = signal<PlanSummary[]>([]);
  protected readonly plan = signal<Plan | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly comments = signal<ApiComment[]>([]);
  protected readonly commentsEntry = signal<Entry | null>(null);
  protected readonly commentDraft = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  private readonly calendarWidthPx = signal(0);
  private calendarResizeObserver?: ResizeObserver;
  protected facultyCode = 'WI';
  protected academicYear = '';
  protected semesterNumber = 1;
  protected studyMode: StudyMode = 'stationary';
  protected scope: Scope = 'all';
  protected view: View = 'weekly';
  protected readonly currentEmail = this.readProfile().email.trim().toLowerCase();
  protected readonly facultyOptions = [{ label: 'Informatyka', value: 'WI' }, { label: 'Sztuka Nowych Mediów', value: 'SNM' }];
  protected readonly modeOptions = [{ label: 'Stacjonarne', value: 'stationary' as StudyMode }, { label: 'Niestacjonarne', value: 'partTime' as StudyMode }];
  protected readonly semesterOptions = Array.from({ length: 8 }, (_, index) => ({ label: `Semestr ${index + 1}`, value: index + 1 }));
  protected readonly yearOptions = computed(() => [...new Set(this.plans().filter(p => p.facultyCode === this.facultyCode && p.status === 'published').map(p => p.academicYear))].sort().reverse());
  protected readonly visibleEntries = computed(() => {
    const entries = this.plan()?.entries ?? [];
    return this.scope === 'mine' ? entries.filter(entry => entry.lecturerEmail.trim().toLowerCase() === this.currentEmail) : entries;
  });
  protected readonly visibleDays = computed(() => this.studyMode === 'stationary' ? [0, 1, 2, 3, 4] : [4, 5, 6]);
  protected readonly hours = Array.from({ length: 13 }, (_, index) => index + 8);

  async ngOnInit(): Promise<void> { await this.loadPlans(); }
  ngOnDestroy(): void { this.calendarResizeObserver?.disconnect(); }

  @ViewChild('calendar')
  set calendarElement(element: ElementRef<HTMLElement> | undefined) {
    this.calendarResizeObserver?.disconnect();
    if (!element) { this.calendarWidthPx.set(0); return; }
    this.calendarResizeObserver = new ResizeObserver(([entry]) => this.calendarWidthPx.set(entry.contentRect.width));
    this.calendarResizeObserver.observe(element.nativeElement);
  }

  protected async changeFaculty(): Promise<void> { await this.loadPlans(); }
  protected async selectionChanged(): Promise<void> { await this.loadSelectedPlan(); }

  private async loadPlans(): Promise<void> {
    this.loading.set(true); this.error.set(null); this.plan.set(null);
    try {
      const items = await firstValueFrom(this.http.get<PlanSummary[]>(`${this.base}/schedules/published?facultyCode=${encodeURIComponent(this.facultyCode)}`));
      this.plans.set(items);
      const years = [...new Set(items.filter(p => p.status === 'published').map(p => p.academicYear))].sort().reverse();
      if (!years.includes(this.academicYear)) this.academicYear = years[0] ?? '';
      await this.loadSelectedPlan();
    } catch (error) { this.error.set(this.errorMessage(error, 'Nie udało się pobrać planów zajęć.')); }
    finally { this.loading.set(false); }
  }

  private async loadSelectedPlan(): Promise<void> {
    this.commentsEntry.set(null);
    if (!this.academicYear) { this.plan.set(null); return; }
    const match = this.plans().find(item => item.status === 'published' && item.facultyCode === this.facultyCode && item.academicYear === this.academicYear && item.semesterNumber === Number(this.semesterNumber) && item.studyMode === this.studyMode);
    if (!match) { this.plan.set(null); return; }
    this.loading.set(true); this.error.set(null);
    try { this.plan.set(await firstValueFrom(this.http.get<Plan>(`${this.base}/schedules/published/${match.id}`))); }
    catch (error) { this.plan.set(null); this.error.set(this.errorMessage(error, 'Nie udało się pobrać opublikowanego planu.')); }
    finally { this.loading.set(false); }
  }

  protected entriesForDay(day: number): Entry[] { return this.visibleEntries().filter(entry => entry.dayOfWeek === day); }
  protected groupNames(entry: Entry): string { const groups = this.plan()?.groups ?? []; return entry.groupIds.map(id => groups.find(group => group.id === id)?.code).filter(Boolean).join(', '); }
  protected time(entry: Entry): string { return `${this.formatMinute(entry.startMinute)}–${this.formatMinute(entry.startMinute + entry.durationMinutes)}`; }
  protected top(entry: Entry): number { return ((entry.startMinute - START_MINUTE) / (END_MINUTE - START_MINUTE)) * 100; }
  protected height(entry: Entry): number { return (entry.durationMinutes / (END_MINUTE - START_MINUTE)) * 100; }
  protected left(entry: Entry): number { const indices = this.groupIndices(entry); return (Math.min(...indices) / Math.max(1, this.plan()?.groups.length ?? 1)) * 100; }
  protected width(entry: Entry): number { const indices = this.groupIndices(entry); return ((Math.max(...indices) - Math.min(...indices) + 1) / Math.max(1, this.plan()?.groups.length ?? 1)) * 100; }
  protected formatHour(hour: number): string { return `${String(hour).padStart(2, '0')}:00`; }
  protected subjectLabel(entry: Entry): string { return this.useCompactLabels() ? (entry.subjectCode || entry.subjectName) : entry.subjectName; }
  protected lecturerLabel(entry: Entry): string { return this.useCompactLabels() ? this.initials(entry.lecturerDisplayName) : entry.lecturerDisplayName; }

  protected async openComments(entry: Entry): Promise<void> {
    this.commentsEntry.set(entry); this.commentDraft.set(''); this.editingId.set(null); this.comments.set([]);
    try { this.comments.set(await firstValueFrom(this.http.get<ApiComment[]>(`${this.base}/entries/${entry.id}/comments`))); }
    catch (error) { this.error.set(this.errorMessage(error, 'Nie udało się pobrać komentarzy.')); }
  }

  protected closeComments(): void { this.commentsEntry.set(null); this.comments.set([]); }
  protected async addComment(): Promise<void> {
    const entry = this.commentsEntry(); const body = this.commentDraft().trim(); if (!entry || !body) return;
    try { const created = await firstValueFrom(this.http.post<ApiComment>(`${this.base}/entries/${entry.id}/comments`, { body })); this.comments.update(items => [...items, created]); this.commentDraft.set(''); this.adjustCommentCount(entry.id, 1); }
    catch (error) { this.error.set(this.errorMessage(error, 'Nie udało się dodać komentarza.')); }
  }
  protected startEdit(comment: ApiComment): void { this.editingId.set(comment.id); this.editDraft.set(comment.body); }
  protected cancelEdit(): void { this.editingId.set(null); this.editDraft.set(''); }
  protected async saveEdit(): Promise<void> {
    const id = this.editingId(); const body = this.editDraft().trim(); if (!id || !body) return;
    try { const updated = await firstValueFrom(this.http.put<ApiComment>(`${this.base}/comments/${id}`, { body })); this.comments.update(items => items.map(item => item.id === id ? updated : item)); this.cancelEdit(); }
    catch (error) { this.error.set(this.errorMessage(error, 'Nie udało się zapisać komentarza.')); }
  }
  protected async removeComment(comment: ApiComment): Promise<void> {
    if (!confirm('Usunąć komentarz?')) return;
    try { await firstValueFrom(this.http.delete(`${this.base}/comments/${comment.id}`)); this.comments.update(items => items.filter(item => item.id !== comment.id)); const entry = this.commentsEntry(); if (entry) this.adjustCommentCount(entry.id, -1); }
    catch (error) { this.error.set(this.errorMessage(error, 'Nie udało się usunąć komentarza.')); }
  }
  protected initials(name: string): string { return name.split(/\s+/).filter(part => part && !/^(mgr|inż\.?|inz\.?|dr|hab\.?|prof\.?|lic\.?|lek\.?|doc\.?)$/i.test(part)).map(part => part[0]).join('').toLocaleUpperCase('pl-PL'); }
  protected roleLabel(role: AuthorRole): string { return role === 'admin' ? 'Administrator' : role === 'planner' ? 'Planista' : 'Wykładowca'; }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }

  private formatMinute(value: number): string { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
  private useCompactLabels(): boolean {
    const plan = this.plan();
    const dayCount = this.visibleDays().length;
    const width = this.calendarWidthPx();
    if (!plan || !dayCount || width <= 62) return false;
    const dayWidth = (width - 62) / dayCount;
    return dayWidth / Math.max(1, plan.groups.length) < COMPACT_LABEL_COLUMN_WIDTH_PX;
  }
  private groupIndices(entry: Entry): number[] { const groups = this.plan()?.groups ?? []; const indices = entry.groupIds.map(id => groups.findIndex(group => group.id === id)).filter(index => index >= 0); return indices.length ? indices : [0]; }
  private adjustCommentCount(entryId: string, delta: number): void { this.plan.update(plan => plan ? { ...plan, entries: plan.entries.map(entry => entry.id === entryId ? { ...entry, commentCount: Math.max(0, entry.commentCount + delta) } : entry) } : plan); }
  private readProfile(): { email: string } { try { return JSON.parse(sessionStorage.getItem('shogun_user_profile') ?? '{"email":""}'); } catch { return { email: '' }; } }
  private errorMessage(error: unknown, fallback: string): string { return error instanceof HttpErrorResponse && typeof error.error?.detail === 'string' ? error.error.detail : fallback; }
}
