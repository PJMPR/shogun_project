import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FacultyFilters, FacultyWorkload, Lecturer, TeachingAssignment, Subject, StudyMode } from './faculty.models';

@Injectable({ providedIn: 'root' })
export class FacultyDataService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api-schedule/api/v1/faculty';
  readonly lecturers = signal<Lecturer[]>([]); readonly subjects = signal<Subject[]>([]); readonly assignments = signal<TeachingAssignment[]>([]);
  readonly academicYears = signal<string[]>([]); readonly faculties = signal<{ code: string; name: string }[]>([]); readonly loading = signal(false); readonly error = signal<string | null>(null); readonly unassignedEntryCount = signal(0);
  async loadFilters(): Promise<void> { const f = await firstValueFrom(this.http.get<FacultyFilters>(`${this.base}/filters`)); this.academicYears.set(f.academicYears); this.faculties.set(f.faculties); }
  async loadWorkload(academicYear: string, facultyCode: string, studyMode: StudyMode): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { const r = await firstValueFrom(this.http.get<FacultyWorkload>(`${this.base}/workload`, { params: { academicYear, facultyCode, studyMode } })); this.lecturers.set(r.lecturers); this.subjects.set(r.subjects); this.assignments.set(r.assignments); this.unassignedEntryCount.set(r.unassignedEntryCount); }
    catch { this.error.set('Nie udało się pobrać zestawienia Kadry.'); this.lecturers.set([]); this.subjects.set([]); this.assignments.set([]); }
    finally { this.loading.set(false); }
  }
  async loadLecturers(query = ''): Promise<void> { this.lecturers.set(await firstValueFrom(this.http.get<Lecturer[]>(`${this.base}/lecturers`, { params: { query } }))); }
  async saveTitles(values: Record<string, string>): Promise<void> {
    const items = this.lecturers().filter(x => values[x.id] !== undefined && values[x.id] !== (x.academicTitle ?? '')).map(x => ({ lecturerId: x.id, academicTitle: values[x.id] || null, concurrencyToken: x.concurrencyToken })); if (!items.length) return;
    const saved = await firstValueFrom(this.http.patch<{ lecturerId: string; academicTitle?: string; concurrencyToken: string }[]>(`${this.base}/lecturers/academic-titles`, { items })); const byId = new Map(saved.map(x => [x.lecturerId, x]));
    this.lecturers.update(list => list.map(x => byId.has(x.id) ? { ...x, academicTitle: byId.get(x.id)!.academicTitle, concurrencyToken: byId.get(x.id)!.concurrencyToken } : x));
  }
}
