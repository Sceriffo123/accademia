<<<<<<< HEAD
import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn as authSignIn, signUp as authSignUp, getCurrentUser, verifyToken, type User } from '../lib/auth';
=======
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localDB, type User } from '../lib/localDatabase';
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
<<<<<<< HEAD
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
=======
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => void;
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

<<<<<<< HEAD
export function AuthProvider({ children }: { children: React.ReactNode }) {
=======
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
<<<<<<< HEAD
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
=======
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
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  async function signIn(email: string, password: string) {
    const response = await authSignIn(email, password);
    
    if (response.error) {
      return { error: response.error };
=======
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
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c
    }

<<<<<<< HEAD
    if (response.user && response.token) {
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
=======
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
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c
    }

    return { error: null };
  }

<<<<<<< HEAD
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
=======
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
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

<<<<<<< HEAD
export function useAuth() {
=======
export function useAuth(): AuthContextType {
>>>>>>> aac547e7562aa787a54e24116dd3317f65d7dc6c
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}