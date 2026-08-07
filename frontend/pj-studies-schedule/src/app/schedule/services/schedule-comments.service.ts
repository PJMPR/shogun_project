import { Injectable, signal } from '@angular/core';
import { CommentAuthor, CommentAuthorRole, ScheduleComment } from '../models/schedule-comment.models';

const STORAGE_KEY = 'shogun_schedule_comments_v1';
const DEMO_SEEDED_KEY = 'shogun_schedule_comment_demo_entries_v1';
const PROFILE_KEY = 'shogun_user_profile';
const ROLES_KEY = 'shogun_roles';

@Injectable({ providedIn: 'root' })
export class ScheduleCommentsService {
  readonly comments = signal<ScheduleComment[]>(this.readComments());
  readonly currentAuthor = this.readCurrentAuthor();
  readonly isAdmin = this.currentAuthor.role === 'admin';

  forEntry(entryId: string): ScheduleComment[] {
    return this.comments()
      .filter((comment) => comment.entryId === entryId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  count(entryId: string): number {
    return this.comments().filter((comment) => comment.entryId === entryId).length;
  }

  ensureDemoComments(entryId: string): void {
    const seeded = this.readSeededEntries();
    if (this.count(entryId) > 0 || seeded.includes(entryId)) return;
    const now = Date.now();
    this.update([
      ...this.comments(),
      {
        id: crypto.randomUUID(),
        entryId,
        body: 'Czy możemy przesunąć te zajęcia o 30 minut później?',
        author: { id: 'demo-lecturer', name: 'dr Anna Kowalska', email: 'anna.kowalska@example.edu', role: 'lecturer' },
        createdAt: new Date(now - 52 * 60_000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        entryId,
        body: 'Sprawdzę dostępność sali i pozostałych grup.',
        author: { id: 'demo-planner', name: 'Marek Nowak', email: 'marek.nowak@example.edu', role: 'planner' },
        createdAt: new Date(now - 31 * 60_000).toISOString(),
      },
    ]);
    localStorage.setItem(DEMO_SEEDED_KEY, JSON.stringify([...seeded, entryId]));
  }

  add(entryId: string, body: string): void {
    const trimmed = body.trim();
    if (!trimmed) return;
    this.update([...this.comments(), {
      id: crypto.randomUUID(), entryId, body: trimmed, author: this.currentAuthor,
      createdAt: new Date().toISOString(),
    }]);
  }

  edit(id: string, body: string): void {
    const trimmed = body.trim();
    if (!trimmed) return;
    this.update(this.comments().map((comment) =>
      comment.id === id && this.isOwn(comment)
        ? { ...comment, body: trimmed, updatedAt: new Date().toISOString() }
        : comment,
    ));
  }

  remove(id: string): void {
    const comment = this.comments().find((item) => item.id === id);
    if (comment && (this.isOwn(comment) || this.isAdmin)) {
      this.update(this.comments().filter((item) => item.id !== id));
    }
  }

  removeForEntry(entryId: string): void {
    this.update(this.comments().filter((comment) => comment.entryId !== entryId));
  }

  isOwn(comment: ScheduleComment): boolean {
    return comment.author.id === this.currentAuthor.id;
  }

  private update(comments: ScheduleComment[]): void {
    this.comments.set(comments);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  }

  private readComments(): ScheduleComment[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ScheduleComment[]; }
    catch { return []; }
  }

  private readSeededEntries(): string[] {
    try { return JSON.parse(localStorage.getItem(DEMO_SEEDED_KEY) ?? '[]') as string[]; }
    catch { return []; }
  }

  private readCurrentAuthor(): CommentAuthor {
    let profile = { firstName: '', lastName: '', email: '' };
    let roles: string[] = [];
    try { profile = JSON.parse(sessionStorage.getItem(PROFILE_KEY) ?? JSON.stringify(profile)); } catch { /* fallback */ }
    try { roles = JSON.parse(sessionStorage.getItem(ROLES_KEY) ?? '[]'); } catch { /* fallback */ }
    const role: CommentAuthorRole = roles.includes('admin') ? 'admin' : roles.includes('planner') ? 'planner' : 'lecturer';
    const name = `${profile.firstName} ${profile.lastName}`.trim() || 'Bieżący użytkownik';
    return { id: profile.email || 'current-user', name, email: profile.email, role };
  }
}
