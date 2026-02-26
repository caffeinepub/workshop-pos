import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'Admin' | 'User' | 'Kasir';
export type UserAccessibility = string; // now stored as JSON array of permission IDs

export interface Permission {
  id: string;
  label: string;
  checked: boolean;
}

export interface WorkshopUser {
  id: string;
  name: string;
  username: string;
  password: string;
  userRole: UserRole;
  accessibility: UserAccessibility; // JSON string of permission IDs
  avatar?: string;
}

interface AuthContextType {
  currentUser: WorkshopUser | null;
  users: WorkshopUser[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (params: { name: string; username: string; password: string; userRole: UserRole; accessibility: UserAccessibility; avatar?: string }) => void;
  updateUser: (id: string, updates: Partial<WorkshopUser>) => void;
  deleteUser: (id: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_ADMIN: WorkshopUser = {
  id: 'admin-default',
  name: 'Administrator',
  username: 'admin',
  password: 'admin123',
  userRole: 'Admin',
  accessibility: JSON.stringify([
    'view_inventory', 'add_edit_inventory', 'delete_inventory',
    'view_transactions', 'create_transactions', 'view_reports',
    'manage_customers', 'manage_users', 'manage_settings',
    'view_service_queue', 'manage_service_queue',
  ]),
};

function migrateRole(role: string): UserRole {
  if (role === 'Teknisi') return 'User';
  if (role === 'Admin' || role === 'User' || role === 'Kasir') return role as UserRole;
  return 'User';
}

function loadUsers(): WorkshopUser[] {
  try {
    const stored = localStorage.getItem('workshop_users');
    if (stored) {
      const parsed: WorkshopUser[] = JSON.parse(stored);
      // Migrate old roles
      return parsed.map((u) => ({ ...u, userRole: migrateRole(u.userRole) }));
    }
  } catch {
    // ignore
  }
  return [DEFAULT_ADMIN];
}

function saveUsers(users: WorkshopUser[]) {
  localStorage.setItem('workshop_users', JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<WorkshopUser[]>(loadUsers);
  const [currentUser, setCurrentUser] = useState<WorkshopUser | null>(() => {
    try {
      const stored = localStorage.getItem('workshop_current_user');
      if (stored) {
        const u: WorkshopUser = JSON.parse(stored);
        return { ...u, userRole: migrateRole(u.userRole) };
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('workshop_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('workshop_current_user');
    }
  }, [currentUser]);

  const login = (username: string, password: string): boolean => {
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
      const migrated = { ...user, userRole: migrateRole(user.userRole) };
      setCurrentUser(migrated);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = (params: { name: string; username: string; password: string; userRole: UserRole; accessibility: UserAccessibility; avatar?: string }) => {
    const newUser: WorkshopUser = {
      id: `user-${Date.now()}`,
      ...params,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<WorkshopUser>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...updates };
        if (updates.userRole) updated.userRole = migrateRole(updates.userRole);
        return updated;
      })
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...updates };
        if (updates.userRole) updated.userRole = migrateRole(updates.userRole);
        return updated;
      });
    }
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        isAuthenticated: !!currentUser,
      },
    },
    children
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
