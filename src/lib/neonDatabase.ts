import { neon } from '@neondatabase/serverless';

// Inizializza connessione Neon
const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

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
export async function seedPermissionsData(): Promise<boolean> {
  try {
    console.log('🎓 NEON: Inserimento dati base sistema permessi...');
    
    // Inserisci ruoli base
    await sql`
      INSERT INTO roles (name, display_name, description, level) VALUES
      ('superadmin', 'Super Amministratore', 'Accesso completo al sistema', 1),
      ('admin', 'Amministratore', 'Gestione utenti e contenuti', 2),
      ('operator', 'Operatore', 'Gestione contenuti', 3),
      ('user', 'Utente', 'Accesso base', 4),
      ('guest', 'Ospite', 'Accesso limitato', 5)
      ON CONFLICT (name) DO NOTHING
    `;

    // Inserisci permessi per normative
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('normatives.view', 'Può visualizzare le normative', 'normatives'),
      ('normatives.create', 'Può creare nuove normative', 'normatives'),
      ('normatives.edit', 'Può modificare normative esistenti', 'normatives'),
      ('normatives.delete', 'Può eliminare normative', 'normatives'),
      ('normatives.publish', 'Può pubblicare normative', 'normatives')
      ON CONFLICT (name) DO NOTHING
    `;

    // Inserisci permessi per documenti
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('documents.view', 'Può visualizzare i documenti', 'documents'),
      ('documents.create', 'Può creare nuovi documenti', 'documents'),
      ('documents.edit', 'Può modificare documenti esistenti', 'documents'),
      ('documents.delete', 'Può eliminare documenti', 'documents'),
      ('documents.upload', 'Può caricare nuovi documenti', 'documents')
      ON CONFLICT (name) DO NOTHING
    `;

    // Inserisci permessi per utenti
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('users.view', 'Può visualizzare la lista utenti', 'users'),
      ('users.create', 'Può creare nuovi utenti', 'users'),
      ('users.edit', 'Può modificare utenti esistenti', 'users'),
      ('users.delete', 'Può eliminare utenti', 'users'),
      ('users.manage_roles', 'Può modificare i ruoli utente', 'users')
      ON CONFLICT (name) DO NOTHING
    `;

    // Inserisci permessi per formazione
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('education.view', 'Può visualizzare i corsi', 'education'),
      ('education.create', 'Può creare nuovi corsi', 'education'),
      ('education.edit', 'Può modificare corsi esistenti', 'education'),
      ('education.delete', 'Può eliminare corsi', 'education'),
      ('education.enroll', 'Può iscriversi ai corsi', 'education')
      ON CONFLICT (name) DO NOTHING
    `;

    // Inserisci permessi per sistema
    await sql`
      INSERT INTO permissions (name, description, category) VALUES
      ('system.settings', 'Accesso alle impostazioni sistema', 'system'),
      ('system.permissions', 'Può modificare i permessi', 'system'),
      ('system.logs', 'Può visualizzare i log di sistema', 'system'),
      ('system.backup', 'Può fare backup del sistema', 'system')
      ON CONFLICT (name) DO NOTHING
    `;

    // Inserisci sezioni dell'interfaccia
    await sql`
      INSERT INTO sections (name, display_name, description) VALUES
      ('dashboard', 'Dashboard', 'Pannello principale'),
      ('normatives', 'Normative', 'Gestione normative'),
      ('documents', 'Documenti', 'Gestione documenti'),
      ('education', 'Formazione', 'Corsi e formazione'),
      ('users', 'Utenti', 'Gestione utenti'),
      ('admin', 'Amministrazione', 'Pannello amministrativo'),
      ('superadmin', 'Super Admin', 'Pannello super amministrativo'),
      ('reports', 'Report', 'Gestione report')
      ON CONFLICT (name) DO NOTHING
    `;

    console.log('🎓 NEON: Dati base sistema permessi inseriti');
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore inserimento dati base:', error);
    return false;
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
      ORDER BY level
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
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = ${roleName} AND rp.granted = TRUE
    `;
    return result.map(row => row.name);
  } catch (error) {
    console.error('🚨 NEON: Errore recupero permessi ruolo:', error);
    return [];
  }
}

export async function getRoleSectionsFromDB(roleName: string): Promise<string[]> {
  try {
    console.log('🎓 NEON: Recupero sezioni per ruolo dal database:', roleName);
    const result = await sql`
      SELECT s.name
      FROM sections s
      JOIN role_sections rs ON s.id = rs.section_id
      JOIN roles r ON rs.role_id = r.id
      WHERE r.name = ${roleName} AND rs.visible = TRUE
    `;
    return result.map(row => row.name);
  } catch (error) {
    console.error('🚨 NEON: Errore recupero sezioni ruolo:', error);
    return [];
  }
}

export async function updateRolePermissionInDB(roleName: string, permissionName: string, granted: boolean): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento permesso ruolo:', { roleName, permissionName, granted });
    
    await sql`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT r.id, p.id, ${granted}
      FROM roles r, permissions p
      WHERE r.name = ${roleName} AND p.name = ${permissionName}
      ON CONFLICT (role_id, permission_id)
      DO UPDATE SET granted = ${granted}, created_at = NOW()
    `;
    
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento permesso ruolo:', error);
    return false;
  }
}

export async function updateRoleSectionInDB(roleName: string, sectionName: string, visible: boolean): Promise<boolean> {
  try {
    console.log('🎓 NEON: Aggiornamento sezione ruolo:', { roleName, sectionName, visible });
    
    await sql`
      INSERT INTO role_sections (role_id, section_id, visible)
      SELECT r.id, s.id, ${visible}
      FROM roles r, sections s
      WHERE r.name = ${roleName} AND s.name = ${sectionName}
      ON CONFLICT (role_id, section_id)
      DO UPDATE SET visible = ${visible}, created_at = NOW()
    `;
    
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore aggiornamento sezione ruolo:', error);
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

// === FUNZIONI PERMESSI ===

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
  return await updateRoleSectionInDB(role, section, visible);
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