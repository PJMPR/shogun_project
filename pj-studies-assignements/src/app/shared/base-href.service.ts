import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

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
   * Buduje URL do pliku w assets, np. assetUrl('program.json') -> '/GD_WI_PRG_26-27/assets/program.json'
   */
  assetUrl(path: string): string {
    // path może zaczynać się od 'assets/' lub być samą nazwą pliku
    const normalized = path.startsWith('assets/') ? path : `assets/${path}`;
    return `${this.baseHref}${normalized}`;
  }
}

