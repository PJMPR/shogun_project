import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PrimeNG } from 'primeng/config';
import { UsersService } from '../../services/users.service';
import { ManagedRole, ManagedUser, SaveMessage } from './users.models';
import { UsersTableHostComponent } from './components/users-table-host/users-table-host.component';
import { UsersRolesDialogComponent } from './components/users-roles-dialog/users-roles-dialog.component';
import { ensureUsersPrimeNgTheme } from '../../shared/users-primeng-theme';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, UsersTableHostComponent, UsersRolesDialogComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  users = signal<ManagedUser[]>([]);
  managedRoles = signal<string[]>([]);
  managedRoleMap = signal<Record<string, ManagedRole>>({});
  loading = signal(false);
  saving = signal(false);
  saveMessage = signal<SaveMessage | null>(null);

  // Table row selection (regular array for PrimeNG two-way binding)
  selectedUsersTable: ManagedUser[] = [];

  // Dialog state
  editDialogVisible = signal(false);
  dialogUsers = signal<ManagedUser[]>([]);
  dialogRoleState = signal<Record<string, boolean>>({});

  // Change tracking – snapshot of roles from backend
  private originalRolesMap = signal<Map<string, string[]>>(new Map());

  // Stable callbacks for child components
  readonly isUserChangedFn = (userId: string): boolean => this.isUserChanged(userId);
  readonly getUserRoleDiffFn = (user: ManagedUser) => this.getUserRoleDiff(user);
  readonly roleLabelFn = (role: string) => this.roleLabel(role);
  readonly roleSeverityFn = (role: string) => this.roleSeverity(role);
  readonly isRoleEnabledInDialogFn = (role: string): boolean => this.isRoleEnabledInDialog(role);
  readonly roleDescriptionFn = (role: string): string | null => this.roleDescription(role);
  readonly roleAttributesTextFn = (role: string): string | null => this.roleAttributesText(role);
  readonly roleTooltipFn = (role: string): string | undefined => this.roleTooltip(role);

  // ──────── Computed ────────

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

  dialogHeader = computed(() => {
    const users = this.dialogUsers();
    if (users.length === 0) return 'Role';
    if (users.length === 1) return `Role: ${users[0].firstName} ${users[0].lastName}`;
    return `Masowe przypisanie ról (${users.length} użytkowników)`;
  });

  constructor(
    private usersService: UsersService,
    private primeng: PrimeNG,
  ) {
    // Ensure users MFE applies full PrimeNG theme tokens immediately on first load.
    ensureUsersPrimeNgTheme(this.primeng);
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  private loadRoles(): void {
    this.usersService.getManagedRoles().subscribe({
      next: roles => {
        const normalized = roles ?? [];
        this.managedRoles.set(normalized.map(role => role.name));

        const roleMap: Record<string, ManagedRole> = {};
        for (const role of normalized) {
          roleMap[role.name] = role;
        }
        this.managedRoleMap.set(roleMap);
      },
    });
  }

  private loadUsers(): void {
    this.saveMessage.set(null);
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
        this.saveMessage.set({ severity: 'error', text: 'Nie udało się pobrać listy użytkowników.', life: 8000 });
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

  roleDescription(role: string): string | null {
    const description = this.managedRoleMap()[role]?.description?.trim();
    return description ? description : null;
  }

  roleAttributesText(role: string): string | null {
    const attributes = this.managedRoleMap()[role]?.attributes;
    if (!attributes) return null;

    const chunks = Object.entries(attributes)
      .filter(([key, values]) => key?.trim() && Array.isArray(values) && values.length > 0)
      .map(([key, values]) => `${key}: ${values.join(', ')}`);

    return chunks.length > 0 ? chunks.join(' | ') : null;
  }

  roleTooltip(role: string): string | undefined {
    const details: string[] = [this.roleLabel(role)];
    const description = this.roleDescription(role);
    const attributes = this.roleAttributesText(role);

    if (description) {
      details.push(`Opis: ${description}`);
    }

    if (attributes) {
      details.push(`Atrybuty: ${attributes}`);
    }

    return details.length > 1 ? details.join('\n') : undefined;
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
    const state: Record<string, boolean> = {};
    for (const role of this.managedRoles()) {
      state[role] = users.length > 0 && users.every(u => u.roles.includes(role));
    }
    this.dialogRoleState.set(state);
    this.editDialogVisible.set(true);
  }

  closeEditDialog(): void {
    this.editDialogVisible.set(false);
    this.dialogUsers.set([]);
    this.dialogRoleState.set({});
  }

  isRoleEnabledInDialog(role: string): boolean {
    return !!this.dialogRoleState()[role];
  }

  onRoleToggle(role: string, enabled: boolean): void {
    this.dialogRoleState.update(current => ({ ...current, [role]: enabled }));
  }

  /** Applies dialog selections to local table state – does NOT call backend. */
  applyDialogChanges(): void {
    const affectedCount = this.dialogUsers().length;
    const selectedManagedRoles = this.managedRoles().filter(role => this.dialogRoleState()[role]);
    const managedRolesSet = new Set(this.managedRoles());
    const targetIds = new Set(this.dialogUsers().map(u => u.id));

    this.users.update(allUsers =>
      allUsers.map(u => {
        if (!targetIds.has(u.id)) return u;

        const nonManagedRoles = u.roles.filter(r => !managedRolesSet.has(r));
        const newRoles = [...new Set([...nonManagedRoles, ...selectedManagedRoles])];
        return { ...u, roles: newRoles };
      }),
    );

    this.saveMessage.set({
      severity: 'info',
      text: `Zastosowano ustawienia ról dla ${affectedCount} użytkownika/ów.`,
      life: 3500,
    });

    this.closeEditDialog();
    this.selectedUsersTable = [];
  }

  // ──────────── Global save / discard ────────────

  saveAllChanges(): void {
    const changed = this.users().filter(u => this.changedUserIds().has(u.id));
    if (changed.length === 0) return;
    this.saveMessage.set(null);
    this.saving.set(true);
    forkJoin(changed.map(u => this.usersService.setUserRoles(u.id, u.roles))).subscribe({
      next: () => {
        this.originalRolesMap.update(map => {
          const newMap = new Map(map);
          for (const u of changed) newMap.set(u.id, [...u.roles]);
          return newMap;
        });
        this.saving.set(false);
        this.saveMessage.set({
          severity: 'success',
          text: `Zaktualizowano role ${changed.length} użytkownika/ów.`,
          life: 5000,
        });
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set({ severity: 'error', text: 'Nie udało się zapisać zmian.', life: 8000 });
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
    this.saveMessage.set({ severity: 'info', text: 'Cofnięto niezapisane zmiany.', life: 4000 });
  }

  clearSaveMessage(): void {
    this.saveMessage.set(null);
  }

  private rolesEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  }
}
