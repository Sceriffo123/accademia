import { 
  localDB,
  type Normative
} from './localDatabase';


export async function getNormatives(filters?: {
  searchTerm?: string;
  type?: string;
  category?: string;
}): Promise<Normative[]> {
  try {
    let normatives = await localDB.getAllNormatives();

    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      normatives = normatives.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.content.toLowerCase().includes(searchLower) ||
        n.reference_number.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.type && filters.type !== 'all') {
      normatives = normatives.filter(n => n.type === filters.type);
    }

    if (filters?.category && filters.category !== 'all') {
      normatives = normatives.filter(n => n.category === filters.category);
    }

    return normatives;
  } catch (error) {
    console.error('Error fetching normatives:', error);
    return [];
  }
}

export async function getNormativeById(id: string): Promise<Normative | null> {
  try {
    return await localDB.getNormativeById(id);
  } catch (error) {
    console.error('Error fetching normative:', error);
    return null;
  }
}

export async function getNormativesCount(): Promise<number> {
  try {
    return await localDB.getNormativesCount();
  } catch (error) {
    console.error('Error counting normatives:', error);
    return 0;
  }
}

export async function getRecentNormativesCount(days: number = 30): Promise<number> {
  try {
    return await localDB.getRecentNormativesCount(days);
  } catch (error) {
    console.error('Error counting recent normatives:', error);
    return 0;
  }
}

export async function getUsers(excludeSuperAdmin: boolean = false, currentUserId?: string): Promise<any[]> {
  try {
    const users = await localDB.getAllUsers();
    if (excludeSuperAdmin) {
      return users.filter(user => {
        if (user.role !== 'superadmin') return true;
        return currentUserId && user.id === currentUserId;
      });
    }
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getUsersCount(): Promise<number> {
  try {
    return await localDB.getUsersCount();
  } catch (error) {
    console.error('Error counting users:', error);
    return 0;
  }
}

export async function updateUser(id: string, data: { email?: string; full_name?: string; role?: 'user' | 'admin' | 'superadmin' | 'operator' }): Promise<any> {
  const { updateUser } = await import('./neonDatabase');
  return await updateUser(id, data);
}

export async function deleteUser(id: string): Promise<boolean> {
  const { deleteUser } = await import('./neonDatabase');
  return await deleteUser(id);
}

export async function createNewUser(email: string, fullName: string, password: string, role: 'user' | 'admin' | 'superadmin' | 'operator' = 'user'): Promise<any> {
  // Hash password usando la stessa funzione del database
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'accademia_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return await localDB.createUser(email, fullName, passwordHash, role);
}

export async function updateUserPassword(id: string, newPassword: string): Promise<boolean> {
  return await localDB.updateUserPassword(id, newPassword);
}