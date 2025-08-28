import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getUserByEmail, 
  getUserById, 
  createUser, 
  verifyPassword,
  type User 
} from '../lib/neonDatabase';
import { AuthMiddleware, type AuthContext as AuthContextType } from '../lib/authMiddleware';
import { Role } from '../lib/rbac';

interface AuthProviderContextType extends AuthContextType {
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

// Generazione token JWT semplificato
function generateToken(userEmail: string): string {
  const payload = {
    email: userEmail,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 giorni
  };
  return btoa(JSON.stringify(payload));
}

// Verifica token JWT
function verifyToken(token: string): { email: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null;
    }
    return { email: payload.email };
  } catch {
    return null;
  }
}

// Hash password usando Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'accademia_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const AuthContext = createContext<AuthProviderContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authContext, setAuthContext] = useState<AuthContextType>({
    user: null,
    isAuthenticated: false,
    permissions: {
      hasPermission: () => false,
      canAccessAdmin: () => false,
      canUseDevTools: () => false,
      getRoleLevel: () => 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshAuth();
  }, []);

  async function refreshAuth() {
    const token = localStorage.getItem('auth_token');
    const newAuthContext = await AuthMiddleware.createAuthContext(token || undefined);
    setAuthContext(newAuthContext);
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    console.log('🔐 AUTH DEBUG: signIn chiamato', { email, passwordLength: password.length });
    
    try {
      console.log('🔐 AUTH DEBUG: Ricerca utente nel database...');
      // Trova utente nel database Neon
      const user = await getUserByEmail(email);
      console.log('🔐 AUTH DEBUG: Utente trovato:', user ? 'SI' : 'NO');
      
      if (!user) {
        console.log('🔐 AUTH DEBUG: Utente non trovato');
        return { error: 'Email o password non validi' };
      }

      console.log('🔐 AUTH DEBUG: Verifica password...');
      // Verifica password
      const isValidPassword = await verifyPassword(password, user.password_hash);
      console.log('🔐 AUTH DEBUG: Password valida:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('🔐 AUTH DEBUG: Password non valida');
        return { error: 'Email o password non validi' };
      }

      console.log('🔐 AUTH DEBUG: Generazione token...');
      // Genera token
      const token = generateToken(user.email);
      localStorage.setItem('auth_token', token);

      // Aggiorna contesto auth con nuovo token
      await refreshAuth();
      
      console.log('🔐 AUTH DEBUG: Login completato con successo');
      return { error: null };
    } catch (error) {
      console.error('🔐 AUTH DEBUG: Errore login:', error);
      return { error: 'Errore durante il login' };
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      // Verifica se l'utente esiste già
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return { error: 'Email già registrata' };
      }

      if (password.length < 6) {
        return { error: 'La password deve essere di almeno 6 caratteri' };
      }

      // Hash della password
      const passwordHash = await hashPassword(password);

      // Crea nuovo utente nel database Neon
      const newUser = await createUser(email, fullName, passwordHash);
      
      if (!newUser) {
        return { error: 'Errore nella creazione dell\'utente' };
      }

      // Genera token
      const token = generateToken(newUser.email);
      localStorage.setItem('auth_token', token);

      // Aggiorna contesto auth con nuovo token
      await refreshAuth();
      
      return { error: null };
    } catch (error) {
      console.error('Errore registrazione:', error);
      return { error: 'Errore durante la registrazione' };
    }
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