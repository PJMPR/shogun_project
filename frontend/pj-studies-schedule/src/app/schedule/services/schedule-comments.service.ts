import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommentAuthor, CommentAuthorRole, ScheduleComment } from '../models/schedule-comment.models';
import { MockDataService } from './mock-data.service';

interface ApiComment {
  id: string; scheduleEntryId: string; body: string; authorUserId?: string; authorEmail?: string; authorDisplayName: string;
  authorRole: CommentAuthorRole; createdAt: string; updatedAt?: string; canEdit: boolean; canDelete: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScheduleCommentsService {
  private readonly http = inject(HttpClient);
  private readonly schedules = inject(MockDataService);
  private readonly base = `${environment.scheduleApiBaseUrl}/api/v1`;
  private loadedEntryId: string | null = null;
  readonly comments = signal<ScheduleComment[]>([]);
  readonly currentAuthor = this.readCurrentAuthor();
  readonly isAdmin = this.currentAuthor.role === 'admin';

  load(entryId: string): void {
    this.loadedEntryId = entryId;
    this.http.get<ApiComment[]>(`${this.base}/entries/${entryId}/comments`).subscribe({
      next: (items) => this.comments.set(items.map(this.map)), error: () => this.comments.set([]),
    });
  }
  forEntry(entryId: string): ScheduleComment[] { return this.loadedEntryId === entryId ? this.comments() : []; }
  count(entryId: string): number { return this.loadedEntryId === entryId ? this.comments().length : (this.schedules.entries().find((e) => e.id === entryId)?.commentCount ?? 0); }
  add(entryId: string, body: string): void {
    const trimmed = body.trim(); if (!trimmed) return;
    this.http.post<ApiComment>(`${this.base}/entries/${entryId}/comments`, { body: trimmed }).subscribe((item) => this.comments.update((list) => [...list, this.map(item)]));
  }
  edit(id: string, body: string): void {
    const trimmed = body.trim(); if (!trimmed) return;
    this.http.put<ApiComment>(`${this.base}/comments/${id}`, { body: trimmed }).subscribe((item) => this.comments.update((list) => list.map((comment) => comment.id === id ? this.map(item) : comment)));
  }
  remove(id: string): void { this.http.delete(`${this.base}/comments/${id}`).subscribe(() => this.comments.update((list) => list.filter((item) => item.id !== id))); }
  removeForEntry(_entryId: string): void { /* komentarze usuwa kaskadowo backend po zapisaniu planu */ }
  isOwn(comment: ScheduleComment): boolean { return comment.author.id === this.currentAuthor.id; }

  private readonly map = (item: ApiComment): ScheduleComment => ({
    id: item.id, entryId: item.scheduleEntryId, body: item.body,
    author: { id: item.authorUserId ?? '', email: item.authorEmail ?? '', name: item.authorDisplayName, role: item.authorRole },
    createdAt: item.createdAt, updatedAt: item.updatedAt,
  });
  private readCurrentAuthor(): CommentAuthor {
    let profile = { userId: '', firstName: '', lastName: '', email: '' }; let roles: string[] = [];
    try { profile = JSON.parse(sessionStorage.getItem('shogun_user_profile') ?? JSON.stringify(profile)); } catch { /* fallback */ }
    try { roles = JSON.parse(sessionStorage.getItem('shogun_roles') ?? '[]'); } catch { /* fallback */ }
    const role: CommentAuthorRole = roles.includes('admin') ? 'admin' : 'planner';
    return { id: profile.userId || 'current-user', email: profile.email, name: `${profile.firstName} ${profile.lastName}`.trim() || 'Bieżący użytkownik', role };
  }
}
