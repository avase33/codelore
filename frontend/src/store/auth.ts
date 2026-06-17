import { create } from 'zustand';
import { authApi } from '../lib/api';

interface User {
  _id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  role: 'user' | 'pro' | 'admin';
  githubUsername?: string;
  docsGenerated: number;
  reposConnected: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; fullName?: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('cl_access_token', data.accessToken);
      localStorage.setItem('cl_refresh_token', data.refreshToken);
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (regData) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.register(regData);
      localStorage.setItem('cl_access_token', data.accessToken);
      localStorage.setItem('cl_refresh_token', data.refreshToken);
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('cl_access_token');
    localStorage.removeItem('cl_refresh_token');
    set({ user: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('cl_access_token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const { data } = await authApi.me();
      set({ user: data.user, isInitialized: true });
    } catch {
      localStorage.removeItem('cl_access_token');
      localStorage.removeItem('cl_refresh_token');
      set({ user: null, isInitialized: true });
    }
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('cl_access_token', accessToken);
    localStorage.setItem('cl_refresh_token', refreshToken);
  },
}));
