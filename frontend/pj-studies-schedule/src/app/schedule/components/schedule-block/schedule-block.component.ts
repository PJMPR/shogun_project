import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ScheduleEntry, ScheduleLecturerOption, formatHour } from '../../models/schedule.models';

@Component({
  selector: 'app-schedule-block',
  imports: [FormsModule, SelectModule],
  template: `
    @if (entry(); as e) {
      <div
        class="block"
        [class.conflict]="hasConflict()"
        [style.--block-color]="e.color ?? colors[0]"
        (click)="clicked.emit(e.id)"
      >
        <button
          type="button"
          class="color-button pi pi-palette"
          title="Wybierz kolor"
          aria-label="Wybierz kolor bloku"
          (click)="togglePalette($event)"
        ></button>
        <button
          type="button"
          class="comments-button pi pi-comments"
          title="Otwórz komentarze"
          aria-label="Otwórz komentarze"
          (click)="openComments($event, e.id)"
        >
          @if (commentCount() > 0) { <span class="comment-badge">{{ commentCount() }}</span> }
        </button>
        @if (paletteOpen()) {
          <div class="color-palette" role="listbox" aria-label="Kolor bloku" (click)="$event.stopPropagation()">
            @for (color of colors; track color) {
              <button
                type="button"
                class="color-swatch"
                role="option"
                [class.selected]="(e.color ?? colors[0]) === color"
                [attr.aria-selected]="(e.color ?? colors[0]) === color"
                [style.background]="color"
                (click)="selectColor($event, e.id, color)"
              ></button>
            }
          </div>
        }
        <div class="block-subject" [title]="e.subjectName">
          {{ compactLabels() ? (e.subjectCode || e.subjectName) : e.subjectName }}
        </div>
        @if (editingLecturer()) {
          <p-select
            class="lecturer-select"
            [options]="lecturerOptions()"
            [ngModel]="lecturerKey(e)"
            optionLabel="name"
            optionValue="key"
            appendTo="body"
            placeholder="Wybierz wykładowcę"
            (click)="$event.stopPropagation()"
            (pointerdown)="$event.stopPropagation()"
            (onChange)="selectLecturer($event, e.id)"
            (onHide)="editingLecturer.set(false)"
          />
        } @else {
          <button type="button" class="block-meta lecturer-button" [title]="e.lecturerName || 'Wybierz wykładowcę'" (click)="startLecturerEdit($event)">
            {{ compactLabels() ? initials(e.lecturerName) : (e.lecturerName || 'Wybierz wykładowcę') }}
            @if (hasAvailabilityWarning()) {
              <span class="pi pi-exclamation-triangle availability-warning" title="Termin poza zadeklarowaną dostępnością prowadzącego"></span>
            }
          </button>
        }
        @if (e.room) {
          @if (editingRoom()) {
            <input
              #roomInput
              class="room-input"
              [value]="roomDraft()"
              placeholder="Wyczyść, aby usunąć"
              aria-label="Sala"
              (input)="roomDraft.set(roomInput.value)"
              (click)="$event.stopPropagation()"
              (pointerdown)="$event.stopPropagation()"
              (keydown.enter)="saveRoom($event, e.id)"
              (keydown.escape)="cancelRoomEdit($event)"
              (blur)="saveRoom($event, e.id)"
            />
          } @else {
            <button
              type="button"
              class="block-meta room-button"
              title="Kliknij, aby zmienić salę"
              (click)="startRoomEdit($event, e.room)"
            ><span class="pi pi-map-marker"></span> {{ e.room }}</button>
          }
        }
        <div class="block-time">{{ fmt(e.startHour) }} – {{ fmt(e.startHour + e.durationHours) }}</div>
      </div>
    }
  `,
  styleUrl: './schedule-block.component.css',
})
export class ScheduleBlockComponent {
  readonly entry = input<ScheduleEntry>();
  readonly hasConflict = input<boolean>(false);
  readonly hasAvailabilityWarning = input<boolean>(false);
  readonly commentCount = input(0);
  readonly compactLabels = input(false);
  readonly lecturerOptions = input<ScheduleLecturerOption[]>([]);
  readonly clicked = output<string>();
  readonly colorChanged = output<{ id: string; color: string }>();
  readonly commentsClicked = output<string>();
  readonly roomChanged = output<{ id: string; room: string }>();
  readonly lecturerChanged = output<{ id: string; lecturer: ScheduleLecturerOption }>();

  protected readonly paletteOpen = signal(false);
  protected readonly editingRoom = signal(false);
  protected readonly editingLecturer = signal(false);
  protected readonly roomDraft = signal('');
  protected readonly colors = [
    '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6',
    '#22c55e', '#84cc16', '#eab308', '#f59e0b',
    '#f97316', '#ef4444', '#ec4899', '#d946ef',
    '#a855f7', '#8b5cf6', '#64748b', '#78716c',
  ];

  protected readonly fmt = formatHour;

  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .filter((part) => part && !/^(mgr|inż\.?|inz\.?|dr|hab\.?|prof\.?|lic\.?|lek\.?|doc\.?)$/i.test(part))
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('pl-PL');
  }

  protected togglePalette(event: MouseEvent): void {
    event.stopPropagation();
    this.paletteOpen.update((open) => !open);
  }

  protected openComments(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.commentsClicked.emit(id);
  }

  protected startLecturerEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.editingLecturer.set(true);
  }

  protected selectLecturer(event: { value: string }, id: string): void {
    const lecturer = this.lecturerOptions().find((item) => item.key === event.value);
    if (lecturer) this.lecturerChanged.emit({ id, lecturer });
    this.editingLecturer.set(false);
  }

  protected lecturerKey(entry: ScheduleEntry): string {
    return (entry.lecturerUserId || entry.lecturerEmail || entry.lecturerName).trim().toLocaleLowerCase('pl-PL');
  }

  protected startRoomEdit(event: MouseEvent, room: string): void {
    event.stopPropagation();
    this.roomDraft.set(room);
    this.editingRoom.set(true);
    queueMicrotask(() => {
      const input = (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLInputElement>('.room-input');
      input?.focus();
      input?.select();
    });
  }

  protected saveRoom(event: Event, id: string): void {
    event.stopPropagation();
    if (!this.editingRoom()) return;
    const room = this.roomDraft().trim();
    this.editingRoom.set(false);
    this.roomChanged.emit({ id, room });
  }

  protected cancelRoomEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.editingRoom.set(false);
  }

  protected selectColor(event: MouseEvent, id: string, color: string): void {
    event.stopPropagation();
    this.colorChanged.emit({ id, color });
    this.paletteOpen.set(false);
  }
}
