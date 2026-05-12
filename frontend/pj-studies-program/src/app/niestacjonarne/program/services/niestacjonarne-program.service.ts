import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import {
  ElectiveGroup,
  ElectiveItem,
  ElectivesOtherData,
  ElectivesSpecializationsData,
  ProgramData,
  Semester,
  Specialization,
  SpecializationItem,
  SubjectRow,
  SubjectTreeNode,
} from '../../../stacjonarne/program/models/program.models';
import { ShogunApiService } from '../../../shared/shogun-api.service';

export interface SemesterViewModel {
  semester: number;
  description: string;
  nodes: SubjectTreeNode[];
  totalEcts: number;
  totalLecture: number;
  totalTutorial: number;
  totalLab: number;
}

@Injectable({ providedIn: 'root' })
export class NiestacjonarneProgramService {
  private api = inject(ShogunApiService);

  loadAll(): Observable<SemesterViewModel[]> {
    return forkJoin({
      program: this.api.getProgramData('niestacjonarny'),
      other:   this.api.getElectivesOther('niestacjonarny'),
      spec:    this.api.getElectivesSpec('niestacjonarny'),
    }).pipe(
      map(({ program, other, spec }) => this.buildViewModels(program, other, spec))
    );
  }

  private buildViewModels(
    program: ProgramData,
    other: ElectivesOtherData,
    spec: ElectivesSpecializationsData
  ): SemesterViewModel[] {
    const groupMap = new Map<string, ElectiveGroup>();
    other.groups.forEach((g: ElectiveGroup) => groupMap.set(g.id, g));

    const specBySemesterGroup = new Map<string, { specName: string; items: SubjectRow[] }[]>();
    spec.specializations.forEach((s: Specialization) => {
      s.items.forEach((item: SpecializationItem) => {
        const key = `SPEC_${item.semester}`;
        if (!specBySemesterGroup.has(key)) specBySemesterGroup.set(key, []);
        const existing = specBySemesterGroup.get(key)!.find((x) => x.specName === s.name);
        const row: SubjectRow = {
          name: item.name, type: 'O', code: item.code,
          lecture: item.lecture, tutorial: item.tutorial ?? 0, lab: item.lab,
          form: item.form, ects: item.ects,
          syllabusFile: (item as any).syllabusFile,
          pdf: (item as any).pdf,
          docFile: (item as any).docFile,
        };
        if (existing) {
          existing.items.push(row);
        } else {
          specBySemesterGroup.get(key)!.push({ specName: s.name, items: [row] });
        }
      });
    });

    return program.semesters.map((sem: Semester) => {
      const processedGroups = new Set<string>();
      const nodes: SubjectTreeNode[] = [];

      sem.subjects.forEach((subject) => {
        if (subject.type === 'M' || !subject.electiveGroup) {
          nodes.push({
            data: {
              name: subject.name, type: 'Obowiązkowy', code: subject.code,
              lecture: subject.lecture, tutorial: subject.tutorial, lab: subject.lab,
              form: subject.form, ects: subject.ects,
              syllabusFile: (subject as any).syllabusFile,
              pdf: (subject as any).pdf,
              docFile: (subject as any).docFile,
            },
            leaf: true,
          });
          return;
        }

        const groupId = subject.electiveGroup;
        if (processedGroups.has(groupId)) return;
        processedGroups.add(groupId);

        const groupData = groupMap.get(groupId);

        if (groupId.startsWith('SPEC_')) {
          const specGroups = specBySemesterGroup.get(groupId) ?? [];
          const groupLabel = `Przedmioty specjalizacyjne (semestr ${sem.semester})`;
          const inGroup = sem.subjects.filter((s) => s.electiveGroup === groupId);
          nodes.push({
            data: {
              name: groupLabel, type: 'Obieralny', code: '-',
              lecture: inGroup.reduce((a: number, s) => a + s.lecture, 0),
              tutorial: inGroup.reduce((a: number, s) => a + s.tutorial, 0),
              lab: inGroup.reduce((a: number, s) => a + s.lab, 0),
              form: '-',
              ects: inGroup.reduce((a: number, s) => a + s.ects, 0),
              isGroup: true, electiveGroup: groupId,
            },
            children: specGroups.map((sg) => ({
              data: {
                name: sg.specName, type: 'Specjalizacja', code: '-',
                lecture: '-', tutorial: '-', lab: '-', form: '-', ects: '-', isGroup: true,
              },
              children: sg.items.map((item: SubjectRow) => ({
                data: { ...item, type: 'Obieralny specjalizacji' },
                leaf: true,
              })),
            })),
          });
        } else if (groupData && groupData.items.length > 0) {
          const inGroup = sem.subjects.filter((s) => s.electiveGroup === groupId);
          nodes.push({
            data: {
              name: groupData.label, type: 'Obieralny', code: '-',
              lecture: inGroup.reduce((a: number, s) => a + s.lecture, 0),
              tutorial: inGroup.reduce((a: number, s) => a + s.tutorial, 0),
              lab: inGroup.reduce((a: number, s) => a + s.lab, 0),
              form: '-',
              ects: inGroup.reduce((a: number, s) => a + s.ects, 0),
              isGroup: true, electiveGroup: groupId,
            },
            children: groupData.items.map((item: ElectiveItem) => ({
              data: {
                name: item.name, type: 'Obieralny', code: item.code,
                lecture: item.lecture, tutorial: item.tutorial, lab: item.lab,
                form: item.form, ects: item.ects,
                syllabusFile: (item as any).syllabusFile,
                pdf: (item as any).pdf,
                docFile: (item as any).docFile,
              },
              leaf: true,
            })),
          });
        } else {
          nodes.push({
            data: {
              name: subject.name, type: 'Obieralny', code: subject.code,
              lecture: subject.lecture, tutorial: subject.tutorial, lab: subject.lab,
              form: subject.form, ects: subject.ects, electiveGroup: groupId,
              syllabusFile: (subject as any).syllabusFile,
              pdf: (subject as any).pdf,
              docFile: (subject as any).docFile,
            },
            leaf: true,
          });
        }
      });

      return {
        semester: sem.semester,
        description: sem.description,
        nodes,
        totalEcts: sem.summary.ects,
        totalLecture: sem.summary.lecture,
        totalTutorial: sem.summary.tutorial,
        totalLab: sem.summary.lab,
      };
    });
  }
}
