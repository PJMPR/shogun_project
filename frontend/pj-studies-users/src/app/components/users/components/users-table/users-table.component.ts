import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ManagedUser, UserRoleDiff } from '../../users.models';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule],
  templateUrl: './users-table.component.html',
  styleUrl: './users-table.component.css',
})
export class UsersTableComponent {
  @Input({ required: true }) users: ManagedUser[] = [];
  @Input({ required: true }) loading = false;
  @Input({ required: true }) selectedUsers: ManagedUser[] = [];
  @Input({ required: true }) isUserChanged!: (userId: string) => boolean;
  @Input({ required: true }) getUserRoleDiff!: (user: ManagedUser) => UserRoleDiff;
  @Input({ required: true }) roleLabel!: (role: string) => string;
  @Input({ required: true }) roleSeverity!: (role: string) => 'danger' | 'warn' | 'info' | 'secondary';

  @Output() selectedUsersChange = new EventEmitter<ManagedUser[]>();
  @Output() editUser = new EventEmitter<ManagedUser>();

  onSelectionChange(users: ManagedUser[]): void {
    this.selectedUsersChange.emit(users ?? []);
  }
}
