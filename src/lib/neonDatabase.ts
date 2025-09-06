import { neon } from '@neondatabase/serverless';
import { writeAuditLog, createSystemAlert, verifyDatabaseIntegrity } from './auditLogger';

const sql = neon(import.meta.env.VITE_DATABASE_URL!, {
  disableWarningInBrowsers: true
});

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
    const allowedTables = ['users', 'normatives', 'documents', 'activity_logs', 'course_enrollments', 'course_modules', 'courses', 'user_role_overrides', 'permissions', 'sections', 'role_permissions', 'role_sections', 'roles', 'quizzes', 'quiz_questions', 'quiz_attempts', 'enrollments', 'module_progress'];
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
    console.log(`🔧 NEON: Ottenendo struttura tabella ${tableName}...`);
    
    const result = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        CASE WHEN column_name IN (
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = ${tableName} AND tc.constraint_type = 'PRIMARY KEY'
        ) THEN true ELSE false END as is_primary_key,
        CASE WHEN column_name IN (
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = ${tableName} AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN true ELSE false END as is_foreign_key
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    
    console.log(`✅ NEON: Struttura tabella ${tableName} ottenuta`, result);
    return result;
  } catch (error) {
    console.error(`❌ NEON: Errore struttura tabella ${tableName}:`, error);
    return [];
  }
}

export async function getAllTableRelations(): Promise<any[]> {
  try {
    console.log('🔧 NEON: Ottenendo tutte le relazioni tra tabelle...');
    
    const result = await sql`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, tc.constraint_name
    `;
    
    console.log(`✅ NEON: Trovate ${result.length} relazioni tra tabelle`, result);
    return result;
  } catch (error) {
    console.error('❌ NEON: Errore ottenimento relazioni tabelle:', error);
    return [];
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

// ==============================================
// INTERFACES PER SISTEMA FORMAZIONE
// ==============================================

export interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor: string;
  category: string;
  status: 'active' | 'draft' | 'archived';
  modules_count: number;
  enrollment_count: number;
  rating: number;
  tags: string[];
  file_path?: string;
  thumbnail_path?: string;
  price: number;
  is_free: boolean;
  certificate_template?: string;
  passing_score: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  type: 'lesson' | 'video' | 'document' | 'quiz';
  content?: string;
  video_url?: string;
  document_url?: string;
  order_num: number;
  duration_minutes?: number;
  is_required: boolean;
  level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  module_id: string;
  title: string;
  description: string;
  time_limit: number;
  passing_score: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  order_num: number;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'failed';
  enrolled_at: string;
  completed_at?: string;
  score?: number;
  payment_status: 'pending' | 'paid' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  attempt_number: number;
  answers: Record<string, any>; // JSONB
  score: number;
  time_spent: number;
  completed_at: string;
  created_at: string;
}

export interface CourseStats {
  totalEnrollments: number;
  completionRate: number;
  averageScore: number;
  averageTimeToComplete: number;
  dropOffPoints: { module: string; percentage: number }[];
  userFeedback: { rating: number; comment: string }[];
}

export interface ModuleProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  completed: boolean;
  completed_at?: string;
  score?: number;
  time_spent?: number;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  courseId: string;
  courseTitle: string;
  completedModules: number;
  totalModules: number;
  currentModule?: string;
  progressPercentage: number;
  lastAccessed: string;
  estimatedCompletion: string;
}

// ==============================================
// FUNZIONI CORSI
// ==============================================

export async function getAllCourses(): Promise<Course[]> {
  try {
    console.log('🎓 NEON: Recupero tutti i corsi');
    const result = await sql`
      SELECT * FROM courses
      ORDER BY created_at DESC
    `;
    return result as Course[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero corsi:', error);
    return [];
  }
}

export async function getCourseById(id: string): Promise<Course | null> {
  try {
    console.log('🎓 NEON: Ricerca corso per ID:', id);
    const result = await sql`
      SELECT * FROM courses
      WHERE id = ${id}
    `;
    return result[0] as Course || null;
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca corso:', error);
    return null;
  }
}

export async function createCourse(data: Omit<Course, 'id' | 'created_at' | 'updated_at' | 'modules_count' | 'enrollment_count'>): Promise<Course | null> {
  try {
    console.log('🎓 NEON: Creazione corso:', data.title);
    const result = await sql`
      INSERT INTO courses (
        title, description, duration, level, instructor, category, status,
        rating, tags, file_path, thumbnail_path, price, is_free,
        certificate_template, passing_score
      )
      VALUES (
        ${data.title}, ${data.description}, ${data.duration}, ${data.level},
        ${data.instructor}, ${data.category}, ${data.status}, ${data.rating},
        ${data.tags}, ${data.file_path}, ${data.thumbnail_path}, ${data.price},
        ${data.is_free}, ${data.certificate_template}, ${data.passing_score}
      )
      RETURNING *
    `;
    return result[0] as Course;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione corso:', error);
    return null;
  }
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course | null> {
  try {
    console.log('🎓 NEON: Aggiornamento corso:', id);
    const result = await sql`
      UPDATE courses 
      SET 
        title = COALESCE(${data.title}, title),
        description = COALESCE(${data.description}, description),
        duration = COALESCE(${data.duration}, duration),
        level = COALESCE(${data.level}, level),
        instructor = COALESCE(${data.instructor}, instructor),
        category = COALESCE(${data.category}, category),
        status = COALESCE(${data.status}, status),
        rating = COALESCE(${data.rating}, rating),
        tags = COALESCE(${data.tags}, tags),
        file_path = COALESCE(${data.file_path}, file_path),
        thumbnail_path = COALESCE(${data.thumbnail_path}, thumbnail_path),
        price = COALESCE(${data.price}, price),
        is_free = COALESCE(${data.is_free}, is_free),
        certificate_template = COALESCE(${data.certificate_template}, certificate_template),
        passing_score = COALESCE(${data.passing_score}, passing_score),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] as Course || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento corso:', error);
    return null;
  }
}

export async function deleteCourse(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Eliminazione corso:', id);
    await sql`DELETE FROM courses WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione corso:', error);
    return false;
  }
}

export async function getCoursesCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM courses`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('🚨 NEON: Errore conteggio corsi:', error);
    return 0;
  }
}

export async function searchCourses(query: string): Promise<Course[]> {
  try {
    console.log('🎓 NEON: Ricerca corsi:', query);
    const result = await sql`
      SELECT * FROM courses
      WHERE 
        title ILIKE ${'%' + query + '%'} OR
        description ILIKE ${'%' + query + '%'} OR
        category ILIKE ${'%' + query + '%'} OR
        instructor ILIKE ${'%' + query + '%'} OR
        EXISTS (
          SELECT 1 FROM unnest(tags) as tag 
          WHERE tag ILIKE ${'%' + query + '%'}
        )
      ORDER BY created_at DESC
    `;
    return result as Course[];
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca corsi:', error);
    return [];
  }
}

export async function getCoursesByCategory(category: string): Promise<Course[]> {
  try {
    console.log('🎓 NEON: Recupero corsi per categoria:', category);
    const result = await sql`
      SELECT * FROM courses
      WHERE category = ${category} AND status = 'active'
      ORDER BY created_at DESC
    `;
    return result as Course[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero corsi per categoria:', error);
    return [];
  }
}

export async function getCoursesByLevel(level: string): Promise<Course[]> {
  try {
    console.log('🎓 NEON: Recupero corsi per livello:', level);
    const result = await sql`
      SELECT * FROM courses
      WHERE level = ${level} AND status = 'active'
      ORDER BY created_at DESC
    `;
    return result as Course[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero corsi per livello:', error);
    return [];
  }
}

export async function getPopularCourses(limit: number = 10): Promise<Course[]> {
  try {
    console.log('🎓 NEON: Recupero corsi popolari');
    const result = await sql`
      SELECT * FROM courses
      WHERE status = 'active'
      ORDER BY enrollment_count DESC, rating DESC
      LIMIT ${limit}
    `;
    return result as Course[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero corsi popolari:', error);
    return [];
  }
}

// ==============================================
// FUNZIONI MODULI
// ==============================================

export async function getCourseModules(courseId: string): Promise<CourseModule[]> {
  try {
    console.log('🎓 NEON: Recupero moduli per corso:', courseId);
    const result = await sql`
      SELECT * FROM course_modules
      WHERE course_id = ${courseId}
      ORDER BY order_num ASC
    `;
    return result as CourseModule[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero moduli:', error);
    return [];
  }
}

export async function createCourseModule(data: Omit<CourseModule, 'id' | 'created_at' | 'updated_at'>): Promise<CourseModule | null> {
  try {
    console.log('🎓 NEON: Creazione modulo:', data.title);
    const result = await sql`
      INSERT INTO course_modules (
        course_id, title, description, type, content, video_url, document_url,
        order_num, duration_minutes, is_required, level
      )
      VALUES (
        ${data.course_id}, ${data.title}, ${data.description}, ${data.type},
        ${data.content}, ${data.video_url}, ${data.document_url}, ${data.order_num},
        ${data.duration_minutes}, ${data.is_required}, ${data.level}
      )
      RETURNING *
    `;
    return result[0] as CourseModule;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione modulo:', error);
    return null;
  }
}

export async function updateCourseModule(id: string, data: Partial<CourseModule>): Promise<CourseModule | null> {
  try {
    console.log('🎓 NEON: Aggiornamento modulo:', id);
    const result = await sql`
      UPDATE course_modules 
      SET 
        title = COALESCE(${data.title}, title),
        description = COALESCE(${data.description}, description),
        type = COALESCE(${data.type}, type),
        content = COALESCE(${data.content}, content),
        video_url = COALESCE(${data.video_url}, video_url),
        document_url = COALESCE(${data.document_url}, document_url),
        order_num = COALESCE(${data.order_num}, order_num),
        duration_minutes = COALESCE(${data.duration_minutes}, duration_minutes),
        is_required = COALESCE(${data.is_required}, is_required),
        level = COALESCE(${data.level}, level),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] as CourseModule || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento modulo:', error);
    return null;
  }
}

export async function deleteCourseModule(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Eliminazione modulo:', id);
    await sql`DELETE FROM course_modules WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione modulo:', error);
    return false;
  }
}

// ==============================================
// FUNZIONI QUIZ
// ==============================================

export async function getModuleQuiz(moduleId: string): Promise<Quiz | null> {
  try {
    console.log('🎓 NEON: Recupero quiz per modulo:', moduleId);
    const result = await sql`
      SELECT * FROM quizzes
      WHERE module_id = ${moduleId}
    `;
    return result[0] as Quiz || null;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero quiz:', error);
    return null;
  }
}

// Funzione helper per parsing options
export function parseQuizOptions(options: string | string[]): string[] {
  if (Array.isArray(options)) {
    return options;
  }
  if (typeof options === 'string') {
    return options.split(',').map(opt => opt.trim());
  }
  return [];
}

export async function getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  try {
    console.log('🎓 NEON: Recupero domande quiz:', quizId);
    const result = await sql`
      SELECT * FROM quiz_questions
      WHERE quiz_id = ${quizId}
      ORDER BY order_num ASC
    `;
    
    // Parse options da string a array per compatibilità
    const parsedQuestions = result.map(question => ({
      ...question,
      options: parseQuizOptions(question.options)
    }));
    
    console.log(`✅ NEON: ${parsedQuestions.length} domande con options parsate`);
    return parsedQuestions as QuizQuestion[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero domande quiz:', error);
    return [];
  }
}

export async function createQuiz(data: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>): Promise<Quiz | null> {
  try {
    console.log('🎓 NEON: Creazione quiz:', data.title);
    const result = await sql`
      INSERT INTO quizzes (
        module_id, title, description, time_limit, passing_score, max_attempts
      )
      VALUES (
        ${data.module_id}, ${data.title}, ${data.description}, ${data.time_limit},
        ${data.passing_score}, ${data.max_attempts}
      )
      RETURNING *
    `;
    return result[0] as Quiz;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione quiz:', error);
    return null;
  }
}

export async function updateQuiz(id: string, data: Partial<Quiz>): Promise<Quiz | null> {
  try {
    console.log('🎓 NEON: Aggiornamento quiz:', id);
    const result = await sql`
      UPDATE quizzes 
      SET 
        title = COALESCE(${data.title}, title),
        description = COALESCE(${data.description}, description),
        time_limit = COALESCE(${data.time_limit}, time_limit),
        passing_score = COALESCE(${data.passing_score}, passing_score),
        max_attempts = COALESCE(${data.max_attempts}, max_attempts),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] as Quiz || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento quiz:', error);
    return null;
  }
}

export async function deleteQuiz(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Eliminazione quiz:', id);
    
    // Prima elimina le domande associate
    await sql`DELETE FROM quiz_questions WHERE quiz_id = ${id}`;
    
    // Poi elimina i tentativi associati
    await sql`DELETE FROM quiz_attempts WHERE quiz_id = ${id}`;
    
    // Infine elimina il quiz
    const result = await sql`DELETE FROM quizzes WHERE id = ${id}`;
    
    return result.length > 0;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione quiz:', error);
    return false;
  }
}

export async function updateQuizQuestion(id: string, data: Partial<QuizQuestion>): Promise<QuizQuestion | null> {
  try {
    console.log('🎓 NEON: Aggiornamento domanda quiz:', id);
    const result = await sql`
      UPDATE quiz_questions 
      SET 
        question = COALESCE(${data.question}, question),
        options = COALESCE(${data.options}, options),
        correct_answer = COALESCE(${data.correct_answer}, correct_answer),
        explanation = COALESCE(${data.explanation}, explanation),
        order_num = COALESCE(${data.order_num}, order_num),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] as QuizQuestion || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento domanda quiz:', error);
    return null;
  }
}

export async function deleteQuizQuestion(id: string): Promise<boolean> {
  try {
    console.log('🎓 NEON: Eliminazione domanda quiz:', id);
    const result = await sql`DELETE FROM quiz_questions WHERE id = ${id}`;
    return result.length > 0;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione domanda quiz:', error);
    return false;
  }
}

// Funzioni per gestione tentativi quiz
export async function createQuizAttempt(data: {
  user_id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, number>;
  completed_at: string;
}): Promise<QuizAttempt | null> {
  try {
    console.log('🎓 NEON: Creazione tentativo quiz:', data.quiz_id);
    const result = await sql`
      INSERT INTO quiz_attempts (
        user_id, quiz_id, score, passed, answers, completed_at
      ) VALUES (
        ${data.user_id}, ${data.quiz_id}, ${data.score}, ${data.passed},
        ${JSON.stringify(data.answers)}, ${data.completed_at}
      )
      RETURNING *
    `;
    return result[0] as QuizAttempt || null;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione tentativo quiz:', error);
    return null;
  }
}

export async function getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
  try {
    console.log('🎓 NEON: Recupero tentativi quiz:', { userId, quizId });
    const result = await sql`
      SELECT * FROM quiz_attempts 
      WHERE user_id = ${userId} AND quiz_id = ${quizId}
      ORDER BY created_at DESC
    `;
    return result as QuizAttempt[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero tentativi quiz:', error);
    return [];
  }
}

export async function getQuizAttemptById(id: string): Promise<QuizAttempt | null> {
  try {
    console.log('🎓 NEON: Recupero tentativo quiz:', id);
    const result = await sql`
      SELECT * FROM quiz_attempts WHERE id = ${id}
    `;
    return result[0] as QuizAttempt || null;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero tentativo quiz:', error);
    return null;
  }
}

export async function createQuizQuestion(data: Omit<QuizQuestion, 'id' | 'created_at' | 'updated_at'>): Promise<QuizQuestion | null> {
  try {
    console.log('🎓 NEON: Creazione domanda quiz');
    const result = await sql`
      INSERT INTO quiz_questions (
        quiz_id, question, options, correct_answer, explanation, order_num
      )
      VALUES (
        ${data.quiz_id}, ${data.question}, ${data.options}, ${data.correct_answer},
        ${data.explanation}, ${data.order_num}
      )
      RETURNING *
    `;
    return result[0] as QuizQuestion;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione domanda quiz:', error);
    return null;
  }
}

// ==============================================
// FUNZIONI ISCRIZIONI
// ==============================================

export async function getUserEnrollments(userId: string): Promise<Enrollment[]> {
  try {
    console.log('🎓 NEON: Recupero iscrizioni utente:', userId);
    const result = await sql`
      SELECT e.*, c.title as course_title
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${userId}
      ORDER BY e.enrolled_at DESC
    `;
    return result as Enrollment[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero iscrizioni:', error);
    return [];
  }
}

export async function enrollUserInCourse(userId: string, courseId: string): Promise<Enrollment | null> {
  try {
    console.log('🎓 NEON: Iscrizione utente al corso:', { userId, courseId });
    
    // Verifica se l'utente è già iscritto
    const existingEnrollment = await sql`
      SELECT id FROM enrollments 
      WHERE user_id = ${userId} AND course_id = ${courseId}
    `;
    
    if (existingEnrollment.length > 0) {
      throw new Error('Utente già iscritto a questo corso');
    }
    
    const result = await sql`
      INSERT INTO enrollments (user_id, course_id, status, payment_status)
      VALUES (${userId}, ${courseId}, 'enrolled', 'pending')
      RETURNING *
    `;
    return result[0] as Enrollment;
  } catch (error) {
    console.error('🚨 NEON: Errore iscrizione corso:', error);
    return null;
  }
}

export async function updateEnrollmentProgress(enrollmentId: string, moduleId: string, completed: boolean): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento progresso iscrizione:', { enrollmentId, moduleId, completed });
    
    // Logica per aggiornare il progresso dell'utente
    // Questa funzione può essere estesa per tracciare moduli completati
    
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento progresso:', error);
    return false;
  }
}

export async function completeCourse(enrollmentId: string, finalScore: number): Promise<boolean> {
  try {
    console.log('🎓 NEON: Completamento corso:', { enrollmentId, finalScore });
    
    const result = await sql`
      UPDATE enrollments 
      SET 
        status = 'completed',
        score = ${finalScore},
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${enrollmentId}
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('🚨 NEON: Errore completamento corso:', error);
    return false;
  }
}

export async function updateEnrollmentStatus(enrollmentId: string, status: 'enrolled' | 'in_progress' | 'completed' | 'failed'): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento status iscrizione:', { enrollmentId, status });
    
    const result = await sql`
      UPDATE enrollments 
      SET 
        status = ${status},
        updated_at = NOW(),
        completed_at = ${status === 'completed' ? 'NOW()' : null}
      WHERE id = ${enrollmentId}
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento status iscrizione:', error);
    return false;
  }
}

// ==============================================
// FUNZIONI STATISTICHE
// ==============================================

export async function getCourseStats(courseId: string): Promise<CourseStats> {
  try {
    console.log('🎓 NEON: Recupero statistiche corso:', courseId);
    
    const [
      enrollments,
      completions,
      scores
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM enrollments WHERE course_id = ${courseId}`,
      sql`SELECT COUNT(*) as count FROM enrollments WHERE course_id = ${courseId} AND status = 'completed'`,
      sql`SELECT AVG(score) as avg_score FROM enrollments WHERE course_id = ${courseId} AND score IS NOT NULL`
    ]);
    
    const totalEnrollments = parseInt(enrollments[0].count);
    const totalCompletions = parseInt(completions[0].count);
    const averageScore = parseFloat(scores[0].avg_score || '0');
    
    return {
      totalEnrollments,
      completionRate: totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0,
      averageScore,
      averageTimeToComplete: 0, // Da implementare
      dropOffPoints: [], // Da implementare
      userFeedback: [] // Da implementare
    };
  } catch (error) {
    console.error('🚨 NEON: Errore recupero statistiche corso:', error);
    return {
      totalEnrollments: 0,
      completionRate: 0,
      averageScore: 0,
      averageTimeToComplete: 0,
      dropOffPoints: [],
      userFeedback: []
    };
  }
}

export async function getUserProgress(userId: string, courseId: string): Promise<UserProgress | null> {
  try {
    console.log('🎓 NEON: Recupero progresso utente:', { userId, courseId });
    
    const [enrollment, course, modules] = await Promise.all([
      sql`SELECT * FROM enrollments WHERE user_id = ${userId} AND course_id = ${courseId}`,
      sql`SELECT title FROM courses WHERE id = ${courseId}`,
      sql`SELECT COUNT(*) as count FROM course_modules WHERE course_id = ${courseId}`
    ]);
    
    if (enrollment.length === 0 || course.length === 0) {
      return null;
    }
    
    const totalModules = parseInt(modules[0].count);
    
    // Verifica se la tabella module_progress esiste
    let completedModules = 0;
    try {
      const progressResult = await sql`
        SELECT COUNT(*) as count 
        FROM module_progress mp
        JOIN enrollments e ON mp.enrollment_id = e.id
        WHERE e.user_id = ${userId} AND e.course_id = ${courseId} AND mp.completed = true
      `;
      completedModules = parseInt(progressResult[0]?.count || 0);
    } catch (error: any) {
      if (error.code === '42P01') { // relation does not exist
        console.log('⚠️ NEON: Tabella module_progress non esiste, usando progresso 0');
        completedModules = 0;
      } else {
        throw error;
      }
    }
    
    return {
      courseId,
      courseTitle: course[0].title,
      completedModules,
      totalModules,
      progressPercentage: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
      lastAccessed: enrollment[0].enrolled_at,
      estimatedCompletion: '' // Da calcolare
    };
  } catch (error) {
    console.error('🚨 NEON: Errore recupero progresso utente:', error);
    return null;
  }
}

// ==============================================
// FUNZIONI MODULE PROGRESS
// ==============================================

export async function updateModuleProgress(
  enrollmentId: string, 
  moduleId: string, 
  completed: boolean,
  score?: number,
  timeSpent?: number
): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento progresso modulo:', { enrollmentId, moduleId, completed });
    
    // Verifica se esiste già un record di progresso
    const existing = await sql`
      SELECT id FROM module_progress 
      WHERE enrollment_id = ${enrollmentId} AND module_id = ${moduleId}
    `;
    
    if (existing.length > 0) {
      // Aggiorna record esistente
      await sql`
        UPDATE module_progress 
        SET 
          completed = ${completed},
          completed_at = ${completed ? new Date().toISOString() : null},
          score = ${score || null},
          time_spent = ${timeSpent || null},
          updated_at = NOW()
        WHERE enrollment_id = ${enrollmentId} AND module_id = ${moduleId}
      `;
    } else {
      // Crea nuovo record
      await sql`
        INSERT INTO module_progress (enrollment_id, module_id, completed, completed_at, score, time_spent)
        VALUES (
          ${enrollmentId}, 
          ${moduleId}, 
          ${completed}, 
          ${completed ? new Date().toISOString() : null},
          ${score || null},
          ${timeSpent || null}
        )
      `;
    }
    
    console.log('🎓 NEON: Progresso modulo aggiornato con successo');
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento progresso modulo:', error);
    return false;
  }
}

export async function getUserModuleProgress(
  userId: string, 
  courseId: string
): Promise<ModuleProgress[]> {
  try {
    console.log('🎓 NEON: Recupero progresso moduli utente:', { userId, courseId });
    
    const result = await sql`
      SELECT mp.* 
      FROM module_progress mp
      JOIN enrollments e ON mp.enrollment_id = e.id
      JOIN course_modules cm ON mp.module_id = cm.id
      WHERE e.user_id = ${userId} AND e.course_id = ${courseId}
      ORDER BY cm.order_num
    `;
    
    console.log('🎓 NEON: Trovati', result.length, 'record di progresso');
    return result as ModuleProgress[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero progresso moduli:', error);
    return [];
  }
}

export async function getEnrollmentByUserAndCourse(
  userId: string, 
  courseId: string
): Promise<Enrollment | null> {
  try {
    console.log('🎓 NEON: Ricerca iscrizione:', { userId, courseId });
    
    const result = await sql`
      SELECT * FROM enrollments 
      WHERE user_id = ${userId} AND course_id = ${courseId}
      LIMIT 1
    `;
    
    return result[0] as Enrollment || null;
  } catch (error) {
    console.error('🚨 NEON: Errore ricerca iscrizione:', error);
    return null;
  }
}

// ==================== CERTIFICATES CRUD ====================

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  issued_date: string;
  pdf_path?: string;
  verification_url?: string;
  created_at: string;
  updated_at: string;
}

export async function createCertificate(data: Omit<Certificate, 'id' | 'created_at' | 'updated_at'>): Promise<Certificate | null> {
  try {
    console.log('📜 NEON: Creazione certificato:', data);
    
    const result = await sql`
      INSERT INTO certificates (
        user_id, course_id, certificate_code, issued_date, 
        pdf_path, verification_url
      ) VALUES (
        ${data.user_id}, ${data.course_id}, ${data.certificate_code}, 
        ${data.issued_date}, ${data.pdf_path || null}, ${data.verification_url || null}
      )
      RETURNING *
    `;
    
    console.log('✅ NEON: Certificato creato:', result[0]);
    return result[0] as Certificate;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione certificato:', error);
    return null;
  }
}

export async function getCertificatesByUser(userId: string): Promise<Certificate[]> {
  try {
    console.log('📜 NEON: Recupero certificati utente:', userId);
    
    const result = await sql`
      SELECT c.*, co.title as course_title 
      FROM certificates c
      JOIN courses co ON c.course_id = co.id
      WHERE c.user_id = ${userId}
      ORDER BY c.issued_date DESC
    `;
    
    return result as Certificate[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero certificati utente:', error);
    return [];
  }
}

export async function getCertificateByCode(code: string): Promise<Certificate | null> {
  try {
    console.log('📜 NEON: Verifica certificato:', code);
    
    const result = await sql`
      SELECT c.*, co.title as course_title, u.name as user_name
      FROM certificates c
      JOIN courses co ON c.course_id = co.id
      JOIN users u ON c.user_id = u.id
      WHERE c.certificate_code = ${code}
      LIMIT 1
    `;
    
    return result[0] as Certificate || null;
  } catch (error) {
    console.error('🚨 NEON: Errore verifica certificato:', error);
    return null;
  }
}

export async function updateCertificate(id: string, data: Partial<Certificate>): Promise<Certificate | null> {
  try {
    console.log('📜 NEON: Aggiornamento certificato:', { id, data });
    
    const result = await sql`
      UPDATE certificates 
      SET 
        pdf_path = ${data.pdf_path || null},
        verification_url = ${data.verification_url || null}
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0] as Certificate || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento certificato:', error);
    return null;
  }
}

export async function deleteCertificate(id: string): Promise<boolean> {
  try {
    console.log('📜 NEON: Eliminazione certificato:', id);
    
    await sql`DELETE FROM certificates WHERE id = ${id}`;
    
    console.log('✅ NEON: Certificato eliminato');
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione certificato:', error);
    return false;
  }
}

// ==================== COURSE FEEDBACK CRUD ====================

export interface CourseFeedback {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  feedback_text?: string;
  created_at: string;
  updated_at: string;
}

export async function createCourseFeedback(data: Omit<CourseFeedback, 'id' | 'created_at' | 'updated_at'>): Promise<CourseFeedback | null> {
  try {
    console.log('⭐ NEON: Creazione feedback corso:', data);
    
    const result = await sql`
      INSERT INTO course_feedback (
        user_id, course_id, rating, feedback_text
      ) VALUES (
        ${data.user_id}, ${data.course_id}, ${data.rating}, ${data.feedback_text || null}
      )
      RETURNING *
    `;
    
    console.log('✅ NEON: Feedback corso creato:', result[0]);
    return result[0] as CourseFeedback;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione feedback corso:', error);
    return null;
  }
}

export async function getCourseFeedback(courseId: string): Promise<CourseFeedback[]> {
  try {
    console.log('⭐ NEON: Recupero feedback corso:', courseId);
    
    const result = await sql`
      SELECT cf.*, u.name as user_name
      FROM course_feedback cf
      JOIN users u ON cf.user_id = u.id
      WHERE cf.course_id = ${courseId}
      ORDER BY cf.created_at DESC
    `;
    
    return result as CourseFeedback[];
  } catch (error) {
    console.error('🚨 NEON: Errore recupero feedback corso:', error);
    return [];
  }
}

export async function getUserCourseFeedback(userId: string, courseId: string): Promise<CourseFeedback | null> {
  try {
    console.log('⭐ NEON: Recupero feedback utente corso:', { userId, courseId });
    
    const result = await sql`
      SELECT * FROM course_feedback 
      WHERE user_id = ${userId} AND course_id = ${courseId}
      LIMIT 1
    `;
    
    return result[0] as CourseFeedback || null;
  } catch (error) {
    console.error('🚨 NEON: Errore recupero feedback utente corso:', error);
    return null;
  }
}

export async function updateCourseFeedback(id: string, data: Partial<CourseFeedback>): Promise<CourseFeedback | null> {
  try {
    console.log('⭐ NEON: Aggiornamento feedback corso:', { id, data });
    
    const result = await sql`
      UPDATE course_feedback 
      SET 
        rating = ${data.rating || null},
        feedback_text = ${data.feedback_text || null}
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0] as CourseFeedback || null;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento feedback corso:', error);
    return null;
  }
}

export async function deleteCourseFeedback(id: string): Promise<boolean> {
  try {
    console.log('⭐ NEON: Eliminazione feedback corso:', id);
    
    await sql`DELETE FROM course_feedback WHERE id = ${id}`;
    
    console.log('✅ NEON: Feedback corso eliminato');
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore eliminazione feedback corso:', error);
    return false;
  }
}

export async function getCourseAverageRating(courseId: string): Promise<number> {
  try {
    console.log('⭐ NEON: Calcolo rating medio corso:', courseId);
    
    const result = await sql`
      SELECT AVG(rating) as average_rating
      FROM course_feedback 
      WHERE course_id = ${courseId}
    `;
    
    const averageRating = result[0]?.average_rating || 0;
    return Math.round(averageRating * 10) / 10; // Arrotonda a 1 decimale
  } catch (error) {
    console.error('🚨 NEON: Errore calcolo rating medio corso:', error);
    return 0;
  }
}