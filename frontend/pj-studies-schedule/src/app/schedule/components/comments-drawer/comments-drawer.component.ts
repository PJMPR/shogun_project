import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScheduleEntry, ScheduleGroup, formatHour } from '../../models/schedule.models';
import { CommentAuthorRole, ScheduleComment } from '../../models/schedule-comment.models';
import { ScheduleCommentsService } from '../../services/schedule-comments.service';
import { MentionInputComponent, MentionRecipient } from '../mention-input/mention-input.component';

@Component({
  selector: 'app-comments-drawer',
  imports: [FormsModule, MentionInputComponent],
  templateUrl: './comments-drawer.component.html',
  styleUrl: './comments-drawer.component.css',
})
export class CommentsDrawerComponent {
  readonly entries = input.required<ScheduleEntry[]>();
  readonly groups = input.required<ScheduleGroup[]>();
  readonly selectedEntryId = input<string | null>(null);
  readonly closed = output<void>();
  protected readonly commentsService = inject(ScheduleCommentsService);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly draft = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly draftRecipients = signal<MentionRecipient[]>([]);
  protected readonly editRecipients = signal<MentionRecipient[]>([]);
  protected readonly accordionEntries = computed(() => this.entries().filter((entry) =>
    entry.id === this.selectedEntryId() || this.commentsService.count(entry.id) > 0,
  ));

  constructor() {
    effect(() => {
      const entries = this.entries();
      const selectedId = this.selectedEntryId();
      for (const entry of entries.filter((item) => item.id === selectedId || (item.commentCount ?? 0) > 0)) {
        this.commentsService.load(entry.id);
      }
      if (selectedId) {
        this.expandedId.set(selectedId);
        queueMicrotask(() => document.getElementById(`comments-${selectedId}`)?.scrollIntoView({ block: 'nearest' }));
      }
    });
  }

  protected toggle(entryId: string): void {
    const opening = this.expandedId() !== entryId;
    this.expandedId.set(opening ? entryId : null);
    this.draft.set('');
    this.cancelEdit();
    if (opening) this.commentsService.load(entryId);
  }
  protected comments(entryId: string): ScheduleComment[] { return this.commentsService.forEntry(entryId); }
  protected threadRecipients(entryId: string): MentionRecipient[] {
    return [...new Map(this.comments(entryId).flatMap(comment => comment.recipients).map(recipient => [recipient.userId, recipient])).values()];
  }
  protected addComment(entryId: string): void { this.commentsService.add(entryId, this.draft(), this.draftRecipients().map(x => x.userId)); this.draft.set(''); this.draftRecipients.set([]); }
  protected startEdit(comment: ScheduleComment): void { this.editingId.set(comment.id); this.editDraft.set(comment.body); this.editRecipients.set(comment.recipients); }
  protected saveEdit(): void { const id = this.editingId(); if (id) this.commentsService.edit(id, this.editDraft(), this.editRecipients().map(x => x.userId)); this.cancelEdit(); }
  protected cancelEdit(): void { this.editingId.set(null); this.editDraft.set(''); this.editRecipients.set([]); }
  protected canDelete(comment: ScheduleComment): boolean { return this.commentsService.isOwn(comment) || this.commentsService.isAdmin; }
  protected roleLabel(role: CommentAuthorRole): string { return role === 'admin' ? 'Administrator' : role === 'planner' ? 'Planista' : 'Wykładowca'; }
  protected initials(name: string): string { return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
  protected bodyParts(comment: ScheduleComment): { text: string; mention: boolean }[] {
    const tokens = comment.recipients.map(recipient => `@${recipient.displayName}`).sort((a, b) => b.length - a.length);
    if (!tokens.length) return [{ text: comment.body, mention: false }];
    const tokenSet = new Set(tokens); const pattern = new RegExp(`(${tokens.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    return comment.body.split(pattern).filter(Boolean).map(text => ({ text, mention: tokenSet.has(text) }));
  }
  protected entryLabel(entry: ScheduleEntry): string {
    const code = entry.subjectCode?.trim() || entry.subjectName;
    return `${code} · ${formatHour(entry.startHour)}–${formatHour(entry.startHour + entry.durationHours)} · ${this.groupLabel(entry)}`;
  }
  private groupLabel(entry: ScheduleEntry): string {
    const names = this.groups().slice(entry.group, entry.group + (entry.groupSpan ?? 1)).map((group) => group.name);
    return names.join(', ') || `Gr. ${entry.group + 1}`;
  }
}
