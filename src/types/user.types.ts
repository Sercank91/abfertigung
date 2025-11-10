/**
 * User Types
 * Definiert alle User-bezogenen TypeScript Interfaces
 */

export interface User {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  tenantId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type UserRole = 'admin' | 'mitarbeiter' | 'sachbearbeiter';

export interface UserPayload {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
}

export interface UserSelectOption {
  value: string;
  label: string;
}
