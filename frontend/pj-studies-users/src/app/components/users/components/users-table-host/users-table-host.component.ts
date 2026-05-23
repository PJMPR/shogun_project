import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ManagedUser, SaveMessage, UserRoleDiff } from '../../users.models';
import { UsersTableComponent } from '../users-table/users-table.component';

@Component({
  selector: 'app-users-table-host',
  standalone: true,
  imports: [
    CommonModule,
    ToolbarModule,
    ButtonModule,
    MessageModule,
    UsersTableComponent,
  ],
  templateUrl: './users-table-host.component.html',
})
export class UsersTableHostComponent {
  @Input({ required: true }) message: SaveMessage | null = null;
  @Input({ required: true }) users: ManagedUser[] = [];
  @Input({ required: true }) managedRoles: string[] = [];
  @Input({ required: true }) loading = false;
  @Input({ required: true }) saving = false;
  @Input({ required: true }) hasChanges = false;
  @Input({ required: true }) selectedUsers: ManagedUser[] = [];

  @Input({ required: true }) isUserChanged!: (userId: string) => boolean;
  @Input({ required: true }) getUserRoleDiff!: (user: ManagedUser) => UserRoleDiff;
  @Input({ required: true }) roleLabel!: (role: string) => string;
  @Input({ required: true }) roleSeverity!: (role: string) => 'danger' | 'warn' | 'info' | 'secondary';
  @Input({ required: true }) roleTooltip!: (role: string) => string | undefined;

  @Output() openEditSelected = new EventEmitter<void>();
  @Output() discardChanges = new EventEmitter<void>();
  @Output() saveChanges = new EventEmitter<void>();
  @Output() selectedUsersChange = new EventEmitter<ManagedUser[]>();
  @Output() editUser = new EventEmitter<ManagedUser>();
  @Output() clearMessage = new EventEmitter<void>();
}
