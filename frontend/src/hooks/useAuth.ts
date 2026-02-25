// Authentication hook managing login/logout state and user CRUD in localStorage
import { useState, useCallback } from 'react';

export interface WorkshopUser {
  username: string;
  password: string;
  photoBase64?: string;
  isAdmin?: boolean;
}

const USERS_KEY = 'workshopUsers';
const CURRENT_USER_KEY = 'currentUser';

const DEFAULT_ADMIN: WorkshopUser = {
  username: 'admin',
  password: 'admin123',
  isAdmin: true,
};

function getUsers(): WorkshopUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
      return [DEFAULT_ADMIN];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // Data corrupt, reset
      localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
      return [DEFAULT_ADMIN];
    }
    const users: WorkshopUser[] = parsed;
    // Always ensure admin exists with correct plain-text password
    const adminIndex = users.findIndex((u) => u.username === 'admin');
    if (adminIndex === -1) {
      const withAdmin = [DEFAULT_ADMIN, ...users];
      localStorage.setItem(USERS_KEY, JSON.stringify(withAdmin));
      return withAdmin;
    } else {
      // Force admin password to be plain text 'admin123' in case it was hashed before
      const admin = users[adminIndex];
      if (admin.password !== 'admin123') {
        users[adminIndex] = { ...admin, password: 'admin123', isAdmin: true };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      return users;
    }
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
}

function saveUsers(users: WorkshopUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CURRENT_USER_KEY);
    } catch {
      return null;
    }
  });

  const login = useCallback((username: string, password: string): boolean => {
    try {
      const users = getUsers();
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      const user = users.find(
        (u) => u.username === trimmedUsername && u.password === trimmedPassword
      );
      if (user) {
        localStorage.setItem(CURRENT_USER_KEY, trimmedUsername);
        setCurrentUser(trimmedUsername);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch {
      // ignore
    }
    setCurrentUser(null);
  }, []);

  const getAllUsers = useCallback((): WorkshopUser[] => {
    return getUsers();
  }, []);

  const addUser = useCallback((username: string, password: string, photoBase64?: string): boolean => {
    try {
      const users = getUsers();
      if (users.find((u) => u.username === username)) return false;
      users.push({ username, password, photoBase64 });
      saveUsers(users);
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteUser = useCallback((username: string): boolean => {
    if (username === 'admin') return false;
    try {
      const users = getUsers().filter((u) => u.username !== username);
      saveUsers(users);
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateUserPhoto = useCallback((username: string, photoBase64: string) => {
    try {
      const users = getUsers().map((u) =>
        u.username === username ? { ...u, photoBase64 } : u
      );
      saveUsers(users);
    } catch {
      // ignore
    }
  }, []);

  const isAuthenticated = currentUser !== null;
  const isAdmin = currentUser === 'admin';

  return {
    currentUser,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    getAllUsers,
    addUser,
    deleteUser,
    updateUserPhoto,
  };
}
