import { Injectable, signal } from '@angular/core';
import { ScheduleEntry } from '../models/schedule.models';

let _nextId = 1;
const uid = (): string => String(_nextId++);

// Empty schedule — entries are added by the user
const MOCK_ENTRIES: ScheduleEntry[] = [];

@Injectable({ providedIn: 'root' })
export class MockDataService {
  readonly entries = signal<ScheduleEntry[]>(MOCK_ENTRIES);

  addEntry(entry: ScheduleEntry): void {
    this.entries.update((list) => [...list, entry]);
  }

  updateEntry(updated: ScheduleEntry): void {
    this.entries.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
  }

  removeEntry(id: string): void {
    this.entries.update((list) => list.filter((e) => e.id !== id));
  }
}
