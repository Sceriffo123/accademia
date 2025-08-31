import { neon } from '@neondatabase/serverless';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions';

// Inizializza connessione Neon
const sql = neon(import.meta.env.VITE_DATABASE_URL);

export interface User {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: 'user' | 'admin' | 'superadmin' | 'operator';
  created_at: string;
  updated_at?: string;
}

export interface Normative {
  id: string;
  title: string;
  content: string;
  category: string;
  type: 'law' | 'regulation' | 'ruling';
  reference_number: string;
  publication_date: string;
  effective_date: string;
  tags: string[];
  file_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  filename: string;
  file_url?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  type: 'template' | 'form' | 'guide' | 'report';
  category: string;
  tags?: string[];
  version?: string;
  status?: 'active' | 'draft' | 'archived';
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  download_count?: number;
}

// Hash password usando Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'accademia_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verifica password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// === FUNZIONI UTENTI ===

export async function createUser(email: string, fullName: string, passwordHash: string, role: 'user' | 'admin' | 'superadmin' | 'operator' = 'user'): Promise<User | null> {
  try {
    console.log('🎓 NEON: Creazione utente:', email);
    const result = await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES (${email}, ${fullName}, ${passwordHash}, ${role})
      RETURNING id, email, full_name, role, created_at
    `;
    console.log('🎓 NEON: Utente creato con successo');
    return result[0] as User;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione utente:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log('🎓 NEON: Ricerca utente per email:', email);
    const result = await sql`
      SELECT id, email, full_name, password_hash, role, created_at
      FROM users
      WHERE email = ${email}
    `;
    console.log('🎓 NEON: Risultato ricerca:', result.length > 0 ? 'Utente trovato' : 'Utente non trovato');
    return result[0] as User || null;
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca utente per email:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    console.log('🎓 NEON: Ricerca utente per ID:', id);
    const result = await sql`
      SELECT id, email, full_name, role, created_at
      FROM users
      WHERE id = ${id}
    `;
    return result[0] as User || null;
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca utente per ID:', error);
    return null;
  }
}

export async function getAllUsers(excludeSuperAdmin: boolean = false, currentUserId?: string): Promise<User[]> {
  try {
    console.log('🎓 NEON: Recupero tutti gli utenti');
    let query = sql`
      SELECT id, email, full_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    const result = await query;
    let users = result as User[];
    
    if (excludeSuperAdmin) {
      users = users.filter(u => u.role !== 'superadmin');
    }
    
    if (currentUserId) {
      users = users.filter(u => u.id !== currentUserId);
    }
    
    return users;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero utenti:', error);
    return [];
  }
}

export async function getUsersCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('🚨 NEON: Errore conteggio utenti:', error);
    return 0;
  }
}

export async function updateUser(id: string, data: { email?: string; full_name?: string; role?: 'user' | 'admin' | 'superadmin' | 'operator' }): Promise<User | null> {
  try {
    console.log('🎓 NEON: Aggiornamento utente:', id);
    const updates = [];
    const values = [];
    
    if (data.email) {
      updates.push('email = $' + (values.length + 1));
      values.push(data.email);
    }
    if (data.full_name) {
      updates.push('full_name = $' + (values.length + 1));
      values.push(data.full_name);
    }
    if (data.role) {
      updates.push('role = $' + (values.length + 1));
      values.push(data.role);
    }
    
    if (updates.length === 0) return null;
    
    updates.push('updated_at = NOW()');
    values.push(id);
    
    const result = await sql`
      UPDATE users 
      SET ${sql.unsafe(updates.join(', '))}
      WHERE id = ${id}
      RETURNING id, email, full_name, role, created_at
    `;
    
    return result[0] as User || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento utente:', error);
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Eliminazione utente:', id);
    await sql`DELETE FROM users WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione utente:', error);
    return false;
  }
}

export async function updateUserPassword(id: string, newPassword: string): Promise<boolean> {
  try {
    const passwordHash = await hashPassword(newPassword);
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento password:', error);
    return false;
  }
}

// === FUNZIONI NORMATIVE ===

export async function getAllNormatives(): Promise<Normative[]> {
  try {
    console.log('🎓 NEON: Recupero tutte le normative');
    const result = await sql`
      SELECT * FROM normatives
      ORDER BY publication_date DESC
    `;
    return result as Normative[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero normative:', error);
    return [];
  }
}

export async function getNormativeById(id: string): Promise<Normative | null> {
  try {
    console.log('🎓 NEON: Ricerca normativa per ID:', id);
    const result = await sql`
      SELECT * FROM normatives
      WHERE id = ${id}
    `;
    return result[0] as Normative || null;
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca normativa:', error);
    return null;
  }
}

export async function getNormativesCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM normatives`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('🚨 NEON: Errore conteggio normative:', error);
    return 0;
  }
}

export async function getRecentNormativesCount(days: number = 30): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM normatives 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('🚨 NEON: Errore conteggio normative recenti:', error);
    return 0;
  }
}

export async function getAllPermissions() {
  try {
    const result = await sql`
      SELECT DISTINCT permission_name 
      FROM user_permissions 
      ORDER BY permission_name
    `;
    return result.map(row => row.permission_name);
  } catch (error) {
    console.error('Error getting all permissions:', error);
    throw error;
  }
}

// === FUNZIONI DOCUMENTI ===

export async function createDocument(data: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document | null> {
  try {
    console.log('🎓 NEON: Creazione documento:', data.title);
    const result = await sql`
      INSERT INTO documents (
        title, description, filename, file_url, file_path, file_size, 
        mime_type, type, category, tags, version, status, uploaded_by
      )
      VALUES (
        ${data.title}, ${data.description}, ${data.filename}, ${data.file_url}, 
        ${data.file_path}, ${data.file_size}, ${data.mime_type}, ${data.type}, 
        ${data.category}, ${data.tags}, ${data.version}, ${data.status}, ${data.uploaded_by}
      )
      RETURNING *
    `;
    return result[0] as Document;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione documento:', error);
    return null;
  }
}

export async function getAllDocuments(): Promise<Document[]> {
  try {
    console.log('🎓 NEON: Recupero tutti i documenti');
    const result = await sql`
      SELECT * FROM documents
      ORDER BY created_at DESC
    `;
    return result as Document[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero documenti:', error);
    return [];
  }
}

export async function getDocumentsCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM documents`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('🚨 NEON: Errore conteggio documenti:', error);
    return 0;
  }
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<Document | null> {
  try {
    console.log('🎓 NEON: Aggiornamento documento:', id);
    const result = await sql`
      UPDATE documents 
      SET 
        title = COALESCE(${data.title}, title),
        description = COALESCE(${data.description}, description),
        category = COALESCE(${data.category}, category),
        type = COALESCE(${data.type}, type),
        status = COALESCE(${data.status}, status),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] as Document || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento documento:', error);
    return null;
  }
}

// === FUNZIONI PERMESSI ===

export async function getUserPermissions(role: string): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero permessi per ruolo:', role);
    
    // Permessi basati sul ruolo
    const rolePermissions: Record<string, string[]> = {
      'superadmin': [
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
        'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete',
        'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.upload',
        'system.settings', 'system.permissions', 'system.logs'
      ],
      'admin': [
        'users.view', 'users.create', 'users.edit',
        'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete',
        'documents.view', 'documents.create', 'documents.edit', 'documents.upload',
        'system.logs'
      ],
      'operator': [
        'normatives.view', 'normatives.create',
        'documents.view', 'documents.create', 'documents.upload'
      ],
      'user': [
        'normatives.view',
        'documents.view'
      ]
    };
    
    return rolePermissions[role] || [];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero permessi:', error);
    return [];
  }
}

export async function getUserSections(role: string): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero sezioni per ruolo:', role);
    
    // Sezioni visibili basate sul ruolo
    const roleSections: Record<string, string[]> = {
      'superadmin': ['dashboard', 'normatives', 'education', 'documents', 'admin', 'superadmin'],
      'admin': ['dashboard', 'normatives', 'education', 'documents', 'admin'],
      'operator': ['dashboard', 'normatives', 'education', 'documents'],
      'user': ['dashboard', 'normatives', 'education', 'documents']
    };
    
    return roleSections[role] || ['dashboard'];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero sezioni:', error);
    return ['dashboard'];
  }
}

export async function createNormative(data: Omit<Normative, 'id' | 'created_at' | 'updated_at'>): Promise<Normative | null> {
  try {
    console.log('🎓 NEON: Creazione normativa:', data.title);
    const result = await sql`
      INSERT INTO normatives (
        title, content, category, type, reference_number, 
        publication_date, effective_date, tags, file_path
      )
      VALUES (
        ${data.title}, ${data.content}, ${data.category}, ${data.type}, 
        ${data.reference_number}, ${data.publication_date}, ${data.effective_date}, 
        ${data.tags}, ${data.file_path}
      )
      RETURNING *
    `;
    return result[0] as Normative;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione normativa:', error);
    return null;
  }
}

export async function updateNormative(id: string, data: Partial<Normative>): Promise<Normative | null> {
  try {
    console.log('🎓 NEON: Aggiornamento normativa:', id);
    const result = await sql`
      UPDATE normatives 
      SET 
        title = COALESCE(${data.title}, title),
        content = COALESCE(${data.content}, content),
        category = COALESCE(${data.category}, category),
        type = COALESCE(${data.type}, type),
        reference_number = COALESCE(${data.reference_number}, reference_number),
        publication_date = COALESCE(${data.publication_date}, publication_date),
        effective_date = COALESCE(${data.effective_date}, effective_date),
        tags = COALESCE(${data.tags}, tags),
        file_path = COALESCE(${data.file_path}, file_path),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] as Normative || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento normativa:', error);
    return null;
  }
}

export async function deleteNormative(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Eliminazione normativa:', id);
    await sql`DELETE FROM normatives WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione normativa:', error);
    return false;
  }
}

export async function searchNormatives(query: string): Promise<Normative[]> {
  try {
    console.log('🎓 NEON: Ricerca normative:', query);
    const result = await sql`
      SELECT * FROM normatives
      WHERE 
        title ILIKE ${'%' + query + '%'} OR
        content ILIKE ${'%' + query + '%'} OR
        category ILIKE ${'%' + query + '%'} OR
        reference_number ILIKE ${'%' + query + '%'}
      ORDER BY publication_date DESC
    `;
    return result as Normative[];
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca normative:', error);
    return [];
  }
}

export async function getNormativesByCategory(category: string): Promise<Normative[]> {
  try {
    console.log('🎓 NEON: Recupero normative per categoria:', category);
    const result = await sql`
      SELECT * FROM normatives
      WHERE category = ${category}
      ORDER BY publication_date DESC
    `;
    return result as Normative[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero normative per categoria:', error);
    return [];
  }
}

export async function getDocumentById(id: string): Promise<Document | null> {
  try {
    console.log('🎓 NEON: Ricerca documento per ID:', id);
    const result = await sql`
      SELECT * FROM documents
      WHERE id = ${id}
    `;
    return result[0] as Document || null;
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca documento:', error);
    return null;
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Eliminazione documento:', id);
    await sql`DELETE FROM documents WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione documento:', error);
    return false;
  }
}

export async function incrementDownloadCount(id: string): Promise<boolean> {
  try {
    await sql`
      UPDATE documents 
      SET download_count = COALESCE(download_count, 0) + 1
      WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore incremento download:', error);
    return false;
  }
}

export async function getAllTables(): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero lista tabelle');
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    return result.map(row => row.table_name);
  } catch (error) {
    console.error('🚨 NEON: Errore recupero tabelle:', error);
    return [];
  }
}

export async function getRolePermissionsMatrix() {
  return DEFAULT_ROLE_PERMISSIONS;
}

export async function updateRolePermission(role: string, permission: string, granted: boolean): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento permesso ruolo:', { role, permission, granted });
    // Placeholder function - implementazione da completare
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento permesso ruolo:', error);
    return false;
  }
}

export async function getTableRecords(tableName: string, limit: number = 100): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero record da tabella:', tableName);
    
    // Validazione nome tabella per sicurezza
    const allowedTables = ['users', 'normatives', 'documents'];
    if (!allowedTables.includes(tableName)) {
      throw new Error(`Tabella non consentita: ${tableName}`);
    }
    
    const result = await sql`
      SELECT * FROM ${sql.unsafe(tableName)}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero record tabella:', error);
    return [];
  }
}

export async function getTableStructure(tableName: string): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero struttura tabella:', tableName);
    
    // Validazione nome tabella per sicurezza
    const allowedTables = ['users', 'normatives', 'documents'];
    if (!allowedTables.includes(tableName)) {
      throw new Error(`Tabella non consentita: ${tableName}`);
    }
    
    const result = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero struttura tabella:', error);
    return [];
  }
}

// === INIZIALIZZAZIONE DATABASE ===

export async function initializeDatabase(): Promise<boolean> {
  try {
    console.log('🎓 NEON: Inizializzazione database...');
    
    // Crea tabella users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'operator')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella normatives
    await sql`
      CREATE TABLE IF NOT EXISTS normatives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('law', 'regulation', 'ruling')),
        reference_number VARCHAR(100) NOT NULL,
        publication_date DATE NOT NULL,
        effective_date DATE NOT NULL,
        tags TEXT[] DEFAULT '{}',
        file_path TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella documents
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_url TEXT,
        file_path TEXT,
        file_size INTEGER,
        mime_type VARCHAR(100),
        type VARCHAR(20) NOT NULL CHECK (type IN ('template', 'form', 'guide', 'report')),
        category VARCHAR(100) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        version VARCHAR(20) DEFAULT '1.0',
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
        uploaded_by UUID REFERENCES users(id),
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Inserisci utente admin di default
    const adminPasswordHash = await hashPassword('admin123');
    await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES ('admin@accademia.it', 'Amministratore', ${adminPasswordHash}, 'admin')
      ON CONFLICT (email) DO NOTHING
    `;

    // Inserisci dati di esempio per normative
    await sql`
      INSERT INTO normatives (title, content, category, type, reference_number, publication_date, effective_date, tags)
      VALUES 
      (
        'Decreto Legislativo 285/1992 - Codice della Strada',
        'Il presente decreto disciplina la circolazione stradale e stabilisce le norme per il trasporto pubblico locale non di linea. Articolo 1: Definizioni e campo di applicazione. Il trasporto pubblico locale non di linea comprende tutti i servizi di trasporto di persone effettuati con veicoli adibiti al trasporto di persone aventi più di nove posti compreso quello del conducente.',
        'Trasporto Pubblico',
        'law',
        'D.Lgs. 285/1992',
        '1992-04-30',
        '1993-01-01',
        ARRAY['trasporto', 'codice strada', 'pubblico locale']
      ),
      (
        'Legge Regionale 15/2018 - Disciplina TPL non di linea',
        'La presente legge disciplina il trasporto pubblico locale non di linea nella regione, stabilendo requisiti, procedure e controlli. Articolo 1: Oggetto e finalità. La presente legge disciplina il trasporto pubblico locale non di linea al fine di garantire la sicurezza degli utenti e la qualità del servizio.',
        'Normativa Regionale',
        'regulation',
        'L.R. 15/2018',
        '2018-03-15',
        '2018-06-01',
        ARRAY['trasporto locale', 'regionale', 'licenze']
      )
      ON CONFLICT DO NOTHING
    `;

    console.log('🎓 NEON: Database inizializzato con successo');
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore inizializzazione database:', error);
    return false;
  }
}