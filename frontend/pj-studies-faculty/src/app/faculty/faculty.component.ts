import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { FacultyDataService } from './faculty-data.service';
import { ClassType, Lecturer, StudyLevel, StudyMode } from './faculty.models';

type ViewMode = 'lecturers' | 'subjects';
interface DisplayRow { subject: string; lecturer: string; title: string; classType: ClassType; semester: number; season: string; hours: number; }
interface Group { key: string; label: string; subtitle: string; hours: number; rows: DisplayRow[]; }

@Component({selector:'app-faculty', standalone:true, imports:[CommonModule,FormsModule,ButtonModule,DialogModule,InputTextModule,SelectModule,TableModule,TagModule], templateUrl:'./faculty.component.html', styleUrl:'./faculty.component.css'})
export class FacultyComponent {
  private readonly data = inject(FacultyDataService);
  readonly yearOptions = ['2026/2027','2025/2026'];
  readonly fieldOptions = ['Informatyka','Sztuka Nowych Mediów'];
  readonly levelOptions: StudyLevel[] = ['I stopień','II stopień'];
  readonly modeOptions: {label:string; value:StudyMode}[] = [{label:'Stacjonarny',value:'stacjonarny'},{label:'Niestacjonarny',value:'niestacjonarny'}];
  academicYear = signal('2026/2027'); fieldOfStudy = signal('Informatyka'); studyLevel = signal<StudyLevel>('I stopień'); studyMode = signal<StudyMode>('stacjonarny');
  search = signal(''); viewMode = signal<ViewMode>('lecturers'); titlesVisible = signal(false); titleSearch = signal(''); draftTitles = signal<Record<string,string>>({});
  lecturers = this.data.lecturers;
  readonly rows = computed(() => {
    const q = this.search().trim().toLocaleLowerCase();
    return this.data.assignments.filter(a => a.academicYear===this.academicYear() && a.fieldOfStudy===this.fieldOfStudy() && a.studyLevel===this.studyLevel() && a.studyMode===this.studyMode())
      .map(a => { const l=this.lecturers().find(x=>x.id===a.lecturerId)!; const s=this.data.subjects.find(x=>x.id===a.subjectId)!; return {subject:s.name,lecturer:`${l.firstName} ${l.lastName}`,title:l.academicTitle,classType:a.classType,semester:a.semesterNumber,season:a.semesterSeason,hours:a.workloadHours}; })
      .filter(r => !q || r.lecturer.toLocaleLowerCase().includes(q) || r.subject.toLocaleLowerCase().includes(q));
  });
  readonly groups = computed<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const row of this.rows()) { const key = this.viewMode()==='lecturers' ? row.lecturer : row.subject; const existing=map.get(key); if(existing){existing.rows.push(row);existing.hours+=row.hours;} else map.set(key,{key,label:key,subtitle:this.viewMode()==='lecturers'?row.title:'Obciążenie prowadzących',hours:row.hours,rows:[row]}); }
    return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,'pl'));
  });
  readonly totalHours = computed(()=>this.rows().reduce((sum,row)=>sum+row.hours,0));
  readonly filteredTitleLecturers = computed(()=>{const q=this.titleSearch().trim().toLocaleLowerCase(); return this.lecturers().filter(l=>!q||`${l.firstName} ${l.lastName}`.toLocaleLowerCase().includes(q));});

  openTitles(): void { this.draftTitles.set(Object.fromEntries(this.lecturers().map(l=>[l.id,l.academicTitle]))); this.titleSearch.set(''); this.titlesVisible.set(true); }
  cancelTitles(): void { this.titlesVisible.set(false); }
  saveTitles(): void { this.data.saveTitles(this.draftTitles()); this.titlesVisible.set(false); }
  updateDraft(id:string,value:string): void { this.draftTitles.update(d=>({...d,[id]:value})); }
  displayTitle(l: Lecturer): string { return l.academicTitle || 'bez stopnia/tytułu'; }
  setView(value: ViewMode): void { this.viewMode.set(value); }
  tagSeverity(type: ClassType): 'info'|'success' { return type==='wykład'?'info':'success'; }
}
