import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SubjectRow, SubjectTreeNode } from '../models/program.models';

interface CockpitRow {
  node: SubjectTreeNode;
  data: SubjectRow;
  level: number;
  path: string;
}

@Component({
  selector: 'app-cockpit-tree-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cockpit-tree-table.component.html',
  styleUrl: './cockpit-tree-table.component.css',
})
export class CockpitTreeTableComponent {
  @Input({ required: true }) nodes: SubjectTreeNode[] = [];
  @Input({ required: true }) mode!: 'stacjonarny' | 'niestacjonarny';
  @Input({ required: true }) semester = 1;
  @Input() selectedKeys = new Set<string>();
  @Input() tableId: string | null = null;

  @Output() selectionToggle = new EventEmitter<SubjectRow>();
  @Output() detailsOpen = new EventEmitter<SubjectRow>();

  private collapsedPaths = new Set<string>();

  visibleRows(): CockpitRow[] {
    const result: CockpitRow[] = [];
    const visit = (nodes: SubjectTreeNode[], level: number, parentPath: string) => {
      nodes.forEach((node, index) => {
        const path = `${parentPath}${index}`;
        result.push({ node, data: node.data, level, path });
        if (node.children?.length && !this.collapsedPaths.has(path)) {
          visit(node.children, level + 1, `${path}.`);
        }
      });
    };
    visit(this.nodes, 0, '');
    return result;
  }

  hasChildren(row: CockpitRow): boolean {
    return !!row.node.children?.length;
  }

  isExpanded(row: CockpitRow): boolean {
    return this.hasChildren(row) && !this.collapsedPaths.has(row.path);
  }

  toggleExpanded(row: CockpitRow): void {
    const next = new Set(this.collapsedPaths);
    if (next.has(row.path)) next.delete(row.path);
    else next.add(row.path);
    this.collapsedPaths = next;
  }

  isSelected(row: SubjectRow): boolean {
    return this.selectedKeys.has(this.rowKey(row));
  }

  typeClass(type: string): string {
    if (type.includes('specjalizacji')) return 'tag-specialization-subject';
    if (type === 'Specjalizacja') return 'tag-specialization';
    if (type.includes('Obowiązkowy') || type.includes('Obowi')) return 'tag-required';
    return 'tag-elective';
  }

  private rowKey(row: SubjectRow): string {
    return `${this.mode}:${this.semester}:${row.code}:${row.name}`;
  }
}
