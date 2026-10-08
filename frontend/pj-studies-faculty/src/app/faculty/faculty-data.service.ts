import { Injectable, signal } from '@angular/core';
import { Lecturer, Subject, TeachingAssignment } from './faculty.models';

const lecturers: Lecturer[] = [
  {id:'l1', firstName:'Anna', lastName:'Kowalska', academicTitle:'dr inż.'},
  {id:'l2', firstName:'Piotr', lastName:'Nowak', academicTitle:'prof. dr hab.'},
  {id:'l3', firstName:'Marta', lastName:'Wiśniewska', academicTitle:'dr hab. inż.'},
  {id:'l4', firstName:'Tomasz', lastName:'Zieliński', academicTitle:''},
  {id:'l5', firstName:'Julia', lastName:'Wójcik', academicTitle:'dr'},
];
const subjects: Subject[] = [
  {id:'s1', name:'Programowanie obiektowe'}, {id:'s2', name:'Bazy danych'}, {id:'s3', name:'Projekt zespołowy'},
  {id:'s4', name:'Historia sztuki nowych mediów'}, {id:'s5', name:'Interakcja człowiek–komputer'},
];
const assignments: TeachingAssignment[] = [
  {id:'a1',lecturerId:'l1',subjectId:'s1',academicYear:'2026/2027',fieldOfStudy:'Informatyka',studyLevel:'I stopień',studyMode:'stacjonarny',semesterNumber:1,semesterSeason:'zimowy',classType:'wykład',workloadHours:10},
  {id:'a2',lecturerId:'l2',subjectId:'s1',academicYear:'2026/2027',fieldOfStudy:'Informatyka',studyLevel:'I stopień',studyMode:'stacjonarny',semesterNumber:1,semesterSeason:'zimowy',classType:'wykład',workloadHours:20},
  {id:'a3',lecturerId:'l1',subjectId:'s1',academicYear:'2026/2027',fieldOfStudy:'Informatyka',studyLevel:'I stopień',studyMode:'stacjonarny',semesterNumber:1,semesterSeason:'zimowy',classType:'ćwiczenia',workloadHours:90},
  {id:'a4',lecturerId:'l3',subjectId:'s2',academicYear:'2026/2027',fieldOfStudy:'Informatyka',studyLevel:'I stopień',studyMode:'stacjonarny',semesterNumber:2,semesterSeason:'letni',classType:'wykład',workloadHours:30},
  {id:'a5',lecturerId:'l1',subjectId:'s2',academicYear:'2026/2027',fieldOfStudy:'Informatyka',studyLevel:'I stopień',studyMode:'stacjonarny',semesterNumber:2,semesterSeason:'letni',classType:'ćwiczenia',workloadHours:30},
  {id:'a6',lecturerId:'l4',subjectId:'s3',academicYear:'2026/2027',fieldOfStudy:'Informatyka',studyLevel:'II stopień',studyMode:'niestacjonarny',semesterNumber:3,semesterSeason:'zimowy',classType:'ćwiczenia',workloadHours:45},
  {id:'a7',lecturerId:'l5',subjectId:'s4',academicYear:'2026/2027',fieldOfStudy:'Sztuka Nowych Mediów',studyLevel:'I stopień',studyMode:'stacjonarny',semesterNumber:1,semesterSeason:'zimowy',classType:'wykład',workloadHours:30},
  {id:'a8',lecturerId:'l4',subjectId:'s5',academicYear:'2026/2027',fieldOfStudy:'Sztuka Nowych Mediów',studyLevel:'II stopień',studyMode:'niestacjonarny',semesterNumber:3,semesterSeason:'letni',classType:'ćwiczenia',workloadHours:60},
  {id:'a9',lecturerId:'l2',subjectId:'s1',academicYear:'2025/2026',fieldOfStudy:'Informatyka',studyLevel:'I stopień',studyMode:'stacjonarny',semesterNumber:1,semesterSeason:'zimowy',classType:'wykład',workloadHours:30},
  {id:'a10',lecturerId:'l3',subjectId:'s4',academicYear:'2025/2026',fieldOfStudy:'Sztuka Nowych Mediów',studyLevel:'I stopień',studyMode:'niestacjonarny',semesterNumber:2,semesterSeason:'letni',classType:'ćwiczenia',workloadHours:90},
];

@Injectable({providedIn:'root'})
export class FacultyDataService {
  readonly lecturers = signal(lecturers.map(x=>({...x})));
  readonly subjects = subjects.map(x=>({...x}));
  readonly assignments = assignments.map(x=>({...x}));
  saveTitles(values: Record<string,string>): void { this.lecturers.update(items=>items.map(l=>({...l, academicTitle: values[l.id] ?? l.academicTitle}))); }
}
