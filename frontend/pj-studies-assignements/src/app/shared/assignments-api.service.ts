import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, EMPTY, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateAssignmentSubjectPayload {
  mongoId: string | null;
  name: string;
  code: string | null;
  trybStudiow: string;
  semester: number;
  hasWyklad: boolean;
  hasCwiczenia: boolean;
  hasLab: boolean;
}

export interface CreateAssignmentAvailabilityPayload {
  day: string;
  from: string;
  to: string;
}

export interface CreateAssignmentPayload {
  semesterType: string;
  academicYear: string;
  notes: string | null;
  subjects: CreateAssignmentSubjectPayload[];
  availability: CreateAssignmentAvailabilityPayload[];
}

export interface AssignmentSubjectResponse {
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

export interface AssignmentAvailabilityResponse {
  id: number;
  day: string;
  from: string;
  to: string;
}

export interface AssignmentResponse {
  id: number;
  lecturerFirstName: string;
  lecturerLastName: string;
  lecturerEmail: string;
  semesterType: string;
  academicYear: string;
  notes: string | null;
  submittedAt: string;
  subjects: AssignmentSubjectResponse[];
  availability: AssignmentAvailabilityResponse[];
}

@Injectable({ providedIn: 'root' })
export class AssignmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.assignmentsApiBaseUrl;

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);

  getMyAssignments() {
    return this.http.get<AssignmentResponse[]>(`${this.base}/api/v1/assignments/me`);
  }

  submit(payload: CreateAssignmentPayload) {
    this.submitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(false);

    return this.http.post(`${this.base}/api/v1/assignments`, payload).pipe(
      tap(() => {
        this.submitting.set(false);
        this.submitSuccess.set(true);
      }),
      catchError(err => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.title ?? err?.message ?? 'Błąd podczas wysyłania zgłoszenia.');
        return EMPTY;
      }),
    );
  }
}
