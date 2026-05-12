import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import {
  ElectiveGroup,
  ElectivesOtherData,
  ElectivesSpecializationsData,
  ProgramData,
  Semester,
  Specialization,
  SubjectRow,
  SubjectTreeNode,
} from '../models/program.models';
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
export class ProgramService {
  private api = inject(ShogunApiService);

  loadAll(): Observable<SemesterViewModel[]> {
    return forkJoin({
      program: this.api.getProgramData('stacjonarny'),
      other:   this.api.getElectivesOther('stacjonarny'),
      spec:    this.api.getElectivesSpec('stacjonarny'),
    }).pipe(
      map(({ program, other, spec }) => this.buildViewModels(program, other, spec))
    );
  }

  private buildViewModels(
    program: ProgramData,
    other: ElectivesOtherData,
    spec: ElectivesSpecializationsData
  ): SemesterViewModel[] {
    // Build lookup: groupId -> ElectiveGroup
    const groupMap = new Map<string, ElectiveGroup>();
    other.groups.forEach((g) => groupMap.set(g.id, g));

    // Build lookup: groupId -> specialization subject list per semester
    // SPEC_5, SPEC_6, SPEC_7 – specializations grouped per semester
    const specBySemesterGroup = new Map<string, { specName: string; items: SubjectRow[] }[]>();
    spec.specializations.forEach((s: Specialization) => {
      s.items.forEach((item) => {
        const key = `SPEC_${item.semester}`;
        if (!specBySemesterGroup.has(key)) specBySemesterGroup.set(key, []);
        const existing = specBySemesterGroup.get(key)!.find((x) => x.specName === s.name);
        const row: SubjectRow = {
          name: item.name,
          type: 'O',
          code: item.code,
          lecture: item.lecture,
          tutorial: item.tutorial,
          lab: item.lab,
          form: item.form,
          ects: item.ects,
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
      // Track processed electiveGroups to merge duplicates
      const processedGroups = new Set<string>();
      const nodes: SubjectTreeNode[] = [];

      sem.subjects.forEach((subject) => {
        if (subject.type === 'M' || !subject.electiveGroup) {
          // Regular mandatory subject
          nodes.push({
            data: {
              name: subject.name,
              type: 'Obowiązkowy',
              code: subject.code,
              lecture: subject.lecture,
              tutorial: subject.tutorial,
              lab: subject.lab,
              form: subject.form,
              ects: subject.ects,
              syllabusFile: (subject as any).syllabusFile,
              pdf: (subject as any).pdf,
              docFile: (subject as any).docFile,
            },
            leaf: true,
          });
          return;
        }

        const groupId = subject.electiveGroup;

        if (processedGroups.has(groupId)) {
          // Already added as group node
          return;
        }
        processedGroups.add(groupId);

        // Build group node
        const groupData = groupMap.get(groupId);

        if (groupId.startsWith('SPEC_')) {
          // Specialization group – children are sub-specializations
          const specGroups = specBySemesterGroup.get(groupId) ?? [];
          const groupLabel = `Przedmioty specjalizacyjne (semestr ${sem.semester})`;

          // Find all subjects with this electiveGroup in the semester to compute totals
          const semSubjectsInGroup = sem.subjects.filter((s) => s.electiveGroup === groupId);
          const totalLecture = semSubjectsInGroup.reduce((a, s) => a + s.lecture, 0);
          const totalTutorial = semSubjectsInGroup.reduce((a, s) => a + s.tutorial, 0);
          const totalLab = semSubjectsInGroup.reduce((a, s) => a + s.lab, 0);
          const totalEcts = semSubjectsInGroup.reduce((a, s) => a + s.ects, 0);

          const groupNode: SubjectTreeNode = {
            data: {
              name: groupLabel,
              type: 'Obieralny',
              code: '-',
              lecture: totalLecture,
              tutorial: totalTutorial,
              lab: totalLab,
              form: '-',
              ects: totalEcts,
              isGroup: true,
              electiveGroup: groupId,
            },
            children: specGroups.map((sg) => ({
              data: {
                name: sg.specName,
                type: 'Specjalizacja',
                code: '-',
                lecture: '-',
                tutorial: '-',
                lab: '-',
                form: '-',
                ects: '-',
                isGroup: true,
              },
              children: sg.items.map((item) => ({
                data: { ...item, type: 'Obieralny specjalizacji' },
                leaf: true,
              })),
            })),
          };
          nodes.push(groupNode);
        } else if (groupData && groupData.items.length > 0) {
          // Other elective group with choices
          const semSubjectsInGroup = sem.subjects.filter((s) => s.electiveGroup === groupId);
          const totalLecture = semSubjectsInGroup.reduce((a, s) => a + s.lecture, 0);
          const totalTutorial = semSubjectsInGroup.reduce((a, s) => a + s.tutorial, 0);
          const totalLab = semSubjectsInGroup.reduce((a, s) => a + s.lab, 0);
          const totalEcts = semSubjectsInGroup.reduce((a, s) => a + s.ects, 0);

          const groupNode: SubjectTreeNode = {
            data: {
              name: groupData.label,
              type: 'Obieralny',
              code: '-',
              lecture: totalLecture,
              tutorial: totalTutorial,
              lab: totalLab,
              form: '-',
              ects: totalEcts,
              isGroup: true,
              electiveGroup: groupId,
            },
            children: groupData.items.map((item) => ({
              data: {
                name: item.name,
                type: 'Obieralny',
                code: item.code,
                lecture: item.lecture,
                tutorial: item.tutorial,
                lab: item.lab,
                form: item.form,
                ects: item.ects,
                syllabusFile: (item as any).syllabusFile,
                pdf: (item as any).pdf,
                docFile: (item as any).docFile,
              },
              leaf: true,
            })),
          };
          nodes.push(groupNode);
        } else {
          // Single elective without sub-choices (e.g. Lektorat, PSEM, PRZ1, PRZ2)
          nodes.push({
            data: {
              name: subject.name,
              type: 'Obieralny',
              code: subject.code,
              lecture: subject.lecture,
              tutorial: subject.tutorial,
              lab: subject.lab,
              form: subject.form,
              ects: subject.ects,
              electiveGroup: groupId,
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

