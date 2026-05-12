import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, shareReplay } from 'rxjs';

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
import { ShogunApiService } from '../shared/shogun-api.service';

export interface SemesterViewModel {
  semester: number;
  description: string;
  nodes: SubjectTreeNode[];
  totalEcts: number;
  totalLecture: number;
  totalTutorial: number;
  totalLab: number;
}

export interface SemesterConfig {
  semestr: number;
  program: 'nowy' | 'stary';
  rocznik_wprowadzenia: number;
}

interface LoadedProgramSet {
  program: ProgramData;
  other: ElectivesOtherData;
  spec: ElectivesSpecializationsData;
  syllabusBasePath: string;
}

@Injectable({ providedIn: 'root' })
export class ObsadyService {
  private api = inject(ShogunApiService);

  private cache = new Map<string, Observable<LoadedProgramSet>>();

  private loadProgramSet(
    program: 'nowy' | 'stary',
    tryb: 'stacjonarny' | 'niestacjonarny'
  ): Observable<LoadedProgramSet> {
    const cacheKey = `${program}:${tryb}`;
    if (!this.cache.has(cacheKey)) {
      const isStary = program === 'stary';
      const obs = forkJoin({
        prog:  this.api.getProgramData(tryb, isStary),
        other: this.api.getElectivesOther(tryb, isStary),
        spec:  this.api.getElectivesSpec(tryb, isStary),
      }).pipe(
        map(({ prog, other, spec }) => ({
          program: prog,
          other,
          spec,
          syllabusBasePath: '',
        })),
        shareReplay(1)
      );
      this.cache.set(cacheKey, obs);
    }
    return this.cache.get(cacheKey)!;
  }

  loadSemestry(
    semestryConfig: SemesterConfig[],
    trybStudiow: 'stacjonarny' | 'niestacjonarny'
  ): Observable<SemesterViewModel[]> {
    if (semestryConfig.length === 0) {
      return of([]);
    }

    const uniquePrograms = [...new Set(semestryConfig.map(s => s.program))] as ('nowy' | 'stary')[];
    const loadRequests: Record<string, Observable<LoadedProgramSet>> = {};
    for (const prog of uniquePrograms) {
      loadRequests[prog] = this.loadProgramSet(prog, trybStudiow);
    }

    return forkJoin(loadRequests).pipe(
      map((loadedSets) => {
        return semestryConfig
          .map((semConfig) => {
            const set = loadedSets[semConfig.program];
            return this.buildSemesterViewModel(semConfig.semestr, set);
          })
          .filter((vm): vm is SemesterViewModel => vm !== null);
      })
    );
  }

  private buildSemesterViewModel(
    semesterNumber: number,
    set: LoadedProgramSet
  ): SemesterViewModel | null {
    const sem = set.program.semesters.find(s => s.semester === semesterNumber);
    if (!sem) return null;

    const nodes = this.buildNodes(sem, set.other, set.spec, set.syllabusBasePath);
    return {
      semester: sem.semester,
      description: sem.description,
      nodes,
      totalEcts: sem.summary.ects,
      totalLecture: sem.summary.lecture,
      totalTutorial: sem.summary.tutorial,
      totalLab: sem.summary.lab,
    };
  }

  private buildNodes(
    sem: Semester,
    other: ElectivesOtherData,
    spec: ElectivesSpecializationsData,
    syllabusBasePath: string
  ): SubjectTreeNode[] {
    const groupMap = new Map<string, ElectiveGroup>();
    other.groups.forEach((g) => groupMap.set(g.id, g));

    const specBySemesterGroup = new Map<string, { specName: string; items: SubjectRow[] }[]>();
    spec.specializations.forEach((s: Specialization) => {
      s.items.forEach((item) => {
        const key = `SPEC_${item.semester}`;
        if (!specBySemesterGroup.has(key)) specBySemesterGroup.set(key, []);
        const existing = specBySemesterGroup.get(key)!.find((x) => x.specName === s.name);
        const itemSylFile = this.resolveSyllabusFile(
          (item as any).syllabusFile,
          item.code,
          syllabusBasePath
        );
        const row: SubjectRow = {
          name: item.name,
          type: 'O',
          code: item.code,
          lecture: item.lecture,
          tutorial: item.tutorial,
          lab: item.lab,
          form: item.form,
          ects: item.ects,
          syllabusFile: itemSylFile,
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

    const processedGroups = new Set<string>();
    const nodes: SubjectTreeNode[] = [];

    sem.subjects.forEach((subject) => {
      const sylFile = this.resolveSyllabusFile(
        (subject as any).syllabusFile,
        subject.code,
        syllabusBasePath
      );

      if (subject.type === 'M' || !subject.electiveGroup) {
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
            syllabusFile: sylFile,
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
          children: groupData.items.map((item) => {
            const itemSylFile = this.resolveSyllabusFile(
              (item as any).syllabusFile,
              item.code,
              syllabusBasePath
            );
            return {
              data: {
                name: item.name,
                type: 'Obieralny',
                code: item.code,
                lecture: item.lecture,
                tutorial: item.tutorial,
                lab: item.lab,
                form: item.form,
                ects: item.ects,
                syllabusFile: itemSylFile,
                pdf: (item as any).pdf,
                docFile: (item as any).docFile,
              },
              leaf: true,
            };
          }),
        };
        nodes.push(groupNode);
      } else {
        // Single elective without sub-choices
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
            syllabusFile: sylFile,
            pdf: (subject as any).pdf,
            docFile: (subject as any).docFile,
          },
          leaf: true,
        });
      }
    });

    return nodes;
  }

  /** Resolves the syllabus file path for a subject/item. */
  private resolveSyllabusFile(
    existingFile: string | undefined,
    code: string,
    syllabusBasePath: string
  ): string | undefined {
    if (existingFile) return existingFile;
    if (syllabusBasePath && code && code !== '-') {
      return `${syllabusBasePath}${code}.json`;
    }
    return undefined;
  }
}
