import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DividerModule } from 'primeng/divider';
import { SylabusData } from '../../stacjonarne/program/models/program.models';

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
    if (Array.isArray(val)) return val;
    return [val];
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
}

