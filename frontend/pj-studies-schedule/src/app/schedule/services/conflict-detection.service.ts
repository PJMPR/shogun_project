import { Injectable } from '@angular/core';
import { ConflictInfo, ScheduleEntry } from '../models/schedule.models';

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
          a.studyMode !== b.studyMode ||
          a.dayOfWeek !== b.dayOfWeek ||
          a.semesterNumber !== b.semesterNumber ||
          a.academicYear !== b.academicYear
        ) {
          continue;
        }

        if (!overlaps(a, b)) continue;

        if (a.room === b.room) {
          addConflict(result, a.id, b.id, 'room');
          addConflict(result, b.id, a.id, 'room');
        }
        if (a.lecturerName === b.lecturerName) {
          addConflict(result, a.id, b.id, 'lecturer');
          addConflict(result, b.id, a.id, 'lecturer');
        }
      }
    }

    return Array.from(result.values());
  }
}
