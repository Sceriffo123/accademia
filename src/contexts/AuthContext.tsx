import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localDB, type User } from '../lib/localDatabase';

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize database and check for existing session
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      await localDB.initializeData();
      
      // Check for existing session
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const email = JSON.parse(atob(token.split('.')[1])).email;
          const existingUser = await localDB.getUserByEmail(email);
          if (existingUser) {
            setUser(existingUser);
          }
        } catch (error) {
          console.error('Invalid token:', error);
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    try {
      const user = await localDB.getUserByEmail(email);
      if (!user) {
        return false;
      }

      const isValid = await localDB.verifyPassword(password, user.password_hash);
      if (!isValid) {
        return false;
      }

      // Create simple JWT-like token
      const token = btoa(JSON.stringify({ email, exp: Date.now() + 24 * 60 * 60 * 1000 }));
      localStorage.setItem('auth_token', token);
      setUser(user);
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  }

  async function signUp(email: string, password: string, fullName: string): Promise<boolean> {
    try {
      // Check if user already exists
      const existingUser = await localDB.getUserByEmail(email);
      if (existingUser) {
        return false;
      }

      // Hash password and create user
      const passwordHash = await localDB.hashPassword(password);
      const newUser = await localDB.createUser(email, fullName, passwordHash);
      
      // Auto sign in
      const token = btoa(JSON.stringify({ email, exp: Date.now() + 24 * 60 * 60 * 1000 }));
      localStorage.setItem('auth_token', token);
      setUser(newUser);
      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      return false;
    }
  }

  function signOut() {
    localStorage.removeItem('auth_token');
    setUser(null);
  }

  const value: AuthContextType = {
    user,
    profile: user, // For compatibility with existing code
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}