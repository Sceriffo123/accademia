import { 
  getUserByEmail, 
  getUserById, 
  createUser, 
  verifyPassword,
  type User 
} from './localDatabase';

export interface AuthResponse {
  user?: User;
  token?: string;
  error?: string;
}

// Generazione token JWT semplificato
function generateToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 giorni
  };
  return btoa(JSON.stringify(payload));
}

// Verifica token JWT
export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.userId };
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

// Registrazione utente
export async function signUp(email: string, password: string, fullName: string): Promise<AuthResponse> {
  try {
    // Verifica se l'utente esiste già
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return { error: 'Email già registrata' };
    }

    // Hash della password
    const passwordHash = await hashPassword(password);

    // Crea nuovo utente
    const newUser = await createUser(email, fullName, passwordHash);
    
    if (!newUser) {
      return { error: 'Errore nella creazione dell\'utente' };
    }

    // Genera token
    const token = generateToken(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        created_at: newUser.created_at
      },
      token
    };
  } catch (error) {
    console.error('Errore registrazione:', error);
    return { error: 'Errore durante la registrazione' };
  }
}

// Login utente
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    // Trova utente
    const user = await getUserByEmail(email);
    if (!user) {
      return { error: 'Email o password non validi' };
    }

    // Verifica password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return { error: 'Email o password non validi' };
    }

    // Genera token
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      },
      token
    };
  } catch (error) {
    console.error('Errore login:', error);
    return { error: 'Errore durante il login' };
  }
}

// Ottieni utente da ID
export async function getCurrentUser(id: string): Promise<User | null> {
  try {
    const user = await getUserById(id);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Errore recupero utente:', error);
    return null;
  }
}