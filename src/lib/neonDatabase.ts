import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL!);

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Normative {
  id: string;
  title: string;
  type: 'law' | 'regulation' | 'ruling';
  reference_number: string;
  publication_date: string;
  content: string;
  summary?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// User functions
export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
  try {
    console.log('Creating user:', userData.email);
    const result = await sql`
      INSERT INTO users (email, full_name, role)
      VALUES (${userData.email}, ${userData.full_name}, ${userData.role})
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `;
    
    if (result.length > 0) {
      console.log('User created successfully:', result[0]);
      return result[0] as User;
    }
    
    // If no rows returned due to conflict, fetch existing user
    const existing = await sql`
      SELECT * FROM users WHERE email = ${userData.email}
    `;
    
    if (existing.length > 0) {
      console.log('User already exists:', existing[0]);
      return existing[0] as User;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log('Fetching user by email:', email);
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    
    if (result.length > 0) {
      console.log('User found:', result[0]);
      return result[0] as User;
    }
    
    console.log('User not found for email:', email);
    return null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    console.log('Fetching user by ID:', id);
    const result = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;
    
    if (result.length > 0) {
      console.log('User found by ID:', result[0]);
      return result[0] as User;
    }
    
    console.log('User not found for ID:', id);
    return null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    console.log('Fetching all users');
    const result = await sql`
      SELECT * FROM users ORDER BY created_at DESC
    `;
    
    console.log('Users fetched:', result.length);
    return result as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getUsersCount(): Promise<number> {
  try {
    console.log('Fetching users count');
    const result = await sql`
      SELECT COUNT(*) as count FROM users
    `;
    
    const count = parseInt(result[0].count as string);
    console.log('Users count:', count);
    return count;
  } catch (error) {
    console.error('Error fetching users count:', error);
    return 0;
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  try {
    const result = await sql`
      UPDATE users
      SET full_name = ${updates.full_name}, 
          role = ${updates.role}
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

// Normative functions
export async function createNormative(normativeData: Omit<Normative, 'id' | 'created_at' | 'updated_at'>): Promise<Normative | null> {
  try {
    console.log('Creating normative:', normativeData.title);
    const result = await sql`
      INSERT INTO normatives (title, type, reference_number, publication_date, content, summary, tags)
      VALUES (${normativeData.title}, ${normativeData.type}, ${normativeData.reference_number}, 
              ${normativeData.publication_date}, ${normativeData.content}, 
              ${normativeData.summary || null}, ${JSON.stringify(normativeData.tags || [])})
      ON CONFLICT (reference_number) DO NOTHING
      RETURNING *
    `;
    
    if (result.length > 0) {
      console.log('Normative created successfully:', result[0]);
      return result[0] as Normative;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating normative:', error);
    return null;
  }
}

export async function getNormatives(): Promise<Normative[]> {
  try {
    console.log('Fetching all normatives');
    const result = await sql`
      SELECT * FROM normatives ORDER BY publication_date DESC
    `;
    
    console.log('Normatives fetched:', result.length);
    return result as Normative[];
  } catch (error) {
    console.error('Error fetching normatives:', error);
    return [];
  }
}

export async function getNormativeById(id: string): Promise<Normative | null> {
  try {
    console.log('Fetching normative by ID:', id);
    const result = await sql`
      SELECT * FROM normatives WHERE id = ${id}
    `;
    
    if (result.length > 0) {
      console.log('Normative found:', result[0]);
      return result[0] as Normative;
    }
    
    console.log('Normative not found for ID:', id);
    return null;
  } catch (error) {
    console.error('Error fetching normative by ID:', error);
    return null;
  }
}

export async function getNormativesCount(): Promise<number> {
  try {
    console.log('Fetching normatives count');
    const result = await sql`
      SELECT COUNT(*) as count FROM normatives
    `;
    
    const count = parseInt(result[0].count as string);
    console.log('Normatives count:', count);
    return count;
  } catch (error) {
    console.error('Error fetching normatives count:', error);
    return 0;
  }
}

export async function updateNormative(id: string, updates: Partial<Normative>): Promise<Normative | null> {
  try {
    console.log('Updating normative:', id, updates);
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    
    if (updates.title !== undefined) {
      updateFields.push('title = $' + (values.length + 1));
      values.push(updates.title);
    }
    if (updates.type !== undefined) {
      updateFields.push('type = $' + (values.length + 1));
      values.push(updates.type);
    }
    if (updates.reference_number !== undefined) {
      updateFields.push('reference_number = $' + (values.length + 1));
      values.push(updates.reference_number);
    }
    if (updates.publication_date !== undefined) {
      updateFields.push('publication_date = $' + (values.length + 1));
      values.push(updates.publication_date);
    }
    if (updates.content !== undefined) {
      updateFields.push('content = $' + (values.length + 1));
      values.push(updates.content);
    }
    if (updates.summary !== undefined) {
      updateFields.push('summary = $' + (values.length + 1));
      values.push(updates.summary);
    }
    if (updates.tags !== undefined) {
      updateFields.push('tags = $' + (values.length + 1));
      values.push(JSON.stringify(updates.tags));
    }
    
    updateFields.push('updated_at = NOW()');
    values.push(id); // ID is always the last parameter
    
    const query = `
      UPDATE normatives 
      SET ${updateFields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    console.log('Update query:', query);
    console.log('Update values:', values);
    
    const result = await sql(query, values);
    
    if (result.length > 0) {
      console.log('Normative updated successfully:', result[0]);
      return result[0] as Normative;
    }
    
    console.log('No normative updated for ID:', id);
    return null;
  } catch (error) {
    console.error('Error updating normative:', error);
    return null;
  }
}

export async function deleteNormative(id: string): Promise<boolean> {
  try {
    console.log('Deleting normative:', id);
    const result = await sql`
      DELETE FROM normatives WHERE id = ${id}
      RETURNING id
    `;
    
    const success = result.length > 0;
    console.log('Normative deletion result:', success);
    return success;
  } catch (error) {
    console.error('Error deleting normative:', error);
    return false;
  }
}

// Initialize database with sample data
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing Neon database...');
    
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS normatives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        reference_number TEXT UNIQUE NOT NULL,
        publication_date DATE NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    // Insert sample admin user
    await createUser({
      email: 'admin@accademiatpl.org',
      full_name: 'Amministratore Sistema',
      role: 'admin'
    });
    
    // Insert sample normatives
    const sampleNormatives = [
      {
        title: 'Decreto Legislativo 285/1992',
        type: 'law' as const,
        reference_number: 'D.Lgs. 285/1992',
        publication_date: '1992-04-30',
        content: 'Nuovo codice della strada. Disciplina la circolazione stradale e stabilisce le norme di comportamento degli utenti della strada.',
        summary: 'Codice della Strada italiano',
        tags: ['trasporti', 'sicurezza', 'circolazione']
      },
      {
        title: 'Regolamento CE 561/2006',
        type: 'regulation' as const,
        reference_number: 'Reg. CE 561/2006',
        publication_date: '2006-03-15',
        content: 'Regolamento relativo all\'armonizzazione di alcune disposizioni in materia sociale nel settore dei trasporti su strada.',
        summary: 'Tempi di guida e riposo',
        tags: ['europa', 'tempi di guida', 'riposo']
      }
    ];
    
    for (const normative of sampleNormatives) {
      await createNormative(normative);
    }
    
    console.log('Database Neon inizializzato con successo!');
  } catch (error) {
    console.error('Errore inizializzazione database Neon:', error);
  }
}