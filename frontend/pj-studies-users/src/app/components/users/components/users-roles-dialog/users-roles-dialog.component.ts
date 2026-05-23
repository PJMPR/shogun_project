import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-users-roles-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, TableModule, ToggleSwitchModule, ButtonModule],
  templateUrl: './users-roles-dialog.component.html',
})
export class UsersRolesDialogComponent {
  @Input({ required: true }) visible = false;
  @Input({ required: true }) header = 'Role';
  @Input({ required: true }) managedRoles: string[] = [];
  @Input({ required: true }) roleLabel!: (role: string) => string;
  @Input({ required: true }) isRoleEnabled!: (role: string) => boolean;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() roleToggle = new EventEmitter<{ role: string; enabled: boolean }>();
  @Output() closeDialog = new EventEmitter<void>();
  @Output() applyChanges = new EventEmitter<void>();

  onRoleToggle(role: string, enabled: boolean): void {
    this.roleToggle.emit({ role, enabled });
  }
}
