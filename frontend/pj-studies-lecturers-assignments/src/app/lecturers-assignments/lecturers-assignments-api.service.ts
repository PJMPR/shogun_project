import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface LecturerSubjectDto {
  id: number;
  mongoId: string | null;
  name: string;
  code: string | null;
  trybStudiow: string;
  semester: number;
  hasWyklad: boolean;
  hasCwiczenia: boolean;
  hasLab: boolean;
}

export interface LecturerAvailabilityDto {
  id: number;
  day: string;
  from: string;
  to: string;
}

export interface LecturerAssignmentDto {
  id: number;
  lecturerFirstName: string;
  lecturerLastName: string;
  lecturerUserId: string | null;
  lecturerEmail: string | null;
  semesterType: string;
  academicYear: string;
  notes: string | null;
  submittedAt: string;
  subjects: LecturerSubjectDto[];
  availability: LecturerAvailabilityDto[];
}

@Injectable({ providedIn: 'root' })
export class LecturersAssignmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.assignmentsApiBaseUrl;

  getLatestPerLecturer() {
    return this.http.get<LecturerAssignmentDto[]>(`${this.base}/api/v1/assignments/lecturers`);
  }
}
