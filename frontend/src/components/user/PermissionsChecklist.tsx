import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface Permission {
  id: string;
  label: string;
  checked: boolean;
}

export const ALL_PERMISSIONS: Omit<Permission, 'checked'>[] = [
  { id: 'view_inventory', label: 'View Inventory' },
  { id: 'add_edit_inventory', label: 'Add/Edit Inventory' },
  { id: 'delete_inventory', label: 'Delete Inventory' },
  { id: 'view_transactions', label: 'View Transactions' },
  { id: 'create_transactions', label: 'Create Transactions' },
  { id: 'view_reports', label: 'View Reports' },
  { id: 'manage_customers', label: 'Manage Customers' },
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'manage_settings', label: 'Manage Settings' },
  { id: 'view_service_queue', label: 'View Service Queue' },
  { id: 'manage_service_queue', label: 'Manage Service Queue' },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  Admin: ALL_PERMISSIONS.map((p) => p.id),
  User: [
    'view_inventory',
    'add_edit_inventory',
    'view_transactions',
    'create_transactions',
    'view_reports',
    'manage_customers',
    'view_service_queue',
    'manage_service_queue',
  ],
  Kasir: ['view_inventory', 'view_transactions', 'create_transactions'],
};

export function getDefaultPermissions(role: string): Permission[] {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
  return ALL_PERMISSIONS.map((p) => ({ ...p, checked: defaults.includes(p.id) }));
}

interface PermissionsChecklistProps {
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

export function PermissionsChecklist({ permissions, onChange, disabled }: PermissionsChecklistProps) {
  const handleToggle = (id: string, checked: boolean) => {
    onChange(permissions.map((p) => (p.id === id ? { ...p, checked } : p)));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {permissions.map((permission) => (
        <div key={permission.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30">
          <Checkbox
            id={`perm-${permission.id}`}
            checked={permission.checked}
            onCheckedChange={(val) => handleToggle(permission.id, !!val)}
            disabled={disabled}
          />
          <Label
            htmlFor={`perm-${permission.id}`}
            className="text-sm font-normal cursor-pointer select-none"
          >
            {permission.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
