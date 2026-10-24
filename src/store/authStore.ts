// Auth store using Zustand
import { create } from 'zustand';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../lib/auth';

interface AuthState {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  loginWithRole: (role: UserRole) => void;
  logout: () => void;
}

const SAVED_ROLE_KEY = 'apaar_active_demo_role';

const initialRole = (localStorage.getItem(SAVED_ROLE_KEY) as UserRole) || 'Admin';

export const useAuthStore = create<AuthState>((set) => ({
  user: DEMO_USERS[initialRole] || DEMO_USERS.Admin,
  role: initialRole,
  isAuthenticated: true,

  loginWithRole: (role: UserRole) => {
    localStorage.setItem(SAVED_ROLE_KEY, role);
    set({
      role,
      user: DEMO_USERS[role],
      isAuthenticated: true,
    });
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));
