import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import api, { setOnUnauthorizedCallback } from '../api/client';
import {
  saveAuthToken,
  getAuthToken,
  deleteAuthToken,
  saveUserProfile,
  getUserProfile,
  clearSession,
} from '../storage/secure';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  isOwnerOrManager: boolean;
  isAgent: boolean;
  isRenter: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auto-restore session from hardware-backed secure store
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await getAuthToken();
        if (token) {
          const cached = await getUserProfile();
          if (cached) {
            setUser(cached);
            setRole(cached.role);
          }
          // Validate with server
          await refreshUser();
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();

    // Hook unauthorized interceptor to reset state and navigate to login
    setOnUnauthorizedCallback(() => {
      setUser(null);
      setRole(null);
      router.replace('/(auth)/login');
    });
  }, []);

  const refreshUser = async (): Promise<User | null> => {
    try {
      const { data } = await api.get('/auth/me');
      if (data?.user) {
        setUser(data.user);
        setRole(data.user.role);
        await saveUserProfile(data.user);
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await api.post('/auth/login', { email, password });
    const { access_token, user: loggedUser } = data;

    await saveAuthToken(access_token);
    await saveUserProfile(loggedUser);

    setUser(loggedUser);
    setRole(loggedUser.role);

    return loggedUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort server notification
    }
    await clearSession();
    setUser(null);
    setRole(null);
    router.replace('/(auth)/login');
  };

  const isOwnerOrManager = role === 'OWNER' || role === 'MANAGER';
  const isAgent = role === 'AGENT';
  const isRenter = role === 'RENTER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        login,
        logout,
        refreshUser,
        isOwnerOrManager,
        isAgent,
        isRenter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
