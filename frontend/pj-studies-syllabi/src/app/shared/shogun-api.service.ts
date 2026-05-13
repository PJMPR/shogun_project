import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ElectivesOtherData,
  ElectivesSpecializationsData,
  ProgramData,
  SylabusData,
} from '../models/program.models';

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface ProgramApiItem {
  id: string;
  tryb_studiow: string;
  lang: string;
  is_stary: boolean;
  data: ProgramData;
}

interface ElectiveApiItem {
  id: string;
  elective_type: string;
  tryb_studiow: string;
  lang: string;
  is_stary: boolean;
  data: any;
}

interface SyllabusApiItem {
  id: string;
  kod_przedmiotu: string;
  tryb_studiow: string;
  is_stary: boolean | null;
  sylabus: SylabusData | null;
}

@Injectable({ providedIn: 'root' })
export class ShogunApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getProgramData(
    tryb: 'stacjonarny' | 'niestacjonarny',
    isStary = false
  ): Observable<ProgramData> {
    return this.http
      .get<PagedResult<ProgramApiItem>>(`${this.base}/api/v1/programs`, {
        params: { tryb_studiow: tryb, is_stary: String(isStary), lang: 'pl', pageSize: '1' },
      })
      .pipe(map(r => r.items[0]?.data ?? ({} as ProgramData)));
  }

  getElectivesOther(
    tryb: 'stacjonarny' | 'niestacjonarny',
    isStary = false
  ): Observable<ElectivesOtherData> {
    return this.http
      .get<PagedResult<ElectiveApiItem>>(`${this.base}/api/v1/electives`, {
        params: {
          elective_type: 'other',
          tryb_studiow: tryb,
          is_stary: String(isStary),
          lang: 'pl',
          pageSize: '1',
        },
      })
      .pipe(map(r => (r.items[0]?.data ?? { groups: [] }) as ElectivesOtherData));
  }

  getElectivesSpec(
    tryb: 'stacjonarny' | 'niestacjonarny',
    isStary = false
  ): Observable<ElectivesSpecializationsData> {
    return this.http
      .get<PagedResult<ElectiveApiItem>>(`${this.base}/api/v1/electives`, {
        params: {
          elective_type: 'specializations',
          tryb_studiow: tryb,
          is_stary: String(isStary),
          lang: 'pl',
          pageSize: '1',
        },
      })
      .pipe(
        map(r => (r.items[0]?.data ?? { specializations: [] }) as ElectivesSpecializationsData)
      );
  }

  getSyllabus(kodPrzedmiotu: string, tryb: string): Observable<SylabusData | null> {
    return this.http
      .get<PagedResult<SyllabusApiItem>>(`${this.base}/api/v1/syllabi`, {
        params: { kod_przedmiotu: kodPrzedmiotu, tryb_studiow: tryb, pageSize: '1' },
      })
      .pipe(map(r => (r.items[0]?.sylabus as any)?.sylabus ?? r.items[0]?.sylabus ?? null));
  }

  getSyllabusWithId(
    kodPrzedmiotu: string,
    tryb: string
  ): Observable<{ id: string; sylabus: SylabusData } | null> {
    return this.http
      .get<PagedResult<SyllabusApiItem>>(`${this.base}/api/v1/syllabi`, {
        params: { kod_przedmiotu: kodPrzedmiotu, tryb_studiow: tryb, pageSize: '1' },
      })
      .pipe(
        map(r => {
          const item = r.items[0];
          if (!item) return null;
          const sylabus: SylabusData = (item.sylabus as any)?.sylabus ?? item.sylabus;
          if (!sylabus) return null;
          return { id: item.id, sylabus };
        })
      );
  }

  createSyllabus(
    kod_przedmiotu: string,
    tryb_studiow: string,
    is_stary: boolean,
    sylabus: object
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/api/v1/syllabi`, {
      kod_przedmiotu,
      tryb_studiow,
      is_stary,
      _source: null,
      sylabus,
    });
  }

  updateSyllabus(
    id: string,
    kod_przedmiotu: string,
    tryb_studiow: string,
    is_stary: boolean,
    sylabus: object
  ): Observable<unknown> {
    return this.http.put(`${this.base}/api/v1/syllabi/${encodeURIComponent(id)}`, {
      kod_przedmiotu,
      tryb_studiow,
      is_stary,
      _source: null,
      sylabus,
    });
  }

  getTeachingMethods(): Observable<{ wyklad: string[]; cwiczenia_laboratorium: string[] }> {
    return this.http.get<{ wyklad: string[]; cwiczenia_laboratorium: string[] }>(
      `${this.base}/api/v1/metadata/teaching-methods`
    );
  }

  getVerificationMethods(): Observable<{ metody_weryfikacji: string[] }> {
    return this.http.get<{ metody_weryfikacji: string[] }>(
      `${this.base}/api/v1/metadata/verification-methods`
    );
  }

  getLearningOutcomes(): Observable<{
    efekty_ksztalcenia: {
      wiedza: { kod_efektu: string; tresc: string }[];
      umiejetnosci: { kod_efektu: string; tresc: string }[];
      kompetencje_spoleczne: { kod_efektu: string; tresc: string }[];
    };
  }> {
    return this.http.get<any>(`${this.base}/api/v1/metadata/learning-outcomes`);
  }
}
