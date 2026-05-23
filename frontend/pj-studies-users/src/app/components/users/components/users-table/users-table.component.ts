import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { FilterService, SelectItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ManagedUser, UserRoleDiff } from '../../users.models';

type TableUser = ManagedUser & {
  fullName: string;
  rolesText: string;
};

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, AvatarModule, InputTextModule, MultiSelectModule, TooltipModule],
  templateUrl: './users-table.component.html',
})
export class UsersTableComponent {
  @Input({ required: true }) users: ManagedUser[] = [];
  @Input({ required: true }) managedRoles: string[] = [];
  @Input({ required: true }) loading = false;
  @Input({ required: true }) selectedUsers: ManagedUser[] = [];
  @Input({ required: true }) isUserChanged!: (userId: string) => boolean;
  @Input({ required: true }) getUserRoleDiff!: (user: ManagedUser) => UserRoleDiff;
  @Input({ required: true }) roleLabel!: (role: string) => string;
  @Input({ required: true }) roleSeverity!: (role: string) => 'danger' | 'warn' | 'info' | 'secondary';
  @Input({ required: true }) roleTooltip!: (role: string) => string | undefined;

  @Output() selectedUsersChange = new EventEmitter<ManagedUser[]>();
  @Output() editUser = new EventEmitter<ManagedUser>();

  constructor(private filterService: FilterService) {
    this.filterService.register('hasAnyRole', (value: string[] | null | undefined, filter: string[] | null | undefined) => {
      if (!filter || filter.length === 0) return true;
      if (!value || value.length === 0) return false;
      return filter.some(role => value.includes(role));
    });
  }

  get tableUsers(): TableUser[] {
    return this.users.map(user => ({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      rolesText: user.roles.map(role => this.roleLabel(role)).join(' '),
    }));
  }

  get roleFilterOptions(): SelectItem[] {
    return this.managedRoles.map(role => ({
      label: this.roleLabel(role),
      value: role,
    }));
  }

  onSelectionChange(users: ManagedUser[]): void {
    this.selectedUsersChange.emit(users ?? []);
  }

  onEditButtonClick(event: Event, user: ManagedUser): void {
    event.preventDefault();
    event.stopPropagation();
    this.editUser.emit(user);
  }

  avatarLabel(user: ManagedUser): string {
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    const username = (user.username ?? '').trim();

    const initials = `${first.charAt(0)}${last.charAt(0)}`.trim();
    if (initials) {
      return initials.toUpperCase();
    }

    if (username.length >= 2) {
      return username.slice(0, 2).toUpperCase();
    }

    if (username.length === 1) {
      return username.toUpperCase();
    }

    return '?';
  }
}
