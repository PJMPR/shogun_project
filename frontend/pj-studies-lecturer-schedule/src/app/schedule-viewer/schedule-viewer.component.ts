import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type StudyMode = 'stationary' | 'partTime';
type Scope = 'all' | 'mine';
type SemesterSeason = 'winter' | 'summer';
type View = 'weekly' | 'list';
type AuthorRole = 'admin' | 'planner' | 'lecturer';

interface PlanSummary { id: string; facultyCode: string; facultyName: string; academicYear: string; semesterNumber: number; studyMode: StudyMode; status: 'draft' | 'published' }
interface Group { id: string; code: string; name: string; sortOrder: number }
interface Entry { id: string; subjectName: string; subjectCode?: string; lecturerDisplayName: string; lecturerUserId?: string; lecturerEmail?: string; classType: string; room?: string; dayOfWeek: number; startMinute: number; durationMinutes: number; color?: string; dates?: string[]; groupIds: string[]; commentCount: number }
interface Plan extends PlanSummary { groups: Group[]; entries: Entry[] }
interface ViewEntry extends Entry { semesterNumber: number; groupCodes: string[] }
interface LecturerOption { key: string; label: string }
interface CalendarColumn { day: number; semesterNumber?: number }
interface EntryLayout { left: number; width: number }
interface ApiComment { id: string; scheduleEntryId: string; body: string; authorUserId?: string; authorEmail?: string; authorDisplayName: string; authorRole: AuthorRole; createdAt: string; updatedAt?: string; canEdit: boolean; canDelete: boolean }

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
  protected readonly myPlans = signal<Plan[]>([]);
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
  protected readonly semesterSeason = signal<SemesterSeason>('winter');
  protected readonly selectedSemesters = signal<number[]>([1, 3, 5, 7]);
  protected readonly studyMode = signal<StudyMode>('stationary');
  protected readonly scope = signal<Scope>('mine');
  protected readonly selectedLecturer = signal('');
  protected readonly lecturerQuery = signal('');
  protected view: View = 'weekly';
  protected readonly currentUserId = this.readProfile().userId;
  protected readonly isPlanner = this.readRoles().includes('planner');
  protected readonly facultyOptions = [{ label: 'Informatyka', value: 'WI' }, { label: 'Sztuka Nowych Mediów', value: 'SNM' }];
  protected readonly modeOptions = [{ label: 'Stacjonarne', value: 'stationary' as StudyMode }, { label: 'Niestacjonarne', value: 'partTime' as StudyMode }];
  protected readonly semesterOptions = computed(() => {
    const firstSemester = this.semesterSeason() === 'winter' ? 1 : 2;
    return Array.from({ length: 4 }, (_, index) => {
      const value = firstSemester + index * 2;
      return { label: `Semestr ${value}`, value };
    });
  });
  protected readonly yearOptions = computed(() => [...new Set(this.plans().filter(p => p.facultyCode === this.facultyCode && p.status === 'published').map(p => p.academicYear))].sort().reverse());
  private readonly planEntries = computed(() => {
    const sourcePlans = this.scope() === 'mine' ? this.myPlans() : (this.plan() ? [this.plan()!] : []);
    return sourcePlans.flatMap(plan => plan.entries
      .map(entry => ({
        ...entry,
        semesterNumber: plan.semesterNumber,
        groupCodes: entry.groupIds.map(id => plan.groups.find(group => group.id === id)?.code).filter((code): code is string => Boolean(code)),
      })));
  });
  protected readonly lecturerOptions = computed<LecturerOption[]>(() => {
    const unique = new Map<string, LecturerOption>();
    for (const entry of this.planEntries()) {
      const key = this.lecturerKey(entry);
      if (key && !unique.has(key)) unique.set(key, { key, label: entry.lecturerDisplayName });
    }
    return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label, 'pl'));
  });
  protected readonly visibleEntries = computed(() => {
    const lecturer = this.selectedLecturer();
    return this.planEntries().filter(entry => {
      if (this.scope() === 'all') return !this.isPlanner || !lecturer || this.lecturerKey(entry) === lecturer;
      if (this.isPlanner && lecturer) return this.lecturerKey(entry) === lecturer;
      return entry.lecturerUserId === this.currentUserId;
    });
  });
  protected readonly activeMySemesters = computed(() => [...new Set(this.visibleEntries().map(entry => entry.semesterNumber))].sort((a, b) => a - b));
  protected readonly calendarColumns = computed<CalendarColumn[]>(() => {
    const days = this.visibleDays();
    if (this.scope() !== 'mine' || this.studyMode() === 'stationary') return days.map(day => ({ day }));
    return days.flatMap(day => this.activeMySemesters().map(semesterNumber => ({ day, semesterNumber })));
  });
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
  protected async selectionChanged(): Promise<void> { await this.loadCurrentView(); }
  protected async studyModeChanged(mode: StudyMode): Promise<void> { this.studyMode.set(mode); await this.loadCurrentView(); }
  protected async scopeChanged(scope: Scope): Promise<void> { this.scope.set(scope); await this.loadCurrentView(); }
  protected async lecturerChanged(query: string): Promise<void> {
    this.lecturerQuery.set(query);
    const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL');
    const match = this.lecturerOptions().find(option => option.label.toLocaleLowerCase('pl-PL') === normalizedQuery);
    this.selectedLecturer.set(match?.key ?? '');
    if (match && this.scope() !== 'mine') await this.scopeChanged('mine');
  }
  protected async toggleSemester(semesterNumber: number, checked: boolean): Promise<void> {
    this.selectedSemesters.update(selected => checked
      ? [...new Set([...selected, semesterNumber])].sort((a, b) => a - b)
      : selected.filter(value => value !== semesterNumber));
    await this.loadMinePlans();
  }
  protected async seasonChanged(season: SemesterSeason): Promise<void> {
    this.semesterSeason.set(season);
    const isWinterSemester = Number(this.semesterNumber) % 2 === 1;
    if ((season === 'winter') !== isWinterSemester) {
      this.semesterNumber += season === 'winter' ? -1 : 1;
    }
    this.selectedSemesters.set(this.semesterOptions().map(option => option.value));
    await this.loadCurrentView();
  }

  private async loadPlans(): Promise<void> {
    this.loading.set(true); this.error.set(null); this.plan.set(null); this.myPlans.set([]);
    try {
      const items = await firstValueFrom(this.http.get<PlanSummary[]>(`${this.base}/schedules/published?facultyCode=${encodeURIComponent(this.facultyCode)}`));
      this.plans.set(items);
      const years = [...new Set(items.filter(p => p.status === 'published').map(p => p.academicYear))].sort().reverse();
      if (!years.includes(this.academicYear)) this.academicYear = years[0] ?? '';
      await this.loadCurrentView();
    } catch (error) { this.error.set(this.errorMessage(error, 'Nie udało się pobrać planów zajęć.')); }
    finally { this.loading.set(false); }
  }

  private async loadSelectedPlan(): Promise<void> {
    this.commentsEntry.set(null);
    if (!this.academicYear) { this.plan.set(null); return; }
    const match = this.plans().find(item => item.status === 'published' && item.facultyCode === this.facultyCode && item.academicYear === this.academicYear && item.semesterNumber === Number(this.semesterNumber) && item.studyMode === this.studyMode());
    if (!match) { this.plan.set(null); return; }
    this.loading.set(true); this.error.set(null);
    try { this.plan.set(await firstValueFrom(this.http.get<Plan>(`${this.base}/schedules/published/${match.id}`))); }
    catch (error) { this.plan.set(null); this.error.set(this.errorMessage(error, 'Nie udało się pobrać opublikowanego planu.')); }
    finally { this.loading.set(false); }
  }

  private async loadMinePlans(): Promise<void> {
    this.commentsEntry.set(null);
    if (!this.academicYear || !this.selectedSemesters().length) { this.myPlans.set([]); return; }
    const selected = new Set(this.selectedSemesters());
    const matches = this.plans().filter(item => item.status === 'published'
      && item.facultyCode === this.facultyCode
      && item.academicYear === this.academicYear
      && item.studyMode === this.studyMode()
      && selected.has(item.semesterNumber));
    this.loading.set(true); this.error.set(null);
    try {
      const loaded = await Promise.all(matches.map(match => firstValueFrom(this.http.get<Plan>(`${this.base}/schedules/published/${match.id}`))));
      this.myPlans.set(loaded.sort((a, b) => a.semesterNumber - b.semesterNumber));
    } catch (error) { this.myPlans.set([]); this.error.set(this.errorMessage(error, 'Nie udało się pobrać planów prowadzącego.')); }
    finally { this.loading.set(false); }
  }

  private async loadCurrentView(): Promise<void> {
    if (this.scope() === 'mine') await this.loadMinePlans();
    else await this.loadSelectedPlan();
  }

  protected entriesForColumn(column: CalendarColumn): ViewEntry[] { return this.visibleEntries().filter(entry => entry.dayOfWeek === column.day && (column.semesterNumber === undefined || entry.semesterNumber === column.semesterNumber)); }
  protected visibleDays(): number[] { return this.studyMode() === 'stationary' ? [0, 1, 2, 3, 4] : [5, 6]; }
  protected groupNames(entry: Entry | ViewEntry): string { return 'groupCodes' in entry ? entry.groupCodes.join(', ') : ''; }
  protected time(entry: Entry): string { return `${this.formatMinute(entry.startMinute)}–${this.formatMinute(entry.startMinute + entry.durationMinutes)}`; }
  protected top(entry: Entry): number { return ((entry.startMinute - START_MINUTE) / (END_MINUTE - START_MINUTE)) * 100; }
  protected height(entry: Entry): number { return (entry.durationMinutes / (END_MINUTE - START_MINUTE)) * 100; }
  protected left(entry: ViewEntry, column: CalendarColumn): number {
    if (this.scope() === 'mine') return this.entryLayout(entry, column).left;
    const indices = this.groupIndices(entry); return (Math.min(...indices) / Math.max(1, this.plan()?.groups.length ?? 1)) * 100;
  }
  protected width(entry: ViewEntry, column: CalendarColumn): number {
    if (this.scope() === 'mine') return this.entryLayout(entry, column).width;
    const indices = this.groupIndices(entry); return ((Math.max(...indices) - Math.min(...indices) + 1) / Math.max(1, this.plan()?.groups.length ?? 1)) * 100;
  }
  protected formatHour(hour: number): string { return `${String(hour).padStart(2, '0')}:00`; }
  protected subjectLabel(entry: Entry): string { return this.useCompactLabels() ? (entry.subjectCode || entry.subjectName) : entry.subjectName; }
  protected lecturerLabel(entry: Entry): string { return this.useCompactLabels() ? this.initials(entry.lecturerDisplayName) : entry.lecturerDisplayName; }
  protected classTypeLabel(classType: string | null | undefined): string {
    const labels: Record<string, string> = { '1': 'Wykład', '2': 'Ćwiczenia', '3': 'Laboratorium', lecture: 'Wykład', exercises: 'Ćwiczenia', laboratory: 'Laboratorium' };
    return classType ? labels[classType.toLowerCase()] ?? '' : '';
  }

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
  private entryLayout(entry: ViewEntry, column: CalendarColumn): EntryLayout {
    const entries = [...this.entriesForColumn(column)].sort((a, b) => a.startMinute - b.startMinute || b.durationMinutes - a.durationMinutes);
    const groups: ViewEntry[][] = [];
    let groupEnd = -1;
    for (const candidate of entries) {
      if (!groups.length || candidate.startMinute >= groupEnd) {
        groups.push([candidate]);
        groupEnd = candidate.startMinute + candidate.durationMinutes;
      } else {
        groups.at(-1)!.push(candidate);
        groupEnd = Math.max(groupEnd, candidate.startMinute + candidate.durationMinutes);
      }
    }
    const group = groups.find(items => items.some(item => item.id === entry.id));
    if (!group) return { left: 0, width: 100 };
    const laneEnds: number[] = [];
    const lanes = new Map<string, number>();
    for (const candidate of group) {
      let lane = laneEnds.findIndex(end => end <= candidate.startMinute);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = candidate.startMinute + candidate.durationMinutes;
      lanes.set(candidate.id, lane);
    }
    const width = 100 / Math.max(1, laneEnds.length);
    return { left: (lanes.get(entry.id) ?? 0) * width, width };
  }
  private lecturerKey(entry: Entry): string { return entry.lecturerUserId || entry.lecturerEmail || entry.lecturerDisplayName; }
  private adjustCommentCount(entryId: string, delta: number): void {
    const updatePlan = (plan: Plan): Plan => ({ ...plan, entries: plan.entries.map(entry => entry.id === entryId ? { ...entry, commentCount: Math.max(0, entry.commentCount + delta) } : entry) });
    this.plan.update(plan => plan ? updatePlan(plan) : plan);
    this.myPlans.update(plans => plans.map(updatePlan));
  }
  private readProfile(): { userId: string } { try { return JSON.parse(sessionStorage.getItem('shogun_user_profile') ?? '{"userId":""}'); } catch { return { userId: '' }; } }
  private readRoles(): string[] { try { const roles = JSON.parse(sessionStorage.getItem('shogun_roles') ?? '[]'); return Array.isArray(roles) ? roles : []; } catch { return []; } }
  private errorMessage(error: unknown, fallback: string): string { return error instanceof HttpErrorResponse && typeof error.error?.detail === 'string' ? error.error.detail : fallback; }
}
