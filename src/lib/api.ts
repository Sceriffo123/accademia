import { 
  getAllNormatives, 
  getNormativeById, 
  getNormativesCount, 
  getRecentNormativesCount,
  getAllUsers,
  getUsersCount,
  type Normative 
} from './neonDatabase';

export type { Normative } from './neonDatabase';

export async function getNormatives(filters?: {
  searchTerm?: string;
  type?: string;
  category?: string;
}): Promise<Normative[]> {
  try {
    let normatives = await getAllNormatives();

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
    return await getNormativeById(id);
  } catch (error) {
    console.error('Error fetching normative:', error);
    return null;
  }
}

export async function getNormativesCount(): Promise<number> {
  try {
    return await getNormativesCount();
  } catch (error) {
    console.error('Error counting normatives:', error);
    return 0;
  }
}

export async function getRecentNormativesCount(days: number = 30): Promise<number> {
  try {
    return await getRecentNormativesCount(days);
  } catch (error) {
    console.error('Error counting recent normatives:', error);
    return 0;
  }
}

export async function getUsers(): Promise<any[]> {
  try {
    return await getAllUsers();
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getUsersCount(): Promise<number> {
  try {
    return await getUsersCount();
  } catch (error) {
    console.error('Error counting users:', error);
    return 0;
  }
}

export async function updateNormative(id: string, data: Partial<Omit<Normative, 'id' | 'created_at' | 'updated_at'>>): Promise<Normative | null> {
  try {
    const { updateNormative: updateNormativeDB } = await import('./neonDatabase');
    return await updateNormativeDB(id, data);
  } catch (error) {
    console.error('Error updating normative:', error);
    return null;
  }
}

export async function deleteNormative(id: string): Promise<boolean> {
  try {
    const { deleteNormative: deleteNormativeDB } = await import('./neonDatabase');
    return await deleteNormativeDB(id);
  } catch (error) {
    console.error('Error deleting normative:', error);
    return false;
  }
}