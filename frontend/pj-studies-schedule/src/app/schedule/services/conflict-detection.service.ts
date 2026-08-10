import { Injectable } from '@angular/core';
import { ConflictInfo, ScheduleEntry, semesterTypeOf } from '../models/schedule.models';

function overlaps(a: ScheduleEntry, b: ScheduleEntry): boolean {
  return a.startHour < b.startHour + b.durationHours && b.startHour < a.startHour + a.durationHours;
}

function addConflict(
  map: Map<string, ConflictInfo>,
  id: string,
  otherId: string,
  reason: 'room' | 'lecturer',
): void {
  if (!map.has(id)) {
    map.set(id, { entryId: id, conflictsWith: [], reason });
  }
  const info = map.get(id)!;
  if (!info.conflictsWith.includes(otherId)) {
    info.conflictsWith.push(otherId);
  }
}

@Injectable({ providedIn: 'root' })
export class ConflictDetectionService {
  detectConflicts(entries: ScheduleEntry[]): ConflictInfo[] {
    const result = new Map<string, ConflictInfo>();

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];

        if (
          a.dayOfWeek !== b.dayOfWeek ||
          a.academicYear !== b.academicYear ||
          semesterTypeOf(a.semesterNumber) !== semesterTypeOf(b.semesterNumber)
        ) {
          continue;
        }

        if (!overlaps(a, b)) continue;

        const lecturerA = (a.lecturerUserId || a.lecturerEmail || a.lecturerName).trim().toLocaleLowerCase('pl-PL');
        const lecturerB = (b.lecturerUserId || b.lecturerEmail || b.lecturerName).trim().toLocaleLowerCase('pl-PL');
        const roomA = a.room.trim().toLocaleLowerCase('pl-PL');
        const roomB = b.room.trim().toLocaleLowerCase('pl-PL');

        if (roomA && roomA === roomB) {
          addConflict(result, a.id, b.id, 'room');
          addConflict(result, b.id, a.id, 'room');
        }
        if (lecturerA && lecturerA === lecturerB) {
          addConflict(result, a.id, b.id, 'lecturer');
          addConflict(result, b.id, a.id, 'lecturer');
        }
      }
    }

    return Array.from(result.values());
  }
}
