export type StudyMode = 'stationary' | 'partTime';
export type ClassType = 'wykład' | 'ćwiczenia';
export interface Lecturer { id: string; displayName: string; email?: string; academicTitle?: string; concurrencyToken: string; }
export interface Subject { id: string; code?: string; name: string; }
export interface TeachingAssignment { lecturerId: string; subjectId: string; academicYear: string; facultyCode: string; studyLevel: string; studyMode: StudyMode; semesterNumber: number; semesterSeason: 'zimowy' | 'letni'; classType: ClassType; workloadHours: number; }
export interface FacultyFilters { academicYears: string[]; faculties: { code: string; name: string }[]; studyModes: { value: StudyMode; label: string }[]; studyLevel: string; }
export interface FacultyWorkload { lecturers: Lecturer[]; subjects: Subject[]; assignments: TeachingAssignment[]; unassignedEntryCount: number; }
