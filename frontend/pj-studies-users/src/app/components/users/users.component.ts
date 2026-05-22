import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { UsersService } from '../../services/users.service';

export interface ManagedUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  roles: string[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ToolbarModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    CheckboxModule,
  ],
  providers: [MessageService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  users = signal<ManagedUser[]>([]);
  managedRoles = signal<string[]>([]);
  loading = signal(false);
  saving = signal(false);
  globalFilter = signal('');

  // Table row selection (regular array for PrimeNG two-way binding)
  selectedUsersTable: ManagedUser[] = [];

  // Dialog state
  editDialogVisible = signal(false);
  dialogUsers = signal<ManagedUser[]>([]);
  dialogRolesToAdd = signal<string[]>([]);
  dialogRolesToRemove = signal<string[]>([]);
  dialogDropdownRoleValue = '';

  // Change tracking – snapshot of roles from backend
  private originalRolesMap = signal<Map<string, string[]>>(new Map());

  // ──────── Computed ────────

  filteredUsers = computed(() => {
    const filter = this.globalFilter().toLowerCase();
    if (!filter) return this.users();
    return this.users().filter(
      u =>
        u.firstName.toLowerCase().includes(filter) ||
        u.lastName.toLowerCase().includes(filter) ||
        u.email.toLowerCase().includes(filter) ||
        u.username.toLowerCase().includes(filter),
    );
  });

  changedUserIds = computed(() => {
    const map = this.originalRolesMap();
    const changed = new Set<string>();
    for (const user of this.users()) {
      const original = map.get(user.id) ?? [];
      if (!this.rolesEqual(original, user.roles)) changed.add(user.id);
    }
    return changed;
  });

  hasChanges = computed(() => this.changedUserIds().size > 0);

  dialogAvailableRoles = computed(() => {
    const toAdd = this.dialogRolesToAdd();
    return this.managedRoles().filter(r => !toAdd.includes(r));
  });

  dialogCurrentRoles = computed(() => {
    const allRoles = new Set<string>();
    for (const u of this.dialogUsers()) for (const r of u.roles) allRoles.add(r);
    return [...allRoles];
  });

  dialogHeader = computed(() => {
    const users = this.dialogUsers();
    if (users.length === 0) return 'Role';
    if (users.length === 1) return `Role: ${users[0].firstName} ${users[0].lastName}`;
    return `Masowe przypisanie ról (${users.length} użytkowników)`;
  });

  stats = computed(() => {
    const all = this.users();
    const roles = this.managedRoles();
    const roleCounts: Record<string, number> = {};
    for (const r of roles) roleCounts[r] = all.filter(u => u.roles.includes(r)).length;
    return {
      total: all.length,
      roleCounts,
      noRole: all.filter(u => u.roles.length === 0 && u.enabled).length,
    };
  });

  constructor(
    private messageService: MessageService,
    private usersService: UsersService,
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  private loadRoles(): void {
    this.usersService.getManagedRoles().subscribe({
      next: roles => this.managedRoles.set(roles),
    });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.usersService.getUsers().subscribe({
      next: dtos => {
        const users: ManagedUser[] = dtos.map(d => ({
          id: d.id,
          username: d.username,
          firstName: d.firstName ?? '',
          lastName: d.lastName ?? '',
          email: d.email ?? '',
          enabled: d.enabled,
          roles: d.roles,
        }));
        this.users.set(users);
        const map = new Map<string, string[]>();
        for (const u of users) map.set(u.id, [...u.roles]);
        this.originalRolesMap.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Nie udało się pobrać listy użytkowników.',
          life: 5000,
        });
        this.loading.set(false);
      },
    });
  }

  isUserChanged(userId: string): boolean {
    return this.changedUserIds().has(userId);
  }

  getUserRoleDiff(user: ManagedUser): { added: string[]; removed: string[]; unchanged: string[] } {
    const original = this.originalRolesMap().get(user.id) ?? user.roles;
    return {
      added: user.roles.filter(r => !original.includes(r)),
      removed: original.filter(r => !user.roles.includes(r)),
      unchanged: user.roles.filter(r => original.includes(r)),
    };
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      coordinator: 'Koordynator',
      lecturer: 'Wykładowca',
    };
    return labels[role] ?? role;
  }

  roleSeverity(role: string): 'danger' | 'warn' | 'info' | 'secondary' {
    const map: Record<string, 'danger' | 'warn' | 'info' | 'secondary'> = {
      admin: 'danger',
      coordinator: 'warn',
      lecturer: 'info',
    };
    return map[role] ?? 'secondary';
  }

  // ──────────── Dialog ────────────

  openEditDialogForUser(user: ManagedUser): void {
    this.openEditDialog([user]);
  }

  openEditDialogForSelected(): void {
    if (this.selectedUsersTable.length === 0) return;
    this.openEditDialog(this.selectedUsersTable);
  }

  private openEditDialog(users: ManagedUser[]): void {
    this.dialogUsers.set(users);
    this.dialogRolesToAdd.set([]);
    this.dialogRolesToRemove.set([]);
    this.dialogDropdownRoleValue = this.managedRoles()[0] ?? '';
    this.editDialogVisible.set(true);
  }

  closeEditDialog(): void {
    this.editDialogVisible.set(false);
    this.dialogUsers.set([]);
  }

  addRoleToDialog(): void {
    const role = this.dialogDropdownRoleValue;
    if (!role || this.dialogRolesToAdd().includes(role)) return;
    this.dialogRolesToAdd.update(list => [...list, role]);
    const remaining = this.dialogAvailableRoles();
    this.dialogDropdownRoleValue = remaining[0] ?? '';
  }

  removeFromAddList(role: string): void {
    this.dialogRolesToAdd.update(list => list.filter(r => r !== role));
    if (!this.dialogDropdownRoleValue) {
      this.dialogDropdownRoleValue = this.dialogAvailableRoles()[0] ?? '';
    }
  }

  toggleRemoveRole(role: string): void {
    const current = this.dialogRolesToRemove();
    if (current.includes(role)) {
      this.dialogRolesToRemove.set(current.filter(r => r !== role));
    } else {
      this.dialogRolesToRemove.set([...current, role]);
    }
  }

  /** Applies dialog selections to local table state – does NOT call backend. */
  applyDialogChanges(): void {
    const toAdd = this.dialogRolesToAdd();
    const toRemove = this.dialogRolesToRemove();
    const targetIds = new Set(this.dialogUsers().map(u => u.id));
    this.users.update(allUsers =>
      allUsers.map(u => {
        if (!targetIds.has(u.id)) return u;
        const newRoles = [...new Set([...u.roles, ...toAdd])].filter(r => !toRemove.includes(r));
        return { ...u, roles: newRoles };
      }),
    );
    this.closeEditDialog();
    this.selectedUsersTable = [];
  }

  // ──────────── Global save / discard ────────────

  saveAllChanges(): void {
    const changed = this.users().filter(u => this.changedUserIds().has(u.id));
    if (changed.length === 0) return;
    this.saving.set(true);
    forkJoin(changed.map(u => this.usersService.setUserRoles(u.id, u.roles))).subscribe({
      next: () => {
        this.originalRolesMap.update(map => {
          const newMap = new Map(map);
          for (const u of changed) newMap.set(u.id, [...u.roles]);
          return newMap;
        });
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Zapisano',
          detail: `Zaktualizowano role ${changed.length} użytkownika/ów.`,
          life: 3000,
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Nie udało się zapisać zmian.',
          life: 5000,
        });
      },
    });
  }

  discardAllChanges(): void {
    const map = this.originalRolesMap();
    this.users.update(list =>
      list.map(u => {
        const original = map.get(u.id);
        return original ? { ...u, roles: [...original] } : u;
      }),
    );
    this.selectedUsersTable = [];
  }

  onGlobalFilter(event: Event): void {
    this.globalFilter.set((event.target as HTMLInputElement).value);
  }

  private rolesEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  }
}
