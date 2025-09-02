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
    console.error(' NEON: Errore export schema:', error);
    throw error;
  }
}

// Connessione Neon già definita sopra alla riga 4

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
      console.log('🎓 NEON: Dati già esistenti, inizializzazione sezioni ruoli...');
      await initializeRoleSections();
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
      ('documents', 'Documenti', 'Gestione documenti'),
      ('education', 'Formazione', 'Corsi e formazione'),
      ('users', 'Utenti', 'Gestione utenti'),
      ('admin', 'Amministrazione', 'Pannello amministrativo'),
      ('superadmin', 'Super Admin', 'Pannello super amministrativo'),
      ('settings', 'Impostazioni', 'Configurazione sistema'),
      ('reports', 'Report', 'Gestione report')
    `;

    console.log('🎓 NEON: Dati base sistema permessi inseriti');
    
    // Inizializza i permessi per i ruoli
    await initializeRolePermissions();
    
    // Inizializza le sezioni per i ruoli
    await initializeRoleSections();
  } catch (error) {
    console.error('🚨 NEON: Errore inserimento dati base:', error);
    throw error;
  }
}

// Inizializza i permessi per tutti i ruoli
async function initializeRolePermissions(): Promise<void> {
  try {
    console.log('🎓 NEON: Inizializzazione permessi ruoli...');
    
    // Configurazione permessi per ruolo
    const rolePermissionsConfig = {
      'superadmin': [
        'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish',
        'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.upload',
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
        'education.view', 'education.create', 'education.edit', 'education.delete', 'education.enroll',
        'system.settings', 'system.permissions', 'system.logs', 'system.backup'
      ],
      'admin': [
        'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.publish',
        'documents.view', 'documents.create', 'documents.edit', 'documents.upload',
        'users.view', 'users.create', 'users.edit', 'users.manage_roles',
        'education.view', 'education.create', 'education.edit', 'education.enroll',
        'system.logs'
      ],
      'operator': [
        'normatives.view', 'normatives.create', 'normatives.edit',
        'documents.view', 'documents.create', 'documents.edit',
        'education.view', 'education.create', 'education.edit', 'education.enroll'
      ],
      'user': [
        'normatives.view',
        'documents.view',
        'education.view', 'education.enroll'
      ]
    };
    
    // Per ogni ruolo, inserisci i permessi
    for (const [roleName, permissions] of Object.entries(rolePermissionsConfig)) {
      for (const permissionName of permissions) {
        await sql`
          INSERT INTO role_permissions (role_id, permission_id, granted)
          SELECT r.id, p.id, true
          FROM roles r, permissions p
          WHERE r.name = ${roleName} AND p.name = ${permissionName}
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `;
      }
      console.log(`✅ NEON: Permessi inizializzati per ruolo ${roleName}: ${permissions.length} permessi`);
    }
    
    console.log('🎓 NEON: Inizializzazione permessi ruoli completata');
  } catch (error) {
    console.error('🚨 NEON: Errore inizializzazione permessi ruoli:', error);
  }
}

// Inizializza le sezioni per tutti i ruoli
async function initializeRoleSections(): Promise<void> {
  try {
    console.log('🎓 NEON: Inizializzazione sezioni ruoli...');
    
    // Configurazione sezioni per ruolo
    const roleSectionsConfig = {
      'superadmin': ['dashboard', 'normatives', 'docx', 'documents', 'education', 'users', 'admin', 'superadmin', 'settings', 'reports'],
      'admin': ['dashboard', 'normatives', 'docx', 'documents', 'education', 'users', 'admin', 'reports'],
      'operator': ['dashboard', 'normatives', 'education', 'documents'],
      'user': ['dashboard', 'normatives', 'documents', 'education']
    };
    
    // Per ogni ruolo, inserisci le sezioni
    for (const [roleName, sections] of Object.entries(roleSectionsConfig)) {
      for (const sectionName of sections) {
        await sql`
          INSERT INTO role_sections (role_id, section_id, visible)
          SELECT r.id, s.id, true
          FROM roles r, sections s
          WHERE r.name = ${roleName} AND s.name = ${sectionName}
          ON CONFLICT (role_id, section_id) DO NOTHING
        `;
      }
      console.log(`✅ NEON: Sezioni inizializzate per ruolo ${roleName}: ${sections.join(', ')}`);
    }
    
    console.log('🎓 NEON: Inizializzazione sezioni ruoli completata');
  } catch (error) {
    console.error('🚨 NEON: Errore inizializzazione sezioni ruoli:', error);
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
    
    console.log('🔧 NEON: Eseguendo query UPDATE permesso:', { roleName, permissionName, granted });
    
    const result = await sql`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT CAST(r.id AS UUID), CAST(p.id AS UUID), ${granted}
      FROM roles r, permissions p
      WHERE r.name = ${roleName} AND p.name = ${permissionName}
      ON CONFLICT (role_id, permission_id)
      DO UPDATE SET granted = ${granted}
    `;
    
    console.log('🔧 NEON: Risultato query INSERT/UPDATE:', result);
    
    // Verifica che la modifica sia stata effettivamente applicata
    const verification = await sql`
      SELECT rp.granted, r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = ${roleName} AND p.name = ${permissionName}
    `;
    
    console.log('🔧 NEON: Risultato verifica DB:', verification);
    
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

    // Database vuoto - restituisci solo dashboard come fallback minimo
    console.log('⚠️ NEON: Nessuna sezione trovata nel database per ruolo:', role);
    return ['dashboard'];

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

// === FUNZIONI CONTROLLO INTEGRITÀ DATI ===

export async function checkDataIntegrity(): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  try {
    console.log('🔍 NEON: Verifica integrità dati del sistema...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // 1. Verifica tabelle critiche non vuote
    const criticalTables = [
      { name: 'users', minCount: 1 },
      { name: 'roles', minCount: 4 }, // superadmin, admin, operator, user
      { name: 'permissions', minCount: 10 },
      { name: 'role_permissions', minCount: 5 }
    ];
    
    for (const table of criticalTables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(table.name)}`;
        const count = parseInt(result[0]?.count || '0');
        if (count < table.minCount) {
          issues.push(`Table '${table.name}' has only ${count} records, expected at least ${table.minCount}`);
          recommendations.push(`Initialize default data for ${table.name} table`);
        }
      } catch (error) {
        issues.push(`Cannot access table '${table.name}': ${error}`);
        recommendations.push(`Verify database schema and recreate missing tables`);
      }
    }
    
    // 2. Verifica coerenza permessi ruoli
    try {
      const roleMatrix = await getPermissionsMatrixFromDB();
      const allPermissions = await getAllPermissionsFromDB();
      
      if (roleMatrix && roleMatrix.size > 0 && allPermissions && allPermissions.length > 0) {
        for (const [roleName, roleData] of roleMatrix.entries()) {
          // Verifica che i permessi del ruolo esistano nella tabella permissions
          for (const permissionName of roleData.permissions) {
            const permissionExists = allPermissions.some(p => p.name === permissionName);
            if (!permissionExists) {
              issues.push(`Permission '${permissionName}' for role '${roleName}' not found in permissions table`);
              recommendations.push(`Remove orphaned permission or add missing permission to database`);
            }
          }
          
          // Verifica che il ruolo 'superadmin' abbia permessi critici
          if (roleName === 'superadmin') {
            const criticalPermissions = ['system.settings', 'system.permissions', 'users.manage_roles'];
            for (const criticalPerm of criticalPermissions) {
              if (!roleData.permissions.includes(criticalPerm)) {
                issues.push(`SuperAdmin missing critical permission: ${criticalPerm}`);
                recommendations.push(`Grant ${criticalPerm} permission to superadmin role`);
              }
            }
          }
        }
      } else {
        issues.push('Role matrix or permissions data is empty');
        recommendations.push('Initialize default roles and permissions');
      }
    } catch (error) {
      issues.push(`Role-permissions verification failed: ${error}`);
      recommendations.push('Check role_permissions table integrity');
    }
    
    // 3. Verifica foreign key integrity
    try {
      // Verifica role_permissions references
      const orphanedRolePerms = await sql`
        SELECT COUNT(*) as count 
        FROM role_permissions rp 
        LEFT JOIN roles r ON r.id = rp.role_id 
        LEFT JOIN permissions p ON p.id = rp.permission_id 
        WHERE r.id IS NULL OR p.id IS NULL
      `;
      const orphanCount = parseInt(orphanedRolePerms[0]?.count || '0');
      if (orphanCount > 0) {
        issues.push(`${orphanCount} orphaned records in role_permissions table`);
        recommendations.push('Clean up orphaned role_permissions records');
      }
    } catch (error) {
      issues.push(`Foreign key integrity check failed: ${error}`);
    }
    
    const isValid = issues.length === 0;
    
    console.log(isValid ? '✅ NEON: Integrità dati verificata' : `⚠️ NEON: ${issues.length} problemi di integrità rilevati`);
    
    return {
      isValid,
      issues,
      recommendations
    };
    
  } catch (error) {
    console.error('🚨 NEON: Errore verifica integrità:', error);
    return {
      isValid: false,
      issues: [`Data integrity check failed: ${error}`],
      recommendations: ['Verify database connection and schema']
    };
  }
}

// Inserisce le sezioni mancanti nel database se non esistono
export async function ensureSectionsExist(): Promise<void> {
  try {
    console.log('🔧 NEON: Verifica ed inserimento sezioni mancanti...');
    
    const sectionsToEnsure = [
      { name: 'dashboard', display_name: 'Dashboard', description: 'Pannello principale' },
      { name: 'normatives', display_name: 'Normative', description: 'Gestione normative' },
      { name: 'docx', display_name: 'Documenti', description: 'Gestione documenti' },
      { name: 'documents', display_name: 'Documenti', description: 'Gestione documenti' },
      { name: 'education', display_name: 'Formazione', description: 'Corsi e formazione' },
      { name: 'users', display_name: 'Utenti', description: 'Gestione utenti' },
      { name: 'admin', display_name: 'Amministrazione', description: 'Pannello amministrativo' },
      { name: 'superadmin', display_name: 'Super Admin', description: 'Pannello super amministrativo' },
      { name: 'settings', display_name: 'Impostazioni', description: 'Configurazione sistema' },
      { name: 'reports', display_name: 'Report', description: 'Gestione report' }
    ];
    
    for (const section of sectionsToEnsure) {
      await sql`
        INSERT INTO sections (name, display_name, description)
        VALUES (${section.name}, ${section.display_name}, ${section.description})
        ON CONFLICT (name) DO NOTHING
      `;
    }
    
    console.log('✅ NEON: Sezioni verificate e inserite se necessario');
    
    // Verifica che le sezioni esistano ora
    const existingSections = await sql`SELECT name FROM sections ORDER BY name`;
    console.log('📋 NEON: Sezioni presenti nel database:', existingSections.map(s => s.name));
  } catch (error) {
    console.error('🚨 NEON: Errore inserimento sezioni:', error);
  }
}

export async function updateRoleSection(role: string, section: string, visible: boolean): Promise<boolean> {
  // Prima assicurati che la sezione esista
  await ensureSectionsExist();
  return await updateRoleSectionInDB(role, section, visible);
}

export async function getTableRecords(tableName: string, limit: number = 100): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero record da tabella:', tableName);
    
    // Validazione nome tabella per sicurezza
    const allowedTables = ['users', 'normatives', 'documents', 'activity_logs', 'course_enrollments', 'course_modules', 'courses', 'user_role_overrides', 'permissions', 'sections', 'role_permissions', 'role_sections', 'roles', 'quizzes', 'quiz_questions', 'quiz_attempts', 'enrollments'];
    if (!allowedTables.includes(tableName)) {
      throw new Error(`Tabella non consentita: ${tableName}`);
    }
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
    
    const result = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        ordinal_position
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

export async function getTableConstraints(tableName: string): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero constraints tabella:', tableName);
    
    const result = await sql`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = ${tableName}
      AND tc.table_schema = 'public'
      ORDER BY tc.constraint_type, tc.constraint_name
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero constraints tabella:', error);
    return [];
  }
}

export async function getTableIndexes(tableName: string): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero indici tabella:', tableName);
    
    const result = await sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = ${tableName}
      AND schemaname = 'public'
      ORDER BY indexname
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero indici tabella:', error);
    return [];
  }
}

export async function getTableStats(tableName: string): Promise<any> {
  try {
    console.log('🎓 NEON: Recupero statistiche tabella:', tableName);
    
    const result = await sql`
      SELECT 
        schemaname,
        tablename,
        attname as column_name,
        n_distinct,
        most_common_vals,
        most_common_freqs
      FROM pg_stats
      WHERE tablename = ${tableName}
      AND schemaname = 'public'
      ORDER BY attname
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero statistiche tabella:', error);
    return [];
  }
}

export async function getAllTableRelations(): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero tutte le relazioni tra tabelle');
    
    const result = await sql`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero relazioni tabelle:', error);
    return [];
  }
}

export async function getCompleteTableInfo(): Promise<any[]> {
  try {
    console.log('🎓 NEON: Recupero informazioni complete tabelle');
    
    const result = await sql`
      SELECT 
        t.table_name,
        t.table_type,
        COALESCE(s.n_tup_ins, 0) as total_inserts,
        COALESCE(s.n_tup_upd, 0) as total_updates,
        COALESCE(s.n_tup_del, 0) as total_deletes,
        COALESCE(s.n_live_tup, 0) as live_tuples,
        COALESCE(s.n_dead_tup, 0) as dead_tuples,
        COALESCE(pg_size_pretty(pg_total_relation_size(c.oid)), '0 bytes') as table_size
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero info complete tabelle:', error);
    return [];
  }
}

export async function generateDatabaseDocumentation(): Promise<string> {
  try {
    console.log('🎓 NEON: Generazione documentazione database completa');
    
    const [tables, relations] = await Promise.all([
      getAllTables(),
      getAllTableRelations()
    ]);
    
    let documentation = `# 📚 DOCUMENTAZIONE DATABASE ACCADEMIA\n`;
    documentation += `Generata il: ${new Date().toLocaleString('it-IT')}\n`;
    documentation += `Database: PostgreSQL/Neon\n\n`;
    
    // Overview generale
    documentation += `## 🔍 OVERVIEW\n`;
    documentation += `- **Tabelle totali:** ${tables.length}\n`;
    documentation += `- **Relazioni totali:** ${relations.length}\n\n`;
    
    // Mappa relazioni
    documentation += `## 🔗 MAPPA RELAZIONI\n`;
    for (const relation of relations) {
      documentation += `- \`${relation.table_name}.${relation.column_name}\` → \`${relation.foreign_table_name}.${relation.foreign_column_name}\`\n`;
    }
    documentation += `\n`;
    
    // Dettagli per ogni tabella
    documentation += `## 📋 TABELLE DETTAGLIATE\n\n`;
    
    for (const tableName of tables) {
      try {
        const [schema, constraints, indexes, tableInfo] = await Promise.all([
          getTableStructure(tableName),
          getTableConstraints(tableName),
          getTableIndexes(tableName),
          getCompleteTableInfo()
        ]);
        
        const currentTableInfo = tableInfo.find(t => t.table_name === tableName);
        
        documentation += `### 📄 ${tableName.toUpperCase()}\n`;
        if (currentTableInfo) {
          documentation += `- **Record:** ${currentTableInfo.live_tuples}\n`;
          documentation += `- **Dimensione:** ${currentTableInfo.table_size}\n`;
          documentation += `- **Operazioni:** ${currentTableInfo.total_inserts} insert, ${currentTableInfo.total_updates} update, ${currentTableInfo.total_deletes} delete\n`;
        }
        documentation += `\n`;
        
        // Schema colonne
        documentation += `#### 🔧 SCHEMA COLONNE\n`;
        documentation += `| # | Nome | Tipo | Nullable | Default |\n`;
        documentation += `|---|------|------|----------|--------|\n`;
        for (const column of schema) {
          const type = column.data_type + (column.character_maximum_length ? `(${column.character_maximum_length})` : '');
          const defaultValue = column.column_default || '—';
          documentation += `| ${column.ordinal_position} | \`${column.column_name}\` | ${type} | ${column.is_nullable} | ${defaultValue} |\n`;
        }
        documentation += `\n`;
        
        // Constraints
        if (constraints.length > 0) {
          documentation += `#### 🔒 CONSTRAINTS\n`;
          for (const constraint of constraints) {
            documentation += `- **${constraint.constraint_name}** (${constraint.constraint_type}): \`${constraint.column_name}\``;
            if (constraint.foreign_table_name) {
              documentation += ` → \`${constraint.foreign_table_name}.${constraint.foreign_column_name}\``;
            }
            documentation += `\n`;
          }
          documentation += `\n`;
        }
        
        // Indici
        if (indexes.length > 0) {
          documentation += `#### 📊 INDICI\n`;
          for (const index of indexes) {
            documentation += `- **${index.indexname}**: \`${index.indexdef}\`\n`;
          }
          documentation += `\n`;
        }
        
        documentation += `---\n\n`;
        
      } catch (error) {
        documentation += `❌ Errore caricamento ${tableName}: ${error}\n\n`;
      }
    }
    
    // Permessi e ruoli
    try {
      const [roles, permissions] = await Promise.all([
        getAllRolesFromDB(),
        getAllPermissionsFromDB()
      ]);
      
      documentation += `## 👥 SISTEMA PERMESSI\n\n`;
      documentation += `### 🎭 RUOLI (${roles.length})\n`;
      for (const role of roles) {
        documentation += `- **${role.name}** (livello ${role.level}): ${role.description}\n`;
      }
      documentation += `\n`;
      
      documentation += `### 🔐 PERMESSI (${permissions.length})\n`;
      for (const permission of permissions) {
        documentation += `- **${permission.name}**: ${permission.description}\n`;
      }
      documentation += `\n`;
      
    } catch (error) {
      documentation += `❌ Errore caricamento permessi: ${error}\n\n`;
    }
    
    documentation += `---\n`;
    documentation += `*Documentazione generata automaticamente dal Database Explorer*\n`;
    
    return documentation;
    
  } catch (error) {
    console.error('🚨 NEON: Errore generazione documentazione:', error);
    return `❌ Errore generazione documentazione: ${error}`;
  }
}

export async function generateSingleTableDocumentation(tableName: string): Promise<string> {
  try {
    console.log(`🎓 NEON: Generazione documentazione tabella ${tableName}`);
    
    // Carica tutti i dati della tabella
    const [schema, constraints, indexes, tableInfo, allRelations] = await Promise.all([
      getTableStructure(tableName),
      getTableConstraints(tableName),
      getTableIndexes(tableName),
      getCompleteTableInfo(),
      getAllTableRelations()
    ]);
    
    const currentTableInfo = tableInfo.find(t => t.table_name === tableName);
    
    // Filtra le relazioni per questa tabella (sia in entrata che in uscita)
    const outgoingRelations = allRelations.filter(r => r.table_name === tableName);
    const incomingRelations = allRelations.filter(r => r.foreign_table_name === tableName);
    
    let documentation = `# 📄 DOCUMENTAZIONE TABELLA: ${tableName.toUpperCase()}\n`;
    documentation += `Generata il: ${new Date().toLocaleString('it-IT')}\n`;
    documentation += `Database: PostgreSQL/Neon\n\n`;
    
    // Informazioni generali tabella
    documentation += `## 📊 INFORMAZIONI GENERALI\n`;
    if (currentTableInfo) {
      documentation += `- **Record attivi:** ${currentTableInfo.live_tuples}\n`;
      documentation += `- **Record eliminati:** ${currentTableInfo.dead_tuples}\n`;
      documentation += `- **Dimensione totale:** ${currentTableInfo.table_size}\n`;
      documentation += `- **Inserimenti totali:** ${currentTableInfo.total_inserts}\n`;
      documentation += `- **Aggiornamenti totali:** ${currentTableInfo.total_updates}\n`;
      documentation += `- **Eliminazioni totali:** ${currentTableInfo.total_deletes}\n`;
    }
    documentation += `\n`;
    
    // Schema colonne
    documentation += `## 🔧 SCHEMA COLONNE\n`;
    documentation += `| # | Nome | Tipo | Nullable | Default | Descrizione |\n`;
    documentation += `|---|------|------|----------|---------|-------------|\n`;
    for (const column of schema) {
      const type = column.data_type + (column.character_maximum_length ? `(${column.character_maximum_length})` : '');
      const defaultValue = column.column_default || '—';
      const nullable = column.is_nullable === 'YES' ? '✅' : '❌';
      documentation += `| ${column.ordinal_position} | \`${column.column_name}\` | **${type}** | ${nullable} | \`${defaultValue}\` | *${column.column_name}* |\n`;
    }
    documentation += `\n`;
    
    // Constraints
    if (constraints.length > 0) {
      documentation += `## 🔒 CONSTRAINTS E VINCOLI\n`;
      const primaryKeys = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
      const foreignKeys = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
      const uniques = constraints.filter(c => c.constraint_type === 'UNIQUE');
      const checks = constraints.filter(c => c.constraint_type === 'CHECK');
      
      if (primaryKeys.length > 0) {
        documentation += `### 🔑 PRIMARY KEYS\n`;
        for (const pk of primaryKeys) {
          documentation += `- **${pk.constraint_name}**: \`${pk.column_name}\`\n`;
        }
        documentation += `\n`;
      }
      
      if (foreignKeys.length > 0) {
        documentation += `### 🔗 FOREIGN KEYS\n`;
        for (const fk of foreignKeys) {
          documentation += `- **${fk.constraint_name}**: \`${fk.column_name}\` → \`${fk.foreign_table_name}.${fk.foreign_column_name}\`\n`;
        }
        documentation += `\n`;
      }
      
      if (uniques.length > 0) {
        documentation += `### ⭐ UNIQUE CONSTRAINTS\n`;
        for (const unique of uniques) {
          documentation += `- **${unique.constraint_name}**: \`${unique.column_name}\`\n`;
        }
        documentation += `\n`;
      }
      
      if (checks.length > 0) {
        documentation += `### ✅ CHECK CONSTRAINTS\n`;
        for (const check of checks) {
          documentation += `- **${check.constraint_name}**: \`${check.column_name}\`\n`;
        }
        documentation += `\n`;
      }
    }
    
    // Indici
    if (indexes.length > 0) {
      documentation += `## 📊 INDICI E PERFORMANCE\n`;
      for (const index of indexes) {
        documentation += `- **${index.indexname}**\n`;
        documentation += `  \`\`\`sql\n  ${index.indexdef}\n  \`\`\`\n`;
      }
      documentation += `\n`;
    }
    
    // Relazioni in uscita (questa tabella referenzia altre)
    if (outgoingRelations.length > 0) {
      documentation += `## 🔗 RELAZIONI IN USCITA\n`;
      documentation += `*Tabelle referenziate da ${tableName}:*\n\n`;
      for (const relation of outgoingRelations) {
        documentation += `- **${relation.column_name}** → \`${relation.foreign_table_name}.${relation.foreign_column_name}\`\n`;
        documentation += `  - *Colonna locale:* \`${relation.column_name}\`\n`;
        documentation += `  - *Tabella target:* \`${relation.foreign_table_name}\`\n`;
        documentation += `  - *Colonna target:* \`${relation.foreign_column_name}\`\n`;
      }
      documentation += `\n`;
    }
    
    // Relazioni in entrata (altre tabelle referenziano questa)
    if (incomingRelations.length > 0) {
      documentation += `## 🔄 RELAZIONI IN ENTRATA\n`;
      documentation += `*Tabelle che referenziano ${tableName}:*\n\n`;
      for (const relation of incomingRelations) {
        documentation += `- **${relation.table_name}.${relation.column_name}** → \`${relation.foreign_column_name}\`\n`;
        documentation += `  - *Tabella sorgente:* \`${relation.table_name}\`\n`;
        documentation += `  - *Colonna sorgente:* \`${relation.column_name}\`\n`;
        documentation += `  - *Colonna locale:* \`${relation.foreign_column_name}\`\n`;
      }
      documentation += `\n`;
    }
    
    // Mappa completa relazioni
    const totalRelations = outgoingRelations.length + incomingRelations.length;
    if (totalRelations > 0) {
      documentation += `## 🗺️ MAPPA RELAZIONI COMPLETA\n`;
      documentation += `\`\`\`mermaid\n`;
      documentation += `graph TD\n`;
      
      // Nodo centrale
      documentation += `    ${tableName}[${tableName}]\n`;
      
      // Relazioni in uscita
      for (const relation of outgoingRelations) {
        documentation += `    ${tableName} -->|${relation.column_name}| ${relation.foreign_table_name}\n`;
      }
      
      // Relazioni in entrata
      for (const relation of incomingRelations) {
        documentation += `    ${relation.table_name} -->|${relation.column_name}| ${tableName}\n`;
      }
      
      documentation += `\`\`\`\n\n`;
    }
    
    // Esempio query utili
    documentation += `## 💡 QUERY UTILI\n`;
    documentation += `\`\`\`sql\n`;
    documentation += `-- Conteggio record\n`;
    documentation += `SELECT COUNT(*) FROM ${tableName};\n\n`;
    
    if (outgoingRelations.length > 0) {
      documentation += `-- Query con JOIN (relazioni in uscita)\n`;
      for (const relation of outgoingRelations) {
        documentation += `SELECT t.*, ref.* \nFROM ${tableName} t \nJOIN ${relation.foreign_table_name} ref ON t.${relation.column_name} = ref.${relation.foreign_column_name};\n\n`;
      }
    }
    
    if (incomingRelations.length > 0) {
      documentation += `-- Query con JOIN (relazioni in entrata)\n`;
      for (const relation of incomingRelations) {
        documentation += `SELECT t.*, child.* \nFROM ${tableName} t \nJOIN ${relation.table_name} child ON t.${relation.foreign_column_name} = child.${relation.column_name};\n\n`;
      }
    }
    
    documentation += `\`\`\`\n\n`;
    
    documentation += `---\n`;
    documentation += `*Documentazione generata automaticamente dal Database Explorer*\n`;
    
    return documentation;
    
  } catch (error) {
    console.error(`🚨 NEON: Errore generazione documentazione ${tableName}:`, error);
    return `❌ Errore generazione documentazione ${tableName}: ${error}`;
  }
}

export async function analyzeActivityLogs(): Promise<any> {
  try {
    console.log('🎓 NEON: Analisi activity_logs...');
    
    const result = await sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days
      FROM activity_logs
    `;
    
    return result[0];
  } catch (error) {
    console.error('🚨 NEON: Errore analisi activity_logs:', error);
    return null;
  }
}

export async function getActivityLogsStructure(): Promise<any[]> {
  try {
    console.log('🎓 NEON: Struttura activity_logs...');
    
    const result = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore struttura activity_logs:', error);
    return [];
  }
}

export async function getActivityLogsSample(limit: number = 10): Promise<any[]> {
  try {
    console.log(`🎓 NEON: Campione activity_logs (${limit} record)...`);
    
    const result = await sql`
      SELECT * FROM activity_logs 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
    
    return result;
  } catch (error) {
    console.error('🚨 NEON: Errore campione activity_logs:', error);
    return [];
  }
}

export async function writeActivityLog(
  userId: string,
  action: string, 
  resourceType: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string
): Promise<{ success: boolean; logId?: string; message: string }> {
  try {
    console.log(`🎓 NEON: Registrazione attività - ${action} su ${resourceType}`);
    
    const result = await sql`
      INSERT INTO activity_logs (
        user_id, 
        action, 
        resource_type, 
        resource_id, 
        details,
        ip_address,
        created_at
      ) VALUES (
        ${userId}::uuid,
        ${action},
        ${resourceType},
        ${resourceId ? `${resourceId}::uuid` : null},
        ${details ? JSON.stringify(details) : '{}'}::jsonb,
        ${ipAddress || null},
        NOW()
      )
      RETURNING id
    `;
    
    const logId = result[0]?.id;
    console.log(`✅ NEON: Attività registrata con ID ${logId}`);
    
    return {
      success: true,
      logId,
      message: `Attività '${action}' registrata con successo`
    };
  } catch (error) {
    console.error('🚨 NEON: Errore registrazione attività:', error);
    return {
      success: false,
      message: `Errore registrazione attività: ${error}`
    };
  }
}

export async function clearActivityLogs(): Promise<{ success: boolean; deletedCount: number; message: string }> {
  try {
    console.log('🎓 NEON: Svuotamento activity_logs...');
    
    // Prima conta i record
    const countResult = await sql`SELECT COUNT(*) as count FROM activity_logs`;
    const beforeCount = countResult[0].count;
    
    // Cancella tutti i record
    const result = await sql`DELETE FROM activity_logs`;
    
    console.log(`🎓 NEON: Cancellati ${beforeCount} record da activity_logs`);
    
    return {
      success: true,
      deletedCount: parseInt(beforeCount),
      message: `Eliminati ${beforeCount} record dalla tabella activity_logs`
    };
  } catch (error) {
    console.error('🚨 NEON: Errore svuotamento activity_logs:', error);
    return {
      success: false,
      deletedCount: 0,
      message: `Errore svuotamento: ${error}`
    };
  }
}

export function downloadDatabaseDocumentation(content: string, fileName?: string): void {
  try {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `database-documentation-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('📄 NEON: Documentazione scaricata');
  } catch (error) {
    console.error('🚨 NEON: Errore download documentazione:', error);
  }
}

export async function createMainTables(): Promise<void> {
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
    
    // Aggiungi colonna updated_at se non esiste (per database esistenti)
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
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
    
    // Costruisci la query dinamicamente con template literal Neon
    const updates = [];
    
    if (data.email) {
      updates.push(`email = '${data.email.replace(/'/g, "''")}'`);
    }
    
    if (data.full_name) {
      updates.push(`full_name = '${data.full_name.replace(/'/g, "''")}'`);
    }
    
    if (data.role) {
      updates.push(`role = '${data.role.replace(/'/g, "''")}'`);
    }
    
    if (updates.length === 0) {
      console.log('🎓 NEON: Nessun campo da aggiornare');
      return null;
    }
    
    // Aggiungi updated_at
    updates.push('updated_at = NOW()');
    
    const result = await sql`
      UPDATE users 
      SET ${sql.unsafe(updates.join(', '))}
      WHERE id = ${id}
      RETURNING id, email, full_name, role, created_at
    `;
    
    return result[0] as User || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento utente:', error);
    throw error;
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
    return { tables: [], error: (error as Error).message };
  }
}