export type StudyMode = 'stacjonarny' | 'niestacjonarny';

export type Semester = 'zimowy' | 'letni';

/** Semester number (1–8); odd = zimowy, even = letni; rok = Math.ceil(n/2) */
export function semesterTypeOf(n: number): Semester {
  return n % 2 === 1 ? 'zimowy' : 'letni';
}

export function rokOf(n: number): number {
  return Math.ceil(n / 2);
}

export interface ScheduleEntry {
  id: string;
  /** Dezyderat, z którego wybrano prowadzącego. Brak dla nazwiska wpisanego ręcznie. */
  lecturerAssignmentId?: number;
  subjectName: string;
  subjectCode?: string;
  lecturerName: string;
  lecturerEmail: string;
  classType?: 'lecture' | 'exercises' | 'laboratory' | 'project' | 'seminar' | 'other';
  room: string;
  /** 0=Pon, 1=Wt, 2=Śr, 3=Czw, 4=Pt, 5=Sob, 6=Nd */
  dayOfWeek: number;
  /** 0-based group (sub-column) index within the day */
  group: number;
  /** Number of adjacent group columns occupied by this entry. */
  groupSpan?: number;
  /** User-selected block color in hexadecimal notation. */
  color?: string;
  /** Decimal hour: 8.0 = 08:00, 9.5 = 09:30 */
  startHour: number;
  durationHours: number;
  /** 1=zimowy rok1, 2=letni rok1, 3=zimowy rok2, … */
  semesterNumber: number;
  academicYear: string;
  studyMode: StudyMode;
  groupIds?: string[];
  concurrencyToken?: string;
  commentCount?: number;
}

export interface ScheduleGroup { id: string; code: string; name: string; sortOrder: number; concurrencyToken?: string }
export interface SchedulePlanSummary { id: string; facultyCode: string; facultyName: string; academicYear: string; semesterNumber: number; studyMode: 'stationary' | 'partTime'; name: string; status: 'draft' | 'published'; concurrencyToken: string; updatedAt: string; updatedBy: string }
export interface SchedulePlan extends SchedulePlanSummary { groups: ScheduleGroup[]; entries: ScheduleEntry[] }

export interface ConflictInfo {
  entryId: string;
  conflictsWith: string[];
  reason: 'room' | 'lecturer';
}

export interface ScheduleFilters {
  mode: StudyMode;
  semesterNumber: number | null;
}

export const DAY_NAMES: Record<number, string> = {
  0: 'Poniedziałek',
  1: 'Wtorek',
  2: 'Środa',
  3: 'Czwartek',
  4: 'Piątek',
  5: 'Sobota',
  6: 'Niedziela',
};

export function formatHour(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
