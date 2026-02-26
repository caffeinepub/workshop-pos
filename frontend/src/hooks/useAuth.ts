import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface WorkshopUser {
  username: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
  photoBase64?: string;
  isAdmin?: boolean;
}

interface AuthState {
  currentUser: WorkshopUser | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getAllUsers: () => WorkshopUser[];
  addUser: (username: string, password: string, photoBase64?: string) => boolean;
  deleteUser: (username: string) => boolean;
  updateUserPhoto: (username: string, photoBase64: string) => void;
}

// Storage keys
const USERS_KEY = 'workshopUsers';
const CURRENT_USER_KEY = 'workshopCurrentUser';

// Default admin user
const DEFAULT_ADMIN: WorkshopUser = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  name: 'Administrator',
  isAdmin: true,
};

// Get users from localStorage, seeding admin if needed
function getUsers(): WorkshopUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      const initial = [DEFAULT_ADMIN];
      localStorage.setItem(USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = [DEFAULT_ADMIN];
      localStorage.setItem(USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const users: WorkshopUser[] = parsed;
    // Ensure admin always exists with correct password
    const hasAdmin = users.some(
      (u) => u.username === 'admin' && u.password === 'admin123'
    );
    if (!hasAdmin) {
      const withAdmin = [DEFAULT_ADMIN, ...users.filter((u) => u.username !== 'admin')];
      localStorage.setItem(USERS_KEY, JSON.stringify(withAdmin));
      return withAdmin;
    }
    return users;
  } catch {
    const initial = [DEFAULT_ADMIN];
    localStorage.setItem(USERS_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveUsers(users: WorkshopUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
function AuthProviderComponent({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Seed admin user on initialization
    getUsers();
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      if (raw) {
        const user: WorkshopUser = JSON.parse(raw);
        if (user && user.username && user.password) {
          return { currentUser: user, isAuthenticated: true };
        }
      }
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    return { currentUser: null, isAuthenticated: false };
  });

  // Re-seed admin on mount to ensure it always exists
  useEffect(() => {
    getUsers();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (!trimmedUsername || !trimmedPassword) {
        return { success: false, error: 'Username dan password tidak boleh kosong' };
      }

      const users = getUsers();
      const user = users.find(
        (u) => u.username === trimmedUsername && u.password === trimmedPassword
      );

      if (!user) {
        return { success: false, error: 'Username atau password salah' };
      }

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      setAuthState({ currentUser: user, isAuthenticated: true });
      return { success: true };
    } catch {
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }
  };

  const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setAuthState({ currentUser: null, isAuthenticated: false });
  };

  const getAllUsers = (): WorkshopUser[] => {
    return getUsers();
  };

  const addUser = (username: string, password: string, photoBase64?: string): boolean => {
    try {
      const users = getUsers();
      if (users.find((u) => u.username === username)) return false;
      users.push({
        username,
        password,
        role: 'user',
        name: username,
        photoBase64,
        isAdmin: false,
      });
      saveUsers(users);
      return true;
    } catch {
      return false;
    }
  };

  const deleteUser = (username: string): boolean => {
    if (username === 'admin') return false;
    try {
      const users = getUsers().filter((u) => u.username !== username);
      saveUsers(users);
      return true;
    } catch {
      return false;
    }
  };

  const updateUserPhoto = (username: string, photoBase64: string): void => {
    try {
      const users = getUsers().map((u) =>
        u.username === username ? { ...u, photoBase64 } : u
      );
      saveUsers(users);
      // Update current user in storage if it's the same user
      if (authState.currentUser?.username === username) {
        const updated = { ...authState.currentUser, photoBase64 };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
        setAuthState((prev) => ({ ...prev, currentUser: updated }));
      }
    } catch {
      // ignore
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    getAllUsers,
    addUser,
    deleteUser,
    updateUserPhoto,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// Export provider
export const AuthProvider = AuthProviderComponent;

// Hook
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
