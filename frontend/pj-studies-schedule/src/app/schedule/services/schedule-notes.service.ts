import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScheduleNote { id: string; scheduleId: string; title?: string; body: string; authorUserId?: string; authorDisplayName: string; authorRole: string; createdAt: string; updatedAt?: string; canEdit: boolean; canDelete: boolean; recipients: {userId:string;displayName:string;email?:string|null}[] }

@Injectable({ providedIn: 'root' })
export class ScheduleNotesService {
  private readonly http = inject(HttpClient); private readonly base = `${environment.scheduleApiBaseUrl}/api/v1`;
  readonly notes = signal<ScheduleNote[]>([]); readonly loading = signal(false);
  async load(scheduleId: string): Promise<void> { this.loading.set(true); try { this.notes.set(await firstValueFrom(this.http.get<ScheduleNote[]>(`${this.base}/schedules/${scheduleId}/notes`))); } finally { this.loading.set(false); } }
  async add(scheduleId: string, body: string, title?: string, mentionedUserIds:string[]=[]): Promise<void> { const note = await firstValueFrom(this.http.post<ScheduleNote>(`${this.base}/schedules/${scheduleId}/notes`, { body, title: title || null, mentionedUserIds })); this.notes.update((items) => [...items, note]); }
  async edit(id: string, body: string, title?: string, mentionedUserIds:string[]=[]): Promise<void> { const note = await firstValueFrom(this.http.put<ScheduleNote>(`${this.base}/notes/${id}`, { body, title: title || null, mentionedUserIds })); this.notes.update((items) => items.map((x) => x.id === id ? note : x)); }
  async remove(id: string): Promise<void> { await firstValueFrom(this.http.delete(`${this.base}/notes/${id}`)); this.notes.update((items) => items.filter((x) => x.id !== id)); }
}
