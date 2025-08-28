import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn as authSignIn, signUp as authSignUp, getCurrentUser, verifyToken, type User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica token esistente al caricamento
    const token = localStorage.getItem('auth_token');
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        fetchUser(decoded.userId);
      } else {
        localStorage.removeItem('auth_token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchUser(userId: string) {
    try {
      const userData = await getCurrentUser(userId);
      if (userData) {
        setUser(userData);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const response = await authSignIn(email, password);
    
    if (response.error) {
      return { error: response.error };
    }

    if (response.user && response.token) {
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
    }

    return { error: null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const response = await authSignUp(email, password, fullName);
    
    if (response.error) {
      return { error: response.error };
    }

    if (response.user && response.token) {
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
    }

    return { error: null };
  }

  async function signOut() {
    setUser(null);
    localStorage.removeItem('auth_token');
  }

  const value = {
    user,
    profile: user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
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