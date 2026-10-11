"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

type UserRole = 'ROOT_ADMIN' | 'OWNER' | 'MANAGER' | 'AGENT' | 'RENTER' | null;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agencyId?: string;
  agencyName?: string;
  isVerified?: boolean;
  emailVerifiedAt?: string | null;
  onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  onboardingCurrentStep?: number;
  isImpersonated?: boolean;
  impersonatorId?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  exitImpersonation: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data && data.user) {
        setUser(data.user);
        setRole(data.user.role);
        return data.user;
      }
    } catch (e) {
      // Not authenticated or error
    }
    return null;
  };

  useEffect(() => {
    // Hydrate user by calling the API using the HttpOnly cookie
    const fetchUser = async () => {
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    
    setUser(data.user);
    setRole(data.user.role);

    // Gating checks
    if (data.user.isVerified === false) {
      router.push('/verify-email');
      return;
    }

    if (data.user.role === 'OWNER' && data.user.onboardingStatus !== 'COMPLETED') {
      router.push('/onboarding');
      return;
    }

    // Route based on real role
    switch (data.user.role) {
      case 'ROOT_ADMIN': router.push('/admin'); break;
      case 'OWNER': router.push('/dashboard'); break;
      case 'MANAGER': router.push('/dashboard'); break;
      case 'AGENT': router.push('/agent'); break;
      case 'RENTER': router.push('/portal'); break;
      default: router.push('/login');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    }
    setRole(null);
    setUser(null);
    router.push('/login');
  };

  // Exit an impersonation session: swaps the cookie back to the founder's own
  // session and returns them to the platform console.
  const exitImpersonation = async () => {
    const { data } = await api.post('/auth/exit-impersonation');
    setUser(data.user);
    setRole(data.user.role);
    router.push('/admin');
  };

  return (
    <AuthContext.Provider
      value={{ user, role, isLoading, login, logout, exitImpersonation, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
