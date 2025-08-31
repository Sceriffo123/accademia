import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getUserByEmail,
  getUserById,
  createUser,
  verifyPassword,
  type User 
} from '../lib/neonDatabase';

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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
        fetchUserByEmail(decoded.email);
      } else {
        localStorage.removeItem('auth_token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchUserByEmail(email: string) {
    try {
      const userData = await getUserByEmail(email);
      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          created_at: userData.created_at
        });
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
    console.log('🎓 ACCADEMIA: Tentativo di accesso per:', email);
    
    try {
      // Trova utente nel database Neon
      const user = await getUserByEmail(email);
      
      if (!user) {
        console.log('🎓 ACCADEMIA: Credenziali non riconosciute');
        return { error: 'Email o password non validi' };
      }

      // Verifica password
      const isValidPassword = await verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        console.log('🎓 ACCADEMIA: Credenziali non valide');
        return { error: 'Email o password non validi' };
      }

      // Genera token
      const token = generateToken(user.email);

      // Imposta utente
      setUser({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      });
      
      localStorage.setItem('auth_token', token);
      console.log('🎓 ACCADEMIA: Accesso autorizzato per:', user.full_name, `(${user.role})`);
      return { error: null };
    } catch (error) {
      console.error('🚨 ACCADEMIA: Errore durante l\'autenticazione:', error?.message);
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

      // Imposta utente
      setUser({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        created_at: newUser.created_at
      });
      
      localStorage.setItem('auth_token', token);
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