export type FieldOfStudy = 'Informatyka' | 'Sztuka Nowych Mediów';
export type StudyLevel = 'I stopień' | 'II stopień';
export type StudyMode = 'stacjonarny' | 'niestacjonarny';
export type SemesterSeason = 'zimowy' | 'letni';
export type ClassType = 'wykład' | 'ćwiczenia';
export interface Lecturer { id: string; firstName: string; lastName: string; academicTitle: string; }
export interface Subject { id: string; name: string; }
export interface TeachingAssignment { id: string; lecturerId: string; subjectId: string; academicYear: string; fieldOfStudy: FieldOfStudy; studyLevel: StudyLevel; studyMode: StudyMode; semesterNumber: number; semesterSeason: SemesterSeason; classType: ClassType; workloadHours: number; }
