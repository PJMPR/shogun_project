import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button'; import { DialogModule } from 'primeng/dialog'; import { InputTextModule } from 'primeng/inputtext'; import { SelectModule } from 'primeng/select'; import { TableModule } from 'primeng/table'; import { TagModule } from 'primeng/tag';
import { FacultyDataService } from './faculty-data.service'; import { ClassType, Lecturer, StudyMode } from './faculty.models';
type ViewMode = 'lecturers' | 'subjects';
interface DisplayRow { subject: string; lecturer: string; title: string; classType: ClassType; semester: number; season: string; hours: number; }
interface Group { key: string; label: string; subtitle: string; hours: number; rows: DisplayRow[]; }

@Component({ selector: 'app-faculty', standalone: true, imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule], templateUrl: './faculty.component.html', styleUrl: './faculty.component.css' })
export class FacultyComponent {
  readonly data = inject(FacultyDataService);
  readonly yearOptions = computed(() => this.data.academicYears()); readonly fieldOptions = computed(() => this.data.faculties().map(x => x.code)); readonly levelOptions = ['I stopień'];
  readonly modeOptions = [{ label: 'Stacjonarny', value: 'stationary' as StudyMode }, { label: 'Niestacjonarny', value: 'partTime' as StudyMode }];
  academicYear = signal(''); fieldOfStudy = signal('WI'); studyLevel = signal('I stopień'); studyMode = signal<StudyMode>('stationary'); search = signal(''); viewMode = signal<ViewMode>('lecturers'); titlesVisible = signal(false); titleSearch = signal(''); draftTitles = signal<Record<string, string>>({});
  lecturers = this.data.lecturers;
  constructor() { void this.initialize(); }
  private async initialize(): Promise<void> { try { await this.data.loadFilters(); const year = this.data.academicYears()[0]; if (year) this.academicYear.set(year); const faculty = this.data.faculties()[0]?.code; if (faculty) this.fieldOfStudy.set(faculty); await this.reload(); } catch { /* error is shown by the service */ } }
  async reload(): Promise<void> { if (this.academicYear()) await this.data.loadWorkload(this.academicYear(), this.fieldOfStudy(), this.studyMode()); }
  readonly rows = computed(() => { const q = this.search().trim().toLocaleLowerCase(); const lecturerMap = new Map(this.lecturers().map(x => [x.id, x])); const subjectMap = new Map(this.data.subjects().map(x => [x.id, x])); return this.data.assignments().map(a => { const l = lecturerMap.get(a.lecturerId); const s = subjectMap.get(a.subjectId); return { subject: s?.name ?? 'Nieznany przedmiot', lecturer: l?.displayName ?? 'Nieprzypisany', title: l?.academicTitle ?? '', classType: a.classType, semester: a.semesterNumber, season: a.semesterSeason, hours: a.workloadHours }; }).filter(r => !q || r.lecturer.toLocaleLowerCase().includes(q) || r.subject.toLocaleLowerCase().includes(q)); });
  readonly groups = computed<Group[]>(() => { const map = new Map<string, Group>(); for (const row of this.rows()) { const key = this.viewMode() === 'lecturers' ? row.lecturer : row.subject; const existing = map.get(key); if (existing) { existing.rows.push(row); existing.hours += row.hours; } else map.set(key, { key, label: key, subtitle: this.viewMode() === 'lecturers' ? row.title : 'Suma obciążenia prowadzących', hours: row.hours, rows: [row] }); } return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'pl')); });
  readonly totalHours = computed(() => this.rows().reduce((sum, row) => sum + row.hours, 0)); readonly filteredTitleLecturers = computed(() => { const q = this.titleSearch().trim().toLocaleLowerCase(); return this.lecturers().filter(l => !q || l.displayName.toLocaleLowerCase().includes(q)); });
  async openTitles(): Promise<void> { try { await this.data.loadLecturers(); this.draftTitles.set(Object.fromEntries(this.lecturers().map(l => [l.id, l.academicTitle ?? '']))); this.titleSearch.set(''); this.titlesVisible.set(true); } catch { this.data.error.set('Nie udało się pobrać listy prowadzących.'); } }
  cancelTitles(): void { this.titlesVisible.set(false); } async saveTitles(): Promise<void> { await this.data.saveTitles(this.draftTitles()); this.titlesVisible.set(false); await this.reload(); }
  updateDraft(id: string, value: string): void { this.draftTitles.update(d => ({ ...d, [id]: value })); } displayTitle(l: Lecturer): string { return l.academicTitle || 'bez stopnia/tytułu'; } setView(value: ViewMode): void { this.viewMode.set(value); } tagSeverity(type: ClassType): 'info' | 'success' { return type === 'wykład' ? 'info' : 'success'; }
}
