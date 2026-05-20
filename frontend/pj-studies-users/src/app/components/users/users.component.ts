import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

export type UserRole = 'admin' | 'coordinator' | 'lecturer' | 'none';

export interface ManagedUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  roles: UserRole[];
  lastLogin: Date | null;
}

const MOCK_USERS: ManagedUser[] = [
  {
    id: '1a2b3c4d-0001',
    username: 'jan.kowalski',
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan.kowalski@pj.edu.pl',
    enabled: true,
    roles: ['admin'],
    lastLogin: new Date('2026-05-19T08:30:00'),
  },
  {
    id: '1a2b3c4d-0002',
    username: 'anna.nowak',
    firstName: 'Anna',
    lastName: 'Nowak',
    email: 'anna.nowak@pj.edu.pl',
    enabled: true,
    roles: ['coordinator'],
    lastLogin: new Date('2026-05-20T10:15:00'),
  },
  {
    id: '1a2b3c4d-0003',
    username: 'piotr.wisniewski',
    firstName: 'Piotr',
    lastName: 'Wiśniewski',
    email: 'p.wisniewski@pj.edu.pl',
    enabled: true,
    roles: ['lecturer'],
    lastLogin: new Date('2026-05-18T14:45:00'),
  },
  {
    id: '1a2b3c4d-0004',
    username: 'maria.wojcik',
    firstName: 'Maria',
    lastName: 'Wójcik',
    email: 'm.wojcik@pj.edu.pl',
    enabled: true,
    roles: ['lecturer', 'coordinator'],
    lastLogin: new Date('2026-05-20T09:00:00'),
  },
  {
    id: '1a2b3c4d-0005',
    username: 'tomasz.kaminski',
    firstName: 'Tomasz',
    lastName: 'Kamiński',
    email: 't.kaminski@pj.edu.pl',
    enabled: false,
    roles: [],
    lastLogin: new Date('2026-04-10T11:00:00'),
  },
  {
    id: '1a2b3c4d-0006',
    username: 'ewa.lewandowska',
    firstName: 'Ewa',
    lastName: 'Lewandowska',
    email: 'e.lewandowska@pj.edu.pl',
    enabled: true,
    roles: ['lecturer'],
    lastLogin: new Date('2026-05-17T16:20:00'),
  },
  {
    id: '1a2b3c4d-0007',
    username: 'marek.zielinski',
    firstName: 'Marek',
    lastName: 'Zieliński',
    email: 'm.zielinski@pj.edu.pl',
    enabled: true,
    roles: ['coordinator'],
    lastLogin: new Date('2026-05-15T12:00:00'),
  },
  {
    id: '1a2b3c4d-0008',
    username: 'katarzyna.szymanska',
    firstName: 'Katarzyna',
    lastName: 'Szymańska',
    email: 'k.szymanska@pj.edu.pl',
    enabled: true,
    roles: [],
    lastLogin: null,
  },
];

const ALL_ROLES: UserRole[] = ['admin', 'coordinator', 'lecturer'];

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
  ],
  providers: [MessageService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent {
  users = signal<ManagedUser[]>(MOCK_USERS.map(u => ({ ...u, roles: [...u.roles] })));
  globalFilter = signal('');
  editDialogVisible = signal(false);
  selectedUser = signal<ManagedUser | null>(null);
  editRoles = signal<UserRole[]>([]);
  saving = signal(false);

  readonly allRoles: UserRole[] = ['admin', 'coordinator', 'lecturer'];
  roleOptions = ALL_ROLES.map(r => ({ label: this.roleLabel(r), value: r }));

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

  stats = computed(() => {
    const all = this.users();
    return {
      total: all.length,
      admins: all.filter(u => u.roles.includes('admin')).length,
      coordinators: all.filter(u => u.roles.includes('coordinator')).length,
      lecturers: all.filter(u => u.roles.includes('lecturer')).length,
      noRole: all.filter(u => u.roles.length === 0 && u.enabled).length,
    };
  });

  constructor(private messageService: MessageService) {}

  roleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      admin: 'Administrator',
      coordinator: 'Koordynator',
      lecturer: 'Wykładowca',
      none: 'Brak roli',
    };
    return labels[role];
  }

  roleSeverity(role: UserRole): 'danger' | 'warn' | 'info' | 'secondary' {
    const map: Record<UserRole, 'danger' | 'warn' | 'info' | 'secondary'> = {
      admin: 'danger',
      coordinator: 'warn',
      lecturer: 'info',
      none: 'secondary',
    };
    return map[role];
  }

  openEditDialog(user: ManagedUser): void {
    this.selectedUser.set({ ...user });
    this.editRoles.set([...user.roles]);
    this.editDialogVisible.set(true);
  }

  closeEditDialog(): void {
    this.editDialogVisible.set(false);
    this.selectedUser.set(null);
  }

  hasRole(role: UserRole): boolean {
    return this.editRoles().includes(role);
  }

  toggleRole(role: UserRole): void {
    const current = this.editRoles();
    if (current.includes(role)) {
      this.editRoles.set(current.filter(r => r !== role));
    } else {
      this.editRoles.set([...current, role]);
    }
  }

  saveRoles(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.saving.set(true);
    setTimeout(() => {
      this.users.update(list =>
        list.map(u => (u.id === user.id ? { ...u, roles: [...this.editRoles()] } : u)),
      );
      this.saving.set(false);
      this.closeEditDialog();
      this.messageService.add({
        severity: 'success',
        summary: 'Zapisano',
        detail: `Role użytkownika ${user.firstName} ${user.lastName} zostały zaktualizowane.`,
        life: 3000,
      });
    }, 600);
  }

  toggleEnabled(user: ManagedUser): void {
    this.users.update(list =>
      list.map(u => (u.id === user.id ? { ...u, enabled: !u.enabled } : u)),
    );
    const updated = this.users().find(u => u.id === user.id);
    this.messageService.add({
      severity: updated?.enabled ? 'success' : 'warn',
      summary: updated?.enabled ? 'Aktywowano' : 'Dezaktywowano',
      detail: `Konto ${user.firstName} ${user.lastName} zostało ${updated?.enabled ? 'aktywowane' : 'dezaktywowane'}.`,
      life: 3000,
    });
  }

  onGlobalFilter(event: Event): void {
    this.globalFilter.set((event.target as HTMLInputElement).value);
  }
}
