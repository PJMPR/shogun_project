import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type StudyMode = 'stationary' | 'partTime';
type Scope = 'all' | 'mine';
type SemesterSeason = 'winter' | 'summer';
type View = 'weekly' | 'list';
type AuthorRole = 'admin' | 'planner' | 'lecturer';

interface PlanSummary {
  id: string;
  facultyCode: string;
  facultyName: string;
  academicYear: string;
  semesterNumber: number;
  studyMode: StudyMode;
  status: 'draft' | 'published';
}
interface Group {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}
interface Entry {
  id: string;
  subjectName: string;
  subjectCode?: string;
  lecturerDisplayName: string;
  lecturerUserId?: string;
  lecturerEmail?: string;
  classType: string;
  room?: string;
  dayOfWeek: number;
  startMinute: number;
  durationMinutes: number;
  color?: string;
  dates?: string[];
  groupIds: string[];
  commentCount: number;
  commentThreadClosed: boolean;
}
interface Plan extends PlanSummary {
  groups: Group[];
  entries: Entry[];
}
interface ViewEntry extends Entry {
  semesterNumber: number;
  groupCodes: string[];
}
interface LecturerOption {
  key: string;
  label: string;
}
interface CalendarColumn {
  day: number;
  semesterNumber?: number;
}
interface EntryLayout {
  left: number;
  width: number;
}
interface MentionRecipient {
  userId: string;
  displayName: string;
  email?: string | null;
}
interface DirectoryUser extends MentionRecipient {
  hasEmail: boolean;
}
interface ApiComment {
  id: string;
  scheduleEntryId: string;
  body: string;
  authorUserId?: string;
  authorEmail?: string;
  authorDisplayName: string;
  authorRole: AuthorRole;
  createdAt: string;
  updatedAt?: string;
  canEdit: boolean;
  canDelete: boolean;
  recipients: MentionRecipient[];
}

@Component({
  selector: 'app-mention-input',
  standalone: true,
  imports: [FormsModule],
  template: `<div class="mention-editor">
      <textarea
        #editor
        rows="3"
        [ngModel]="value()"
        (ngModelChange)="changed($event)"
        (click)="cursorChanged()"
        (keyup)="cursorChanged()"
        [placeholder]="placeholder()"
      ></textarea>
      @if (open()) {
        <div class="mention-menu">
          @for (user of results(); track user.userId) {
            <button
              type="button"
              [disabled]="!user.hasEmail"
              (mousedown)="$event.preventDefault(); select(user)"
            >
              <strong>{{ user.displayName }}</strong
              ><small>{{ user.email || 'Brak adresu e-mail' }}</small>
            </button>
          } @empty {
            <span>Brak wyników</span>
          }
        </div>
      }
    </div>
    @if (recipients().length) {
      <div class="recipient-chips">
        <small>Odbiorcy:</small>
        @for (recipient of recipients(); track recipient.userId) {
          <button type="button" (click)="remove(recipient)">
            {{ recipient.displayName }}
            @if (recipient.email) { · {{ recipient.email }} }
            <i class="pi pi-times"></i>
          </button>
        }
      </div>
    }`,
  styles: [
    `
      .mention-editor {
        position: relative;
      }
      .mention-menu {
        position: absolute;
        right: 0;
        bottom: 100%;
        left: 0;
        z-index: 30;
        max-height: 210px;
        overflow: auto;
        border: 1px solid #cbd5e1;
        border-radius: 7px;
        background: #fff;
        box-shadow: 0 8px 24px #0f172a24;
      }
      .mention-menu button {
        display: flex;
        width: 100%;
        flex-direction: column;
        padding: 0.55rem 0.7rem;
        border: 0;
        border-bottom: 1px solid #eef2f7;
        background: #fff;
        text-align: left;
        cursor: pointer;
      }
      .mention-menu button:disabled {
        opacity: 0.5;
      }
      .mention-menu span {
        display: block;
        padding: 0.6rem;
      }
      .recipient-chips {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin: 0.4rem 0;
      }
      .recipient-chips small {
        color: #64748b;
      }
      .recipient-chips button {
        padding: 0.25rem 0.5rem;
        border: 0;
        border-radius: 99px;
        color: #7f1d1d;
        background: #fee2e2;
        cursor: pointer;
      }
      .recipient-chips i {
        margin-left: 0.3rem;
        font-size: 0.65rem;
      }
    `,
  ],
})
class MentionInputComponent {
  private readonly http = inject(HttpClient);
  private readonly search$ = new Subject<string>();
  private mentionStart = -1;
  readonly value = input('');
  readonly recipients = input<MentionRecipient[]>([]);
  readonly placeholder = input('');
  readonly valueChange = output<string>();
  readonly recipientsChange = output<MentionRecipient[]>();
  protected readonly results = signal<DirectoryUser[]>([]);
  protected readonly open = signal(false);
  @ViewChild('editor') private editor?: ElementRef<HTMLTextAreaElement>;
  constructor() {
    this.search$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((query) =>
          this.http.get<DirectoryUser[]>('/api-users/api/v1/user-directory', {
            params: { query, limit: 20 },
          }),
        ),
      )
      .subscribe({
        next: (items) => {
          const results = items.filter(
            (x) => !this.recipients().some((r) => r.userId === x.userId),
          );
          this.results.set(results);
          this.open.set(results.length > 0);
        },
        error: () => this.open.set(false),
      });
  }
  protected changed(text: string) {
    this.valueChange.emit(text);
    const kept = this.recipients().filter((r) =>
      text.includes(`@${r.displayName}`),
    );
    if (kept.length !== this.recipients().length)
      this.recipientsChange.emit(kept);
    queueMicrotask(() => this.cursorChanged());
  }
  protected cursorChanged() {
    const el = this.editor?.nativeElement;
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart);
    if (/\s$/.test(before)) {
      this.open.set(false);
      return;
    }
    const match = before.match(/(?:^|\s)@([^@\n]*)$/);
    if (!match) {
      this.open.set(false);
      return;
    }
    this.mentionStart = el.selectionStart - match[1].length - 1;
    const query = match[1].trim();
    if (query.length < 2) {
      this.open.set(false);
      return;
    }
    this.search$.next(query);
  }
  protected select(user: DirectoryUser) {
    if (!user.hasEmail) return;
    const el = this.editor?.nativeElement;
    const start = this.mentionStart;
    const end = el?.selectionStart ?? this.value().length;
    const next = `${this.value().slice(0, start)}@${user.displayName} ${this.value().slice(end)}`;
    this.valueChange.emit(next);
    this.recipientsChange.emit([...this.recipients(), user]);
    this.open.set(false);
  }
  protected remove(recipient: MentionRecipient) {
    this.valueChange.emit(
      this.value()
        .replace(`@${recipient.displayName}`, '')
        .replace(/ {2,}/g, ' '),
    );
    this.recipientsChange.emit(
      this.recipients().filter((x) => x.userId !== recipient.userId),
    );
  }
}

const DAYS = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];
export { MentionInputComponent };

const START_MINUTE = 8 * 60;
const END_MINUTE = 20 * 60;
const COMPACT_LABEL_COLUMN_WIDTH_PX = 112;

@Component({
  selector: 'app-schedule-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, MentionInputComponent],
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
  protected readonly threadRecipients = computed(() =>
    [...new Map(this.comments().flatMap(comment => comment.recipients).map(recipient => [recipient.userId, recipient])).values()],
  );
  protected readonly commentsEntry = signal<Entry | null>(null);
  protected readonly commentThreadTab = signal<'active' | 'closed'>('active');
  protected readonly closeThreadModalOpen = signal(false);
  protected readonly commentDraft = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly commentRecipients = signal<MentionRecipient[]>([]);
  protected readonly editRecipients = signal<MentionRecipient[]>([]);
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
  protected readonly facultyOptions = [
    { label: 'Informatyka', value: 'WI' },
    { label: 'Sztuka Nowych Mediów', value: 'SNM' },
  ];
  protected readonly modeOptions = [
    { label: 'Stacjonarne', value: 'stationary' as StudyMode },
    { label: 'Niestacjonarne', value: 'partTime' as StudyMode },
  ];
  protected readonly semesterOptions = computed(() => {
    const firstSemester = this.semesterSeason() === 'winter' ? 1 : 2;
    return Array.from({ length: 4 }, (_, index) => {
      const value = firstSemester + index * 2;
      return { label: `Semestr ${value}`, value };
    });
  });
  protected readonly yearOptions = computed(() =>
    [
      ...new Set(
        this.plans()
          .filter(
            (p) =>
              p.facultyCode === this.facultyCode && p.status === 'published',
          )
          .map((p) => p.academicYear),
      ),
    ]
      .sort()
      .reverse(),
  );
  private readonly planEntries = computed(() => {
    const sourcePlans =
      this.scope() === 'mine'
        ? this.myPlans()
        : this.plan()
          ? [this.plan()!]
          : [];
    return sourcePlans.flatMap((plan) =>
      plan.entries.map((entry) => ({
        ...entry,
        semesterNumber: plan.semesterNumber,
        groupCodes: entry.groupIds
          .map((id) => plan.groups.find((group) => group.id === id)?.code)
          .filter((code): code is string => Boolean(code)),
      })),
    );
  });
  protected readonly lecturerOptions = computed<LecturerOption[]>(() => {
    const unique = new Map<string, LecturerOption>();
    for (const entry of this.planEntries()) {
      const key = this.lecturerKey(entry);
      if (key && !unique.has(key))
        unique.set(key, { key, label: entry.lecturerDisplayName });
    }
    return [...unique.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'pl'),
    );
  });
  protected readonly visibleEntries = computed(() => {
    const lecturer = this.selectedLecturer();
    return this.planEntries().filter((entry) => {
      if (this.scope() === 'all')
        return (
          !this.isPlanner || !lecturer || this.lecturerKey(entry) === lecturer
        );
      if (this.isPlanner && lecturer)
        return this.lecturerKey(entry) === lecturer;
      return entry.lecturerUserId === this.currentUserId;
    });
  });
  protected readonly activeMySemesters = computed(() =>
    [
      ...new Set(this.visibleEntries().map((entry) => entry.semesterNumber)),
    ].sort((a, b) => a - b),
  );
  protected readonly calendarColumns = computed<CalendarColumn[]>(() => {
    const days = this.visibleDays();
    if (this.scope() !== 'mine' || this.studyMode() === 'stationary')
      return days.map((day) => ({ day }));
    return days.flatMap((day) =>
      this.activeMySemesters().map((semesterNumber) => ({
        day,
        semesterNumber,
      })),
    );
  });
  protected readonly hours = Array.from(
    { length: 13 },
    (_, index) => index + 8,
  );

  async ngOnInit(): Promise<void> {
    await this.loadPlans();
  }
  ngOnDestroy(): void {
    this.calendarResizeObserver?.disconnect();
  }

  @ViewChild('calendar')
  set calendarElement(element: ElementRef<HTMLElement> | undefined) {
    this.calendarResizeObserver?.disconnect();
    if (!element) {
      this.calendarWidthPx.set(0);
      return;
    }
    this.calendarResizeObserver = new ResizeObserver(([entry]) =>
      this.calendarWidthPx.set(entry.contentRect.width),
    );
    this.calendarResizeObserver.observe(element.nativeElement);
  }

  protected async changeFaculty(): Promise<void> {
    await this.loadPlans();
  }
  protected async selectionChanged(): Promise<void> {
    await this.loadCurrentView();
  }
  protected async studyModeChanged(mode: StudyMode): Promise<void> {
    this.studyMode.set(mode);
    await this.loadCurrentView();
  }
  protected async scopeChanged(scope: Scope): Promise<void> {
    this.scope.set(scope);
    await this.loadCurrentView();
  }
  protected async lecturerChanged(query: string): Promise<void> {
    this.lecturerQuery.set(query);
    const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL');
    const match = this.lecturerOptions().find(
      (option) => option.label.toLocaleLowerCase('pl-PL') === normalizedQuery,
    );
    this.selectedLecturer.set(match?.key ?? '');
    if (match && this.scope() !== 'mine') await this.scopeChanged('mine');
  }
  protected async toggleSemester(
    semesterNumber: number,
    checked: boolean,
  ): Promise<void> {
    this.selectedSemesters.update((selected) =>
      checked
        ? [...new Set([...selected, semesterNumber])].sort((a, b) => a - b)
        : selected.filter((value) => value !== semesterNumber),
    );
    await this.loadMinePlans();
  }
  protected async seasonChanged(season: SemesterSeason): Promise<void> {
    this.semesterSeason.set(season);
    const isWinterSemester = Number(this.semesterNumber) % 2 === 1;
    if ((season === 'winter') !== isWinterSemester) {
      this.semesterNumber += season === 'winter' ? -1 : 1;
    }
    this.selectedSemesters.set(
      this.semesterOptions().map((option) => option.value),
    );
    await this.loadCurrentView();
  }

  private async loadPlans(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.plan.set(null);
    this.myPlans.set([]);
    try {
      const items = await firstValueFrom(
        this.http.get<PlanSummary[]>(
          `${this.base}/schedules/published?facultyCode=${encodeURIComponent(this.facultyCode)}`,
        ),
      );
      this.plans.set(items);
      const years = [
        ...new Set(
          items
            .filter((p) => p.status === 'published')
            .map((p) => p.academicYear),
        ),
      ]
        .sort()
        .reverse();
      if (!years.includes(this.academicYear))
        this.academicYear = years[0] ?? '';
      await this.loadCurrentView();
    } catch (error) {
      this.error.set(
        this.errorMessage(error, 'Nie udało się pobrać planów zajęć.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSelectedPlan(): Promise<void> {
    this.commentsEntry.set(null);
    if (!this.academicYear) {
      this.plan.set(null);
      return;
    }
    const match = this.plans().find(
      (item) =>
        item.status === 'published' &&
        item.facultyCode === this.facultyCode &&
        item.academicYear === this.academicYear &&
        item.semesterNumber === Number(this.semesterNumber) &&
        item.studyMode === this.studyMode(),
    );
    if (!match) {
      this.plan.set(null);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      this.plan.set(
        await firstValueFrom(
          this.http.get<Plan>(`${this.base}/schedules/published/${match.id}`),
        ),
      );
    } catch (error) {
      this.plan.set(null);
      this.error.set(
        this.errorMessage(error, 'Nie udało się pobrać opublikowanego planu.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadMinePlans(): Promise<void> {
    this.commentsEntry.set(null);
    if (!this.academicYear || !this.selectedSemesters().length) {
      this.myPlans.set([]);
      return;
    }
    const selected = new Set(this.selectedSemesters());
    const matches = this.plans().filter(
      (item) =>
        item.status === 'published' &&
        item.facultyCode === this.facultyCode &&
        item.academicYear === this.academicYear &&
        item.studyMode === this.studyMode() &&
        selected.has(item.semesterNumber),
    );
    this.loading.set(true);
    this.error.set(null);
    try {
      const loaded = await Promise.all(
        matches.map((match) =>
          firstValueFrom(
            this.http.get<Plan>(`${this.base}/schedules/published/${match.id}`),
          ),
        ),
      );
      this.myPlans.set(
        loaded.sort((a, b) => a.semesterNumber - b.semesterNumber),
      );
    } catch (error) {
      this.myPlans.set([]);
      this.error.set(
        this.errorMessage(error, 'Nie udało się pobrać planów prowadzącego.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCurrentView(): Promise<void> {
    if (this.scope() === 'mine') await this.loadMinePlans();
    else await this.loadSelectedPlan();
  }

  protected entriesForColumn(column: CalendarColumn): ViewEntry[] {
    return this.visibleEntries().filter(
      (entry) =>
        entry.dayOfWeek === column.day &&
        (column.semesterNumber === undefined ||
          entry.semesterNumber === column.semesterNumber),
    );
  }
  protected visibleDays(): number[] {
    return this.studyMode() === 'stationary' ? [0, 1, 2, 3, 4] : [5, 6];
  }
  protected groupNames(entry: Entry | ViewEntry): string {
    return 'groupCodes' in entry ? entry.groupCodes.join(', ') : '';
  }
  protected time(entry: Entry): string {
    return `${this.formatMinute(entry.startMinute)}–${this.formatMinute(entry.startMinute + entry.durationMinutes)}`;
  }
  protected top(entry: Entry): number {
    return (
      ((entry.startMinute - START_MINUTE) / (END_MINUTE - START_MINUTE)) * 100
    );
  }
  protected height(entry: Entry): number {
    return (entry.durationMinutes / (END_MINUTE - START_MINUTE)) * 100;
  }
  protected left(entry: ViewEntry, column: CalendarColumn): number {
    if (this.scope() === 'mine') return this.entryLayout(entry, column).left;
    const indices = this.groupIndices(entry);
    return (
      (Math.min(...indices) / Math.max(1, this.plan()?.groups.length ?? 1)) *
      100
    );
  }
  protected width(entry: ViewEntry, column: CalendarColumn): number {
    if (this.scope() === 'mine') return this.entryLayout(entry, column).width;
    const indices = this.groupIndices(entry);
    return (
      ((Math.max(...indices) - Math.min(...indices) + 1) /
        Math.max(1, this.plan()?.groups.length ?? 1)) *
      100
    );
  }
  protected formatHour(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }
  protected subjectLabel(entry: Entry): string {
    return this.useCompactLabels()
      ? entry.subjectCode || entry.subjectName
      : entry.subjectName;
  }
  protected lecturerLabel(entry: Entry): string {
    return this.useCompactLabels()
      ? this.initials(entry.lecturerDisplayName)
      : entry.lecturerDisplayName;
  }
  protected classTypeLabel(classType: string | null | undefined): string {
    const labels: Record<string, string> = {
      '1': 'Wykład',
      '2': 'Ćwiczenia',
      '3': 'Laboratorium',
      '4': 'Projekt',
      '5': 'Seminarium',
      lecture: 'Wykład',
      exercises: 'Ćwiczenia',
      laboratory: 'Laboratorium',
      project: 'Projekt',
      seminar: 'Seminarium',
    };
    return classType ? (labels[classType.toLowerCase()] ?? '') : '';
  }

  protected async openComments(entry: Entry): Promise<void> {
    this.commentsEntry.set(entry);
    this.commentThreadTab.set('active');
    this.commentDraft.set('');
    this.commentRecipients.set([]);
    this.editingId.set(null);
    this.comments.set([]);
    try {
      this.comments.set(
        await firstValueFrom(
          this.http.get<ApiComment[]>(
            `${this.base}/entries/${entry.id}/comments`,
          ),
        ),
      );
    } catch (error) {
      this.error.set(
        this.errorMessage(error, 'Nie udało się pobrać komentarzy.'),
      );
    }
  }

  protected closeComments(): void {
    this.closeThreadModalOpen.set(false);
    this.commentsEntry.set(null);
    this.comments.set([]);
  }
  protected async setCommentThreadClosed(closed: boolean): Promise<void> {
    const entry = this.commentsEntry(); if (!entry) return;
    try {
      const status = await firstValueFrom(this.http.patch<{ scheduleEntryId: string; closed: boolean }>(`${this.base}/entries/${entry.id}/comment-thread`, { closed }));
      this.commentsEntry.set({ ...entry, commentThreadClosed: status.closed });
      this.updateCommentThreadStatus(status.scheduleEntryId, status.closed);
      this.closeThreadModalOpen.set(false);
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Nie udało się zmienić statusu wątku.'));
    }
  }
  protected async addComment(): Promise<void> {
    const entry = this.commentsEntry();
    const body = this.commentDraft().trim();
    if (!entry || !body) return;
    try {
      const created = await firstValueFrom(
        this.http.post<ApiComment>(
          `${this.base}/entries/${entry.id}/comments`,
          {
            body,
            mentionedUserIds: this.commentRecipients().map((x) => x.userId),
          },
        ),
      );
      this.comments.update((items) => [...items, created]);
      this.commentDraft.set('');
      this.commentRecipients.set([]);
      this.adjustCommentCount(entry.id, 1);
    } catch (error) {
      this.error.set(
        this.errorMessage(error, 'Nie udało się dodać komentarza.'),
      );
    }
  }
  protected startEdit(comment: ApiComment): void {
    this.editingId.set(comment.id);
    this.editDraft.set(comment.body);
    this.editRecipients.set(comment.recipients ?? []);
  }
  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
    this.editRecipients.set([]);
  }
  protected async saveEdit(): Promise<void> {
    const id = this.editingId();
    const body = this.editDraft().trim();
    if (!id || !body) return;
    try {
      const updated = await firstValueFrom(
        this.http.put<ApiComment>(`${this.base}/comments/${id}`, {
          body,
          mentionedUserIds: this.editRecipients().map((x) => x.userId),
        }),
      );
      this.comments.update((items) =>
        items.map((item) => (item.id === id ? updated : item)),
      );
      this.cancelEdit();
    } catch (error) {
      this.error.set(
        this.errorMessage(error, 'Nie udało się zapisać komentarza.'),
      );
    }
  }
  protected async removeComment(comment: ApiComment): Promise<void> {
    if (!confirm('Usunąć komentarz?')) return;
    try {
      await firstValueFrom(
        this.http.delete(`${this.base}/comments/${comment.id}`),
      );
      this.comments.update((items) =>
        items.filter((item) => item.id !== comment.id),
      );
      const entry = this.commentsEntry();
      if (entry) this.adjustCommentCount(entry.id, -1);
    } catch (error) {
      this.error.set(
        this.errorMessage(error, 'Nie udało się usunąć komentarza.'),
      );
    }
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(
        (part) =>
          part &&
          !/^(mgr|inż\.?|inz\.?|dr|hab\.?|prof\.?|lic\.?|lek\.?|doc\.?)$/i.test(
            part,
          ),
      )
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('pl-PL');
  }
  protected roleLabel(role: AuthorRole): string {
    return role === 'admin'
      ? 'Administrator'
      : role === 'planner'
        ? 'Planista'
        : 'Wykładowca';
  }
  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }
  protected bodyParts(comment: ApiComment): { text: string; mention: boolean }[] {
    const tokens = comment.recipients.map((recipient) => `@${recipient.displayName}`).sort((a, b) => b.length - a.length);
    if (!tokens.length) return [{ text: comment.body, mention: false }];
    const tokenSet = new Set(tokens);
    const pattern = new RegExp(`(${tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    return comment.body.split(pattern).filter(Boolean).map((text) => ({ text, mention: tokenSet.has(text) }));
  }

  private formatMinute(value: number): string {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }
  private useCompactLabels(): boolean {
    const plan = this.plan();
    const dayCount = this.visibleDays().length;
    const width = this.calendarWidthPx();
    if (!plan || !dayCount || width <= 62) return false;
    const dayWidth = (width - 62) / dayCount;
    return (
      dayWidth / Math.max(1, plan.groups.length) < COMPACT_LABEL_COLUMN_WIDTH_PX
    );
  }
  private groupIndices(entry: Entry): number[] {
    const groups = this.plan()?.groups ?? [];
    const indices = entry.groupIds
      .map((id) => groups.findIndex((group) => group.id === id))
      .filter((index) => index >= 0);
    return indices.length ? indices : [0];
  }
  private entryLayout(entry: ViewEntry, column: CalendarColumn): EntryLayout {
    const entries = [...this.entriesForColumn(column)].sort(
      (a, b) =>
        a.startMinute - b.startMinute || b.durationMinutes - a.durationMinutes,
    );
    const groups: ViewEntry[][] = [];
    let groupEnd = -1;
    for (const candidate of entries) {
      if (!groups.length || candidate.startMinute >= groupEnd) {
        groups.push([candidate]);
        groupEnd = candidate.startMinute + candidate.durationMinutes;
      } else {
        groups.at(-1)!.push(candidate);
        groupEnd = Math.max(
          groupEnd,
          candidate.startMinute + candidate.durationMinutes,
        );
      }
    }
    const group = groups.find((items) =>
      items.some((item) => item.id === entry.id),
    );
    if (!group) return { left: 0, width: 100 };
    const laneEnds: number[] = [];
    const lanes = new Map<string, number>();
    for (const candidate of group) {
      let lane = laneEnds.findIndex((end) => end <= candidate.startMinute);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = candidate.startMinute + candidate.durationMinutes;
      lanes.set(candidate.id, lane);
    }
    const width = 100 / Math.max(1, laneEnds.length);
    return { left: (lanes.get(entry.id) ?? 0) * width, width };
  }
  private lecturerKey(entry: Entry): string {
    return (
      entry.lecturerUserId || entry.lecturerEmail || entry.lecturerDisplayName
    );
  }
  private adjustCommentCount(entryId: string, delta: number): void {
    const updatePlan = (plan: Plan): Plan => ({
      ...plan,
      entries: plan.entries.map((entry) =>
        entry.id === entryId
          ? { ...entry, commentCount: Math.max(0, entry.commentCount + delta) }
          : entry,
      ),
    });
    this.plan.update((plan) => (plan ? updatePlan(plan) : plan));
    this.myPlans.update((plans) => plans.map(updatePlan));
  }
  private updateCommentThreadStatus(entryId: string, closed: boolean): void {
    const updatePlan = (plan: Plan): Plan => ({
      ...plan,
      entries: plan.entries.map((entry) => entry.id === entryId ? { ...entry, commentThreadClosed: closed } : entry),
    });
    this.plan.update((plan) => plan ? updatePlan(plan) : plan);
    this.myPlans.update((plans) => plans.map(updatePlan));
  }
  private readProfile(): { userId: string } {
    try {
      return JSON.parse(
        sessionStorage.getItem('shogun_user_profile') ?? '{"userId":""}',
      );
    } catch {
      return { userId: '' };
    }
  }
  private readRoles(): string[] {
    try {
      const roles = JSON.parse(sessionStorage.getItem('shogun_roles') ?? '[]');
      return Array.isArray(roles) ? roles : [];
    } catch {
      return [];
    }
  }
  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof HttpErrorResponse &&
      typeof error.error?.detail === 'string'
      ? error.error.detail
      : fallback;
  }
}
