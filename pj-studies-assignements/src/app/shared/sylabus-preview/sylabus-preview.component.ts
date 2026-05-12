import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DividerModule } from 'primeng/divider';
import {
  SylabusData,
  SylabusEfektyItem,
  SylabusKryteriaOceny,
  SylabusTrescProgramowa,
} from '../../models/program.models';

@Component({
  selector: 'app-sylabus-preview',
  standalone: true,
  imports: [CommonModule, PanelModule, CardModule, TableModule, DividerModule],
  templateUrl: './sylabus-preview.component.html',
  styleUrl: './sylabus-preview.component.css',
})
export class SylabusPreviewComponent {
  @Input() sylabus!: SylabusData;

  asArray(val: string | string[] | undefined | null): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(i => typeof i === 'object' ? (i as SylabusEfektyItem).peu : i);
    return [val];
  }

  asStringArray(items: any[]): string[] {
    return items.map(i => typeof i === 'string' ? i : (i as SylabusEfektyItem).peu);
  }

  asEfektyItems(items: any[]): SylabusEfektyItem[] {
    return items as SylabusEfektyItem[];
  }

  isEfektyObjects(items: any[]): boolean {
    return items.length > 0 && typeof items[0] === 'object' && 'peu' in items[0];
  }

  private normalizeEfekty(val: any): any[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.trim() ? [val] : [];
    return [];
  }

  getEfektyKategorie(): { key: string; label: string; icon: string; items: any[] }[] {
    const ef = this.sylabus?.efekty_ksztalcenia;
    if (!ef) return [];
    return [
      { key: 'wiedza',               label: 'Wiedza',               icon: 'pi pi-lightbulb', items: this.normalizeEfekty(ef.wiedza) },
      { key: 'umiejetnosci',         label: 'Umiejętności',         icon: 'pi pi-cog',       items: this.normalizeEfekty(ef.umiejetnosci) },
      { key: 'kompetencje_spoleczne',label: 'Kompetencje społeczne',icon: 'pi pi-users',     items: this.normalizeEfekty(ef.kompetencje_spoleczne) },
    ];
  }

  getZaliczenieEntries(z: Record<string, { sposob: string }> | undefined): { forma: string; sposob: string }[] {
    if (!z) return [];
    return Object.entries(z).map(([forma, v]) => ({ forma, sposob: v.sposob }));
  }

  getMetodyEntries(m: any): { forma: string; metody: string[] }[] {
    if (!m) return [];
    return Object.entries(m)
      .filter(([, v]) => Array.isArray(v) && (v as string[]).length > 0)
      .map(([forma, v]) => ({ forma, metody: v as string[] }));
  }

  isKryteriaObject(k: any): k is SylabusKryteriaOceny {
    return k && !Array.isArray(k) && typeof k === 'object';
  }

  isTresciObject(t: any): t is SylabusTrescProgramowa[] {
    return Array.isArray(t) && t.length > 0 && typeof t[0] === 'object' && 'nr_zajec' in t[0];
  }

  getTresciRows(): SylabusTrescProgramowa[] {
    const t = this.sylabus?.tresci_programowe;
    if (this.isTresciObject(t)) return t as SylabusTrescProgramowa[];
    return [];
  }

  getTresciLegacy(): string[] {
    const t = this.sylabus?.tresci_programowe;
    if (Array.isArray(t) && t.length > 0 && typeof t[0] === 'string') return t as string[];
    return [];
  }
}

