import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrimeNG } from 'primeng/config';
import { ManagedRole } from '../users/users.models';
import { UpsertManagedRoleRequest, UsersService } from '../../services/users.service';
import { ensureUsersPrimeNgTheme } from '../../shared/users-primeng-theme';

type DialogMode = 'create' | 'edit';

interface AttributeEditorRow {
  key: string;
  values: string;
}

@Component({
  selector: 'app-roles-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './roles-management.component.html',
  styleUrl: './roles-management.component.css',
})
export class RolesManagementComponent implements OnInit {
  roles = signal<ManagedRole[]>([]);
  loading = signal(false);
  saving = signal(false);
  dialogVisible = signal(false);
  dialogMode = signal<DialogMode>('create');
  editingRoleName = signal<string | null>(null);

  roleName = '';
  roleDescription = '';
  attributeRows: AttributeEditorRow[] = [];

  constructor(
    private readonly usersService: UsersService,
    private readonly confirmationService: ConfirmationService,
    private readonly messageService: MessageService,
    private readonly primeng: PrimeNG,
  ) {
    // Roles page can be the first remote route visited, so force theme init here too.
    ensureUsersPrimeNgTheme(this.primeng);
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.usersService
      .getManagedRoles()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: roles => this.roles.set(roles ?? []),
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się pobrać listy ról.',
          });
        },
      });
  }

  openCreateDialog(): void {
    this.dialogMode.set('create');
    this.editingRoleName.set(null);
    this.roleName = '';
    this.roleDescription = '';
    this.attributeRows = [];
    this.dialogVisible.set(true);
  }

  openEditDialog(role: ManagedRole): void {
    this.dialogMode.set('edit');
    this.editingRoleName.set(role.name);
    this.roleName = role.name;
    this.roleDescription = role.description ?? '';
    this.attributeRows = this.toAttributeRows(role.attributes);
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  addAttributeRow(): void {
    this.attributeRows = [...this.attributeRows, { key: '', values: '' }];
  }

  removeAttributeRow(index: number): void {
    this.attributeRows = this.attributeRows.filter((_, i) => i !== index);
  }

  saveRole(): void {
    const normalizedName = this.roleName.trim();
    if (!normalizedName) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Walidacja',
        detail: 'Nazwa roli jest wymagana.',
      });
      return;
    }

    const attributes = this.parseAttributesOrThrow();
    if (!attributes) {
      return;
    }

    const request: UpsertManagedRoleRequest = {
      name: normalizedName,
      description: this.roleDescription.trim() || undefined,
      attributes,
    };

    this.saving.set(true);
    const mode = this.dialogMode();
    const operation = mode === 'create'
      ? this.usersService.createManagedRole(request)
      : this.usersService.updateManagedRole(this.editingRoleName() ?? normalizedName, request);

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.dialogVisible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: mode === 'create' ? 'Rola dodana' : 'Rola zaktualizowana',
            detail: `Operacja dla roli '${normalizedName}' zakończona sukcesem.`,
          });
          this.loadRoles();
        },
        error: (error) => {
          const detail = error?.error?.detail ?? 'Nie udało się zapisać roli.';
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd zapisu',
            detail,
          });
        },
      });
  }

  confirmDelete(role: ManagedRole): void {
    this.confirmationService.confirm({
      header: 'Usuń rolę',
      message: `Czy na pewno usunąć rolę '${role.name}'?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.deleteRole(role.name),
    });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Nowa rola' : 'Edycja roli';
  }

  roleAttributeEntries(role: ManagedRole): Array<{ key: string; value: string }> {
    return Object.entries(role.attributes ?? {}).map(([key, values]) => ({
      key,
      value: (values ?? []).join(', '),
    }));
  }

  private deleteRole(roleName: string): void {
    this.usersService.deleteManagedRole(roleName).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Rola usunięta',
          detail: `Usunięto rolę '${roleName}'.`,
        });
        this.loadRoles();
      },
      error: (error) => {
        const detail = error?.error?.detail ?? 'Nie udało się usunąć roli.';
        this.messageService.add({
          severity: 'error',
          summary: 'Błąd usuwania',
          detail,
        });
      },
    });
  }

  private toAttributeRows(attributes: Record<string, string[]>): AttributeEditorRow[] {
    return Object.entries(attributes ?? {}).map(([key, values]) => ({
      key,
      values: (values ?? []).join(', '),
    }));
  }

  private parseAttributesOrThrow(): Record<string, string[]> | null {
    const result: Record<string, string[]> = {};

    for (const row of this.attributeRows) {
      const key = row.key.trim();
      const rawValues = row.values.trim();

      if (!key && !rawValues) {
        continue;
      }

      if (!key) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Walidacja',
          detail: 'Każdy atrybut musi mieć klucz.',
        });
        return null;
      }

      const values = rawValues
        .split(',')
        .map(value => value.trim())
        .filter(value => !!value);

      if (values.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Walidacja',
          detail: `Atrybut '${key}' musi mieć co najmniej jedną wartość.`,
        });
        return null;
      }

      result[key] = values;
    }

    return result;
  }
}