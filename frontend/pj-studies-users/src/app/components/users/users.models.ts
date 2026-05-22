export interface ManagedUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  roles: string[];
}

export interface UserRoleDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface SaveMessage {
  severity: 'success' | 'error' | 'info';
  text: string;
  life: number;
}
