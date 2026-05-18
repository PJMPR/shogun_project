import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BaseHrefService {
  private document = inject(DOCUMENT);

  /**
   * Zwraca base href z taga <base> w index.html, zawsze zakończony '/'.
   * Np. '/GD_WI_PRG_26-27/' lub '/'
   */
  get baseHref(): string {
    const base = this.document.querySelector('base')?.getAttribute('href') ?? '/';
    return base.endsWith('/') ? base : base + '/';
  }

  /**
   * Buduje URL do pliku w assets, np. assetUrl('program.json') -> '/mfe-program/assets/program.json'
   * Gdy uruchomiony jako MFE wewnątrz shella (baseHref='/')
   * używa environment.mfeBaseUrl zamiast baseHref z dokumentu.
   */
  assetUrl(path: string): string {
    const normalized = path.startsWith('assets/') ? path : `assets/${path}`;
    const base = this.baseHref === '/'
      ? (environment.mfeBaseUrl.endsWith('/') ? environment.mfeBaseUrl : environment.mfeBaseUrl + '/')
      : this.baseHref;
    return `${base}${normalized}`;
  }
}


