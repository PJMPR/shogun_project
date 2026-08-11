import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
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
  private readonly commentsByEntry = signal<Record<string, ScheduleComment[]>>({});
  readonly comments = computed(() => Object.values(this.commentsByEntry()).flat());
  readonly currentAuthor = this.readCurrentAuthor();
  readonly isAdmin = this.currentAuthor.role === 'admin';

  load(entryId: string): void {
    this.http.get<ApiComment[]>(`${this.base}/entries/${entryId}/comments`).subscribe({
      next: (items) => this.setForEntry(entryId, items.map(this.map)), error: () => this.setForEntry(entryId, []),
    });
  }
  forEntry(entryId: string): ScheduleComment[] { return this.commentsByEntry()[entryId] ?? []; }
  count(entryId: string): number { return this.commentsByEntry()[entryId]?.length ?? (this.schedules.entries().find((e) => e.id === entryId)?.commentCount ?? 0); }
  add(entryId: string, body: string): void {
    const trimmed = body.trim(); if (!trimmed) return;
    this.http.post<ApiComment>(`${this.base}/entries/${entryId}/comments`, { body: trimmed }).subscribe((item) =>
      this.commentsByEntry.update((all) => ({ ...all, [entryId]: [...(all[entryId] ?? []), this.map(item)] })));
  }
  edit(id: string, body: string): void {
    const trimmed = body.trim(); if (!trimmed) return;
    this.http.put<ApiComment>(`${this.base}/comments/${id}`, { body: trimmed }).subscribe((item) => this.replaceComment(this.map(item)));
  }
  remove(id: string): void { this.http.delete(`${this.base}/comments/${id}`).subscribe(() => this.commentsByEntry.update((all) => Object.fromEntries(Object.entries(all).map(([entryId, list]) => [entryId, list.filter((item) => item.id !== id)])))); }
  removeForEntry(entryId: string): void { this.commentsByEntry.update((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== entryId))); }
  clear(): void { this.commentsByEntry.set({}); }
  isOwn(comment: ScheduleComment): boolean { return comment.author.id === this.currentAuthor.id; }

  private readonly map = (item: ApiComment): ScheduleComment => ({
    id: item.id, entryId: item.scheduleEntryId, body: item.body,
    author: { id: item.authorUserId ?? '', email: item.authorEmail ?? '', name: item.authorDisplayName, role: item.authorRole },
    createdAt: item.createdAt, updatedAt: item.updatedAt,
  });
  private setForEntry(entryId: string, comments: ScheduleComment[]): void {
    this.commentsByEntry.update((all) => ({ ...all, [entryId]: comments }));
  }
  private replaceComment(comment: ScheduleComment): void {
    this.commentsByEntry.update((all) => ({
      ...all,
      [comment.entryId]: (all[comment.entryId] ?? []).map((item) => item.id === comment.id ? comment : item),
    }));
  }
  private readCurrentAuthor(): CommentAuthor {
    let profile = { userId: '', firstName: '', lastName: '', email: '' }; let roles: string[] = [];
    try { profile = JSON.parse(sessionStorage.getItem('shogun_user_profile') ?? JSON.stringify(profile)); } catch { /* fallback */ }
    try { roles = JSON.parse(sessionStorage.getItem('shogun_roles') ?? '[]'); } catch { /* fallback */ }
    const role: CommentAuthorRole = roles.includes('admin') ? 'admin' : 'planner';
    return { id: profile.userId || 'current-user', email: profile.email, name: `${profile.firstName} ${profile.lastName}`.trim() || 'Bieżący użytkownik', role };
  }
}
