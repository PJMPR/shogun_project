import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DesideratumSubject {
  id: number;
  name: string;
  code: string | null;
  trybStudiow: string;
  semester: number;
}

export interface LecturerDesideratum {
  id: number;
  lecturerFirstName: string;
  lecturerLastName: string;
  semesterType: string;
  academicYear: string;
  subjects: DesideratumSubject[];
}

export interface DesideratumOption extends DesideratumSubject {
  assignmentId: number;
  lecturerName: string;
  semesterType: string;
  academicYear: string;
}

@Injectable({ providedIn: 'root' })
export class LecturerDesiderataService {
  private readonly http = inject(HttpClient);
  private loaded = false;

  readonly items = signal<LecturerDesideratum[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    if (this.loaded || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<LecturerDesideratum[]>(`${environment.assignmentsApiBaseUrl}/api/v1/assignments/lecturers`)
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loaded = true;
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Nie udało się pobrać dezyderatów wykładowców.');
          this.loading.set(false);
        },
      });
  }
}
