import { neon } from '@neondatabase/serverless';
import { writeAuditLog, createSystemAlert, verifyDatabaseIntegrity } from './auditLogger';

const sql = neon(import.meta.env.VITE_DATABASE_URL!);

export { sql };

// Funzione per esportare schema tabelle per debugging
export async function exportTableSchema(): Promise<any> {
  try {
    const schema = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'roles', 'permissions', 'role_permissions', 'role_sections')
      ORDER BY table_name, ordinal_position
    `;
    
    return schema;
  } catch (error) {
    console.error('🚨 NEON: Errore export schema:', error);
    throw error;
  }
}

// Inizializza connessione Neon
// const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

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

export async function getAllUsers(excludeSuperAdmin: boolean = false, currentUserId?: string): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero tutti gli utenti');
    
    let query = 'SELECT id, email, full_name, role, created_at FROM users';
    const conditions = [];
    const params = [];
    
    if (excludeSuperAdmin) {
      conditions.push('role != $' + (params.length + 1));
      params.push('superadmin');
    }
    
    if (currentUserId) {
      conditions.push('id != $' + (params.length + 1));
      params.push(currentUserId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await sql.query(query, params);
    console.log('🎓 NEON: Utenti recuperati:', result.length);
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero utenti:', error);
    throw error;
  }
}

export async function getUsersCount(): Promise<number> {
  try {
    console.log('🎓 NEON: Conteggio utenti totali');
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    const count = parseInt(result[0].count);
    console.log('🎓 NEON: Utenti totali:', count);
    return count;
  } catch (error) {
    console.error('🚨 NEON: Errore conteggio utenti:', error);
    throw error;
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
      WHERE created_at >= NOW() - (INTERVAL '1 day' * ${days})
    `;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('🚨 NEON: Errore conteggio normative recenti:', error);
    return 0;
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

export async function getDocumentsByCategory(category: string): Promise<Document[]> {
  try {
    console.log('🎓 NEON: Recupero documenti per categoria:', category);
    const result = await sql`
      SELECT d.*, u.full_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.category = ${category}
      ORDER BY d.created_at DESC
    `;
    return result as Document[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero documenti per categoria:', error);
    return [];
  }
}

export async function getDocumentsByType(type: 'template' | 'form' | 'guide' | 'report'): Promise<Document[]> {
  try {
    console.log('🎓 NEON: Recupero documenti per tipo:', type);
    const result = await sql`
      SELECT d.*, u.full_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.type = ${type}
      ORDER BY d.created_at DESC
    `;
    return result as Document[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero documenti per tipo:', error);
    return [];
  }
}

export async function getDocumentsWithUploaderInfo(): Promise<(Document & { uploader_name?: string })[]> {
  try {
    console.log('🎓 NEON: Recupero documenti con info uploader');
    const result = await sql`
      SELECT 
        d.*,
        u.full_name as uploader_name,
        u.email as uploader_email
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      ORDER BY d.created_at DESC
    `;
    return result as (Document & { uploader_name?: string; uploader_email?: string })[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero documenti con uploader:', error);
    return [];
  }
}

export async function getDocumentStats(): Promise<{
  totalDocuments: number;
  totalDownloads: number;
  documentsByType: { type: string; count: number }[];
  documentsByCategory: { category: string; count: number }[];
  recentDocuments: number;
}> {
  try {
    console.log('🎓 NEON: Recupero statistiche documenti');
    
    const [totalResult, downloadsResult, typeResult, categoryResult, recentResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM documents`,
      sql`SELECT SUM(download_count) as total FROM documents`,
      sql`
        SELECT type, COUNT(*) as count 
        FROM documents 
        GROUP BY type 
        ORDER BY count DESC
      `,
      sql`
        SELECT category, COUNT(*) as count 
        FROM documents 
        GROUP BY category 
        ORDER BY count DESC
      `,
      sql`
        SELECT COUNT(*) as count 
        FROM documents 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `
    ]);

    return {
      totalDocuments: parseInt(totalResult[0].count),
      totalDownloads: parseInt(downloadsResult[0].total || '0'),
      documentsByType: typeResult.map(r => ({ type: r.type, count: parseInt(r.count) })),
      documentsByCategory: categoryResult.map(r => ({ category: r.category, count: parseInt(r.count) })),
      recentDocuments: parseInt(recentResult[0].count)
    };
  } catch (error) {
    console.error('🚨 NEON: Errore recupero statistiche documenti:', error);
    return {
      totalDocuments: 0,
      totalDownloads: 0,
      documentsByType: [],
      documentsByCategory: [],
      recentDocuments: 0
    };
  }
}

export async function searchDocuments(query: string): Promise<Document[]> {
  try {
    console.log('🎓 NEON: Ricerca documenti:', query);
    const result = await sql`
      SELECT d.*, u.full_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE 
        d.title ILIKE ${'%' + query + '%'} OR
        d.description ILIKE ${'%' + query + '%'} OR
        d.filename ILIKE ${'%' + query + '%'} OR
        d.category ILIKE ${'%' + query + '%'} OR
        EXISTS (
          SELECT 1 FROM unnest(d.tags) as tag 
          WHERE tag ILIKE ${'%' + query + '%'}
        )
      ORDER BY d.created_at DESC
    `;
    return result as Document[];
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca documenti:', error);
    return [];
  }
}

export async function getDocumentCategories(): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero categorie documenti');
    const result = await sql`
      SELECT DISTINCT category 
      FROM documents 
      WHERE category IS NOT NULL 
      ORDER BY category
    `;
    return result.map(r => r.category);
  } catch (error) {
    console.error('🚨 NEON: Errore recupero categorie:', error);
    return [];
  }
}

export async function getPopularDocuments(limit: number = 10): Promise<Document[]> {
  try {
    console.log('🎓 NEON: Recupero documenti più scaricati');
    const result = await sql`
      SELECT d.*, u.full_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.status = 'active'
      ORDER BY d.download_count DESC NULLS LAST, d.created_at DESC
      LIMIT ${limit}
    `;
    return result as Document[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero documenti popolari:', error);
    return [];
  }
}

export async function getDocumentsByUploader(uploaderId: string): Promise<Document[]> {
  try {
    console.log('🎓 NEON: Recupero documenti per uploader:', uploaderId);
    const result = await sql`
      SELECT d.*, u.full_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.uploaded_by = ${uploaderId}
      ORDER BY d.created_at DESC
    `;
    return result as Document[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero documenti per uploader:', error);
    return [];
  }
}

export async function updateDocumentDownloadCount(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Incremento contatore download documento:', id);
    await sql`
      UPDATE documents 
      SET 
        download_count = COALESCE(download_count, 0) + 1,
        updated_at = NOW()
      WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore incremento download:', error);
    return false;
  }
}

export async function getDocumentsWithFilters(filters: {
  searchTerm?: string;
  type?: string;
  category?: string;
  status?: string;
  uploaderId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Document[]> {
  try {
    console.log('🎓 NEON: Recupero documenti con filtri:', filters);
    
    let whereConditions = ['1=1']; // Base condition
    let params: any[] = [];
    let paramIndex = 1;
    
    if (filters.searchTerm) {
      whereConditions.push(`(
        d.title ILIKE $${paramIndex} OR
        d.description ILIKE $${paramIndex} OR
        d.filename ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM unnest(d.tags) as tag 
          WHERE tag ILIKE $${paramIndex}
        )
      )`);
      params.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }
    
    if (filters.type && filters.type !== 'all') {
      whereConditions.push(`d.type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }
    
    if (filters.category && filters.category !== 'all') {
      whereConditions.push(`d.category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }
    
    if (filters.status && filters.status !== 'all') {
      whereConditions.push(`d.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters.uploaderId) {
      whereConditions.push(`d.uploaded_by = $${paramIndex}`);
      params.push(filters.uploaderId);
      paramIndex++;
    }
    
    if (filters.dateFrom) {
      whereConditions.push(`d.created_at >= $${paramIndex}`);
      params.push(filters.dateFrom);
      paramIndex++;
    }
    
    if (filters.dateTo) {
      whereConditions.push(`d.created_at <= $${paramIndex}`);
      params.push(filters.dateTo);
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const result = await sql.query(
      `SELECT 
        d.*,
        u.full_name as uploader_name,
        u.email as uploader_email
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC`,
      params
    );
    
    return result as Document[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero documenti con filtri:', error);
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

// === SISTEMA PERMESSI BASATO SU DATABASE NEON ===

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  created_at: string;
}

// Inizializza le tabelle del sistema permessi
export async function initializePermissionsSystem(): Promise<boolean> {
  try {
    console.log('🎓 NEON: Inizializzazione sistema permessi...');
    
    // Crea tabella permissions
    await sql`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Crea tabella roles
    await sql`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        level INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Crea tabella role_permissions
    await sql`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        granted BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(role_id, permission_id)
      )
    `;

    // Crea tabella sections
    await sql`
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Crea tabella role_sections
    await sql`
      CREATE TABLE IF NOT EXISTS role_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
        visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(role_id, section_id)
      )
    `;

    // Crea tabella user_role_overrides per override specifici
    await sql`
      CREATE TABLE IF NOT EXISTS user_role_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        granted BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, permission_id)
      )
    `;

    console.log('🎓 NEON: Tabelle sistema permessi create');
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore inizializzazione sistema permessi:', error);
    return false;
  }
}

// Inserisce i dati base del sistema permessi
export async function seedPermissionsData(): Promise<void> {
  try {
    console.log('🎓 NEON: Inserimento dati base sistema permessi...');
    
    // Verifica se i dati esistono già
    const existingRoles = await sql`SELECT COUNT(*) as count FROM roles`;
    if (parseInt(existingRoles[0].count) > 0) {
      console.log('🎓 NEON: Dati già esistenti, skip inserimento');
      return;
    }
    
    // Inserisci ruoli base
    await sql`
      INSERT INTO roles (name, display_name, description, level) VALUES
      ('superadmin', 'Super Amministratore', 'Accesso completo al sistema', 1),
      ('admin', 'Amministratore', 'Gestione utenti e contenuti', 2),
      ('operator', 'Operatore', 'Gestione contenuti', 3),
      ('user', 'Utente', 'Accesso base', 4)
    `;

    // Inserisci permessi per normative
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('normatives.view', 'Può visualizzare le normative', 'normatives'),
      ('normatives.create', 'Può creare nuove normative', 'normatives'),
      ('normatives.edit', 'Può modificare normative esistenti', 'normatives'),
      ('normatives.delete', 'Può eliminare normative', 'normatives'),
      ('normatives.publish', 'Può pubblicare normative', 'normatives')
    `;

    // Inserisci permessi per documenti
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('documents.view', 'Può visualizzare i documenti', 'documents'),
      ('documents.create', 'Può creare nuovi documenti', 'documents'),
      ('documents.edit', 'Può modificare documenti esistenti', 'documents'),
      ('documents.delete', 'Può eliminare documenti', 'documents'),
      ('documents.upload', 'Può caricare nuovi documenti', 'documents')
    `;

    // Inserisci permessi per utenti
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('users.view', 'Può visualizzare la lista utenti', 'users'),
      ('users.create', 'Può creare nuovi utenti', 'users'),
      ('users.edit', 'Può modificare utenti esistenti', 'users'),
      ('users.delete', 'Può eliminare utenti', 'users'),
      ('users.manage_roles', 'Può modificare i ruoli utente', 'users')
    `;

    // Inserisci permessi per formazione
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('education.view', 'Può visualizzare i corsi', 'education'),
      ('education.create', 'Può creare nuovi corsi', 'education'),
      ('education.edit', 'Può modificare corsi esistenti', 'education'),
      ('education.delete', 'Può eliminare corsi', 'education'),
      ('education.enroll', 'Può iscriversi ai corsi', 'education')
    `;

    // Inserisci permessi per sistema
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('system.settings', 'Accesso alle impostazioni sistema', 'system'),
      ('system.permissions', 'Può modificare i permessi', 'system'),
      ('system.logs', 'Può visualizzare i log di sistema', 'system'),
      ('system.backup', 'Può fare backup del sistema', 'system')
    `;

    // Inserisci sezioni dell'interfaccia
    await sql`
      INSERT INTO sections (name, display_name, description) VALUES
      ('dashboard', 'Dashboard', 'Pannello principale'),
      ('normatives', 'Normative', 'Gestione normative'),
      ('docx', 'Documenti', 'Gestione documenti'),
      ('education', 'Formazione', 'Corsi e formazione'),
      ('users', 'Utenti', 'Gestione utenti'),
      ('admin', 'Amministrazione', 'Pannello amministrativo'),
      ('superadmin', 'Super Admin', 'Pannello super amministrativo'),
      ('reports', 'Report', 'Gestione report')
    `;

    console.log('🎓 NEON: Dati base sistema permessi inseriti');
  } catch (error) {
    console.error('🚨 NEON: Errore inserimento dati base:', error);
    throw error;
  }
}

// === FUNZIONI GESTIONE PERMESSI DAL DATABASE ===

export async function getAllPermissionsFromDB(): Promise<Permission[]> {
  try {
    console.log('🎓 NEON: Recupero permessi dal database');
    const result = await sql`
      SELECT * FROM permissions
      ORDER BY category, name
    `;
    return result as Permission[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero permessi:', error);
    return [];
  }
}

export async function getAllRolesFromDB(): Promise<Role[]> {
  try {
    console.log('🎓 NEON: Recupero ruoli dal database');
    const result = await sql`
      SELECT * FROM roles
      ORDER BY level ASC
    `;
    return result as Role[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero ruoli:', error);
    return [];
  }
}

export async function getAllSectionsFromDB(): Promise<Section[]> {
  try {
    console.log('🎓 NEON: Recupero sezioni dal database');
    const result = await sql`
      SELECT * FROM sections
      ORDER BY name
    `;
    return result as Section[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero sezioni:', error);
    return [];
  }
}

export async function getRolePermissionsFromDB(roleName: string): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero permessi per ruolo dal database:', roleName);
    const result = await sql`
      SELECT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON CAST(rp.role_id AS TEXT) = CAST(r.id AS TEXT)
      WHERE r.name = ${roleName} AND rp.granted = TRUE
    `;
    return result.map(row => row.name);
  } catch (error) {
    console.error('🚨 NEON: Errore recupero permessi ruolo:', error);
    return [];
  }
}

// Funzione rimossa - ora usa la versione hardcoded più sotto

export async function updateRolePermissionInDB(roleName: string, permissionName: string, granted: boolean): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento permesso ruolo:', { roleName, permissionName, granted });
    
    // Verifica esistenza ruolo
    const roleExists = await sql`SELECT id FROM roles WHERE name = ${roleName}`;
    if (roleExists.length === 0) {
      console.error('🚨 NEON: Ruolo non trovato:', roleName);
      return false;
    }
    
    // Verifica esistenza permesso
    const permissionExists = await sql`SELECT id FROM permissions WHERE name = ${permissionName}`;
    if (permissionExists.length === 0) {
      console.error('🚨 NEON: Permesso non trovato:', permissionName);
      return false;
    }
    
    const result = await sql`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT CAST(r.id AS UUID), CAST(p.id AS UUID), ${granted}
      FROM roles r, permissions p
      WHERE r.name = ${roleName} AND p.name = ${permissionName}
      ON CONFLICT (role_id, permission_id)
      DO UPDATE SET granted = ${granted}
    `;
    
    // Verifica che la modifica sia stata effettivamente applicata
    const verification = await sql`
      SELECT rp.granted, r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = ${roleName} AND p.name = ${permissionName}
    `;
    
    if (verification.length > 0 && verification[0].granted === granted) {
      console.log('✅ NEON: Verifica DB confermata - Permesso aggiornato correttamente');
      
      // Verifica integrità database dopo la modifica
      const integrityCheck = await verifyDatabaseIntegrity(sql);
      if (!integrityCheck.isValid) {
        console.error('🚨 NEON: Problemi di integrità rilevati:', integrityCheck.errors);
        createSystemAlert('error', 'Database Integrity Issues Detected', {
          operation: 'PERMISSION_UPDATE',
          errors: integrityCheck.errors,
          warnings: integrityCheck.warnings
        });
      }
      
      // Log audit
      await writeAuditLog('PERMISSION_UPDATE', 'SUCCESS', {
        role: roleName,
        permission: permissionName,
        granted,
        verified: true,
        dbState: verification[0].granted,
        integrityCheck: integrityCheck.isValid
      });
      return true;
    } else {
      console.error('🚨 NEON: Verifica DB fallita - Stato non corrispondente');
      await writeAuditLog('PERMISSION_UPDATE', 'VERIFICATION_FAILED', {
        role: roleName,
        permission: permissionName,
        granted,
        verified: false,
        expected: granted,
        actual: verification[0]?.granted
      });
      createSystemAlert('error', 'Database Verification Failed', {
        operation: 'PERMISSION_UPDATE',
        role: roleName,
        permission: permissionName
      });
      return false;
    }
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento permesso ruolo:', error);
    await writeAuditLog('PERMISSION_UPDATE', 'ERROR', {
      role: roleName,
      permission: permissionName,
      granted,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

export async function updateRoleSectionInDB(roleName: string, sectionName: string, visible: boolean): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento sezione ruolo:', { roleName, sectionName, visible });
    
    // Prima verifica se ruolo e sezione esistono
    const roleCheck = await sql`SELECT id, name FROM roles WHERE name = ${roleName}`;
    const sectionCheck = await sql`SELECT id, name FROM sections WHERE name = ${sectionName}`;
    
    console.log('🔍 NEON: Ruolo trovato:', roleCheck);
    console.log('🔍 NEON: Sezione trovata:', sectionCheck);
    
    if (roleCheck.length === 0) {
      console.error('🚨 NEON: Ruolo non trovato:', roleName);
      await writeAuditLog('SECTION_UPDATE', 'ERROR', {
        role: roleName,
        section: sectionName,
        visible,
        error: 'Role not found'
      });
      return false;
    }
    
    if (sectionCheck.length === 0) {
      console.error('🚨 NEON: Sezione non trovata:', sectionName);
      await writeAuditLog('SECTION_UPDATE', 'ERROR', {
        role: roleName,
        section: sectionName,
        visible,
        error: 'Section not found'
      });
      return false;
    }
    
    await sql`
      INSERT INTO role_sections (role_id, section_id, visible)
      SELECT CAST(r.id AS UUID), CAST(s.id AS UUID), ${visible}
      FROM roles r, sections s
      WHERE r.name = ${roleName} AND s.name = ${sectionName}
      ON CONFLICT (role_id, section_id)
      DO UPDATE SET visible = ${visible}
    `;
    
    // Verifica che la modifica sia stata applicata
    const verification = await sql`
      SELECT rs.visible, r.name as role_name, s.name as section_name
      FROM role_sections rs
      JOIN roles r ON r.id = rs.role_id
      JOIN sections s ON s.id = rs.section_id
      WHERE r.name = ${roleName} AND s.name = ${sectionName}
    `;
    
    if (verification.length > 0 && verification[0].visible === visible) {
      console.log('✅ NEON: Verifica DB confermata - Sezione aggiornata correttamente');
      
      // Verifica integrità database dopo la modifica
      const integrityCheck = await verifyDatabaseIntegrity(sql);
      if (!integrityCheck.isValid) {
        console.error('🚨 NEON: Problemi di integrità rilevati:', integrityCheck.errors);
        createSystemAlert('error', 'Database Integrity Issues Detected', {
          operation: 'SECTION_UPDATE',
          errors: integrityCheck.errors,
          warnings: integrityCheck.warnings
        });
      }
      
      // Log audit
      await writeAuditLog('SECTION_UPDATE', 'SUCCESS', {
        role: roleName,
        section: sectionName,
        visible,
        verified: true,
        dbState: verification[0].visible,
        integrityCheck: integrityCheck.isValid
      });
      return true;
    } else {
      console.error('🚨 NEON: Verifica DB fallita - Stato sezione non corrispondente');
      await writeAuditLog('SECTION_UPDATE', 'VERIFICATION_FAILED', {
        role: roleName,
        section: sectionName,
        visible,
        verified: false,
        expected: visible,
        actual: verification[0]?.visible
      });
      createSystemAlert('error', 'Section Update Verification Failed', {
        operation: 'SECTION_UPDATE',
        role: roleName,
        section: sectionName
      });
      return false;
    }
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento sezione ruolo:', error);
    await writeAuditLog('SECTION_UPDATE', 'ERROR', {
      role: roleName,
      section: sectionName,
      visible,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

export async function getPermissionsMatrixFromDB(): Promise<Map<string, { permissions: string[], sections: string[] }>> {
  try {
    console.log('🎓 NEON: Recupero matrice completa permessi dal database');
    
    const matrix = new Map();
    const roles = await getAllRolesFromDB();
    
    for (const role of roles) {
      const permissions = await getRolePermissionsFromDB(role.name);
      const sections = await getRoleSectionsFromDB(role.name);
      matrix.set(role.name, { permissions, sections });
    }
    
    return matrix;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero matrice permessi:', error);
    return new Map();
  }
}

// === FUNZIONI SEZIONI RUOLI ===

async function getRoleSectionsFromDB(role: string): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero sezioni dal database per ruolo:', role);

    // Prima prova a leggere dal database
    const result = await sql`
      SELECT s.name
      FROM role_sections rs
      JOIN roles r ON r.id = rs.role_id
      JOIN sections s ON s.id = rs.section_id
      WHERE r.name = ${role} AND rs.visible = true
      ORDER BY s.name
    `;

    if (result.length > 0) {
      const sections = result.map(row => row.name);
      console.log('✅ NEON: Sezioni dal database per', role + ':', sections);
      return sections;
    }

    // Fallback: configurazione hardcoded se database vuoto
    console.log('⚠️ NEON: Database vuoto, uso configurazione hardcoded per', role);
    const sectionsConfig: Record<string, string[]> = {
      'superadmin': [
        'dashboard',
        'users',
        'normatives',
        'documents',
        'education',
        'courses',
        'modules',
        'quizzes',
        'reports',
        'settings'
      ],
      'admin': [
        'dashboard',
        'users',
        'normatives',
        'documents',
        'education',
        'courses',
        'modules',
        'quizzes',
        'reports'
      ],
      'operator': [
        'dashboard',
        'normatives',
        'education',
        'courses'
      ],
      'user': [
        'dashboard',
        'normatives',
        'documents',
        'education'
      ],
      'guest': [
        'dashboard'
      ]
    };

    const sections = sectionsConfig[role] || ['dashboard'];
    console.log('🎓 NEON: Sezioni hardcoded per', role + ':', sections);
    return sections;

  } catch (error) {
    console.error('🚨 NEON: Errore recupero sezioni per ruolo:', error);
    // Fallback: restituisci dashboard come sezione minima
    return ['dashboard'];
  }
}

export async function getUserPermissions(role: string): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero permessi per ruolo:', role);
    
    // Recupera permessi dal database Neon
    return await getRolePermissionsFromDB(role);
  } catch (error) {
    console.error('🚨 NEON: Errore recupero permessi:', error);
    return [];
  }
}

export async function getUserSections(role: string): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero sezioni per ruolo:', role);
    
    // Recupera sezioni dal database Neon
    return await getRoleSectionsFromDB(role);
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
  // Recupera matrice dal database Neon
  return await getPermissionsMatrixFromDB();
}

export async function updateRolePermission(role: string, permission: string, granted: boolean): Promise<boolean> {
  return await updateRolePermissionInDB(role, permission, granted);
}

export async function updateRoleSection(role: string, section: string, granted: boolean): Promise<boolean> {
  return await updateRoleSectionInDB(role, section, granted);
}

export async function getTableRecords(tableName: string, limit: number = 100): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero record da tabella:', tableName);
    
    // Validazione nome tabella per sicurezza
    // Rimuovo la validazione per permettere l'accesso a tutte le tabelle esistenti
    // const allowedTables = ['users', 'normatives', 'documents', 'activity_logs', 'course_enrollments', 'course_modules', 'courses'];
    // if (!allowedTables.includes(tableName)) {
    //   throw new Error(`Tabella non consentita: ${tableName}`);
    // }
    
    const result = await sql`
      SELECT * FROM ${sql.unsafe(tableName)}
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
    // Rimuovo la validazione per permettere l'accesso a tutte le tabelle esistenti
    // const allowedTables = ['users', 'normatives', 'documents', 'activity_logs', 'course_enrollments', 'course_modules', 'courses'];
    // if (!allowedTables.includes(tableName)) {
    //   throw new Error(`Tabella non consentita: ${tableName}`);
    // }
    
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

async function createMainTables(): Promise<void> {
  try {
    console.log('🎓 NEON: Creazione tabelle principali...');
    
    // Crea tabella users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'operator')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Crea tabella documents
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_url TEXT,
        file_path TEXT,
        file_size BIGINT,
        mime_type VARCHAR(100),
        type VARCHAR(20) NOT NULL CHECK (type IN ('template', 'form', 'guide', 'report')),
        category VARCHAR(100) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        version VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
        uploaded_by UUID REFERENCES users(id),
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Crea tabella activity_logs
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    console.log('🎓 NEON: Tabelle principali create');
  } catch (error) {
    console.error('🚨 NEON: Errore creazione tabelle principali:', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  try {
    console.log('🎓 NEON: Aggiornamento utente:', id, data);
    
    // Costruisci la query dinamicamente in modo sicuro
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
    
    // Aggiungi sempre updated_at
    updates.push('updated_at = NOW()');
    
    if (updates.length === 1) { // Solo updated_at
      console.log('🎓 NEON: Nessun campo da aggiornare');
      return null;
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${values.length}
      RETURNING id, email, full_name, role, created_at, updated_at
    `;
    
    console.log('🎓 NEON: Query generata:', updateQuery);
    console.log('🎓 NEON: Parametri:', values);
    
    const result = await sql.query(updateQuery, values);
    
    // Log audit successo
    await writeAuditLog('USER_UPDATE', 'SUCCESS', {
      userId: id,
      updates: data,
      verified: true
    });
    
    return result[0] as User || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento utente:', error);
    
    // Log audit errore e crea alert immediato
    await writeAuditLog('USER_UPDATE', 'ERROR', {
      userId: id,
      updates: data,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Crea alert immediato per Centro di Controllo
    createSystemAlert('error', 'Database Error in User Update', {
      operation: 'USER_UPDATE',
      userId: id,
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      severity: (error as any)?.severity
    });
    
    return null;
  }
}

export async function initializeDatabase(): Promise<boolean> {
  try {
    console.log('🎓 NEON: Inizializzazione completa database...');
    
    // Verifica che la URL del database sia configurata
    if (!import.meta.env.VITE_DATABASE_URL) {
      console.error('🚨 NEON: VITE_DATABASE_URL non configurata');
      return false;
    }

    // 1. Crea tabelle principali
    await createMainTables();
    
    // 2. Crea sistema permessi
    await initializePermissionsSystem();
    
    // 3. Inserisci dati base
    await seedPermissionsData();
    await insertDefaultAdmin();
    await seedDocumentsData();
    
    // 4. Pulisci ruoli non necessari
    await cleanupUnwantedRoles();
    
    console.log('🎓 NEON: Database inizializzato completamente');
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore inizializzazione database:', error);
    return false;
  }
}

async function insertDefaultAdmin(): Promise<void> {
  try {
    // Inserisci utente admin di default se non esiste
    const adminHash = await hashPassword('admin123');
    await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES ('admin@accademia.it', 'Amministratore', ${adminHash}, 'superadmin')
      ON CONFLICT (email) DO NOTHING
    `;
    console.log('🎓 NEON: Admin di default inserito');
  } catch (error) {
    console.error('🚨 NEON: Errore inserimento admin:', error);
  }
}

// Rimuove ruoli non necessari come "guest"
async function cleanupUnwantedRoles(): Promise<void> {
  try {
    console.log('🎓 NEON: Pulizia ruoli non necessari...');
    
    // Rimuovi il ruolo "guest" se esiste
    const result = await sql`
      DELETE FROM roles 
      WHERE name = 'guest'
      RETURNING name
    `;
    
    if (result.length > 0) {
      console.log('🎓 NEON: Ruolo "guest" rimosso dal database');
    } else {
      console.log('🎓 NEON: Ruolo "guest" non presente nel database');
    }
    
  } catch (error) {
    console.error('🚨 NEON: Errore pulizia ruoli:', error);
  }
}

// Inserisce documenti di esempio se la tabella è vuota
async function seedDocumentsData(): Promise<void> {
  try {
    console.log('🎓 NEON: Verifica documenti esistenti...');
    
    // Verifica se ci sono già documenti
    const existingDocs = await sql`SELECT COUNT(*) as count FROM documents`;
    if (parseInt(existingDocs[0].count) > 0) {
      console.log('🎓 NEON: Documenti già presenti, skip inserimento');
      return;
    }
    
    console.log('🎓 NEON: Inserimento documenti di esempio...');
    
    // Trova l'ID dell'admin per associare i documenti
    const adminUser = await sql`SELECT id FROM users WHERE role = 'superadmin' LIMIT 1`;
    const adminId = adminUser[0]?.id;
    
    // Inserisci documenti di esempio
    await sql`
      INSERT INTO documents (
        title, description, filename, file_path, file_size, mime_type, 
        type, category, tags, version, status, uploaded_by
      ) VALUES
      (
        'Modulo Richiesta Licenza Taxi',
        'Modulo ufficiale per la richiesta di nuova licenza taxi comunale',
        'modulo_licenza_taxi.pdf',
        'https://drive.google.com/file/d/1example_taxi_license/view',
        245,
        'application/pdf',
        'form',
        'Licenze',
        ARRAY['taxi', 'licenza', 'modulo'],
        '2.1',
        'active',
        ${adminId}
      ),
      (
        'Template Autorizzazione NCC',
        'Template per la compilazione delle autorizzazioni NCC',
        'template_autorizzazione_ncc.docx',
        'https://drive.google.com/file/d/1example_ncc_auth/view',
        189,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'template',
        'Autorizzazioni',
        ARRAY['ncc', 'autorizzazione', 'template'],
        '1.5',
        'active',
        ${adminId}
      ),
      (
        'Guida Controlli Stradali',
        'Guida operativa per la gestione dei controlli stradali e verifiche documentali',
        'guida_controlli_stradali.pdf',
        'https://drive.google.com/file/d/1example_road_controls/view',
        567,
        'application/pdf',
        'guide',
        'Controlli',
        ARRAY['controlli', 'strada', 'verifiche'],
        '3.0',
        'active',
        ${adminId}
      ),
      (
        'Report Mensile Attività',
        'Template per la compilazione del report mensile delle attività di trasporto',
        'report_mensile_template.xlsx',
        'https://drive.google.com/file/d/1example_monthly_report/view',
        123,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'report',
        'Report',
        ARRAY['report', 'mensile', 'attività'],
        '1.0',
        'active',
        ${adminId}
      ),
      (
        'Modulo Denuncia Sinistro',
        'Modulo per la denuncia di sinistri stradali nel trasporto pubblico locale',
        'modulo_denuncia_sinistro.pdf',
        'https://drive.google.com/file/d/1example_accident_report/view',
        334,
        'application/pdf',
        'form',
        'Sinistri',
        ARRAY['sinistro', 'denuncia', 'assicurazione'],
        '2.0',
        'active',
        ${adminId}
      ),
      (
        'Guida Tariffe e Prezzi',
        'Guida completa per la determinazione delle tariffe nel trasporto locale',
        'guida_tariffe_prezzi.pdf',
        'https://drive.google.com/file/d/1example_pricing_guide/view',
        445,
        'application/pdf',
        'guide',
        'Tariffe',
        ARRAY['tariffe', 'prezzi', 'calcolo'],
        '1.8',
        'active',
        ${adminId}
      )
    `;
    
    console.log('🎓 NEON: Documenti di esempio inseriti con successo');
  } catch (error) {
    console.error('🚨 NEON: Errore inserimento documenti di esempio:', error);
  }
}
export async function checkDatabaseTables(): Promise<{ tables: string[], error?: string }> {
  try {
    // Verifica che la URL del database sia configurata
    if (!import.meta.env.VITE_DATABASE_URL) {
      console.error('🚨 NEON: VITE_DATABASE_URL non configurata');
      return { tables: [], error: 'VITE_DATABASE_URL non configurata' };
    }
    
    console.log('🎓 NEON: Verifica tabelle esistenti...');
    
    // Recupera lista tabelle esistenti
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tables = result.map(row => row.table_name);
    console.log('🎓 NEON: Tabelle trovate:', tables);
    
    return { tables };
  } catch (error) {
    console.error('🚨 NEON: Errore verifica tabelle:', error);
    return { tables: [], error: error.message };
  }
}