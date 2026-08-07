import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScheduleEntry } from '../../models/schedule.models';
import { CommentAuthorRole, ScheduleComment } from '../../models/schedule-comment.models';
import { ScheduleCommentsService } from '../../services/schedule-comments.service';

@Component({
  selector: 'app-comments-drawer',
  imports: [FormsModule],
  templateUrl: './comments-drawer.component.html',
  styleUrl: './comments-drawer.component.css',
})
export class CommentsDrawerComponent {
  readonly entry = input.required<ScheduleEntry>();
  readonly closed = output<void>();
  protected readonly commentsService = inject(ScheduleCommentsService);
  protected readonly draft = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly comments = computed(() => this.commentsService.forEntry(this.entry().id));

  protected addComment(): void {
    this.commentsService.add(this.entry().id, this.draft());
    this.draft.set('');
  }

  protected startEdit(comment: ScheduleComment): void {
    this.editingId.set(comment.id);
    this.editDraft.set(comment.body);
  }

  protected saveEdit(): void {
    const id = this.editingId();
    if (id) this.commentsService.edit(id, this.editDraft());
    this.cancelEdit();
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  protected canDelete(comment: ScheduleComment): boolean {
    return this.commentsService.isOwn(comment) || this.commentsService.isAdmin;
  }

  protected roleLabel(role: CommentAuthorRole): string {
    return role === 'admin' ? 'Administrator' : role === 'planner' ? 'Planista' : 'Wykładowca';
  }

  protected initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  }
}
