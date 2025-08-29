import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL!);

export interface User {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: 'user' | 'admin' | 'superadmin' | 'operator';
  created_at: string;
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
  created_at: string;
  updated_at: string;
}

// Interfacce per Database Tables
export interface DatabaseTable {
  name: string;
  schema: string;
  recordCount: number;
  estimatedSize: string;
  lastModified: string;
  tableType: 'BASE TABLE' | 'VIEW';
  comment?: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  maxLength?: number;
  position: number;
}

export interface TableStructure {
  tableName: string;
  schema: string;
  columns: TableColumn[];
  indexes: string[];
  constraints: string[];
  recordCount: number;
}

// Inizializza le tabelle se non esistono
export async function initializeTables() {
  try {
    console.log('🎓 ACCADEMIA: Configurazione archivio normativo...');
    console.log('🎓 ACCADEMIA: Connessione database verificata:', !!import.meta.env.VITE_DATABASE_URL);
    
    // Crea tabella users
    console.log('🎓 ACCADEMIA: Configurazione sistema utenti...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'operator')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella normatives
    console.log('🎓 ACCADEMIA: Configurazione archivio normative...');
    await sql`
      CREATE TABLE IF NOT EXISTS normatives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('law', 'regulation', 'ruling')),
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        publication_date DATE NOT NULL,
        effective_date DATE NOT NULL,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella activity_logs
    console.log('🎓 ACCADEMIA: Configurazione sistema di audit...');
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella permissions
    console.log('🎓 ACCADEMIA: Configurazione sistema permessi...');
    await sql`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        permission_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        level INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella role_permissions
    console.log('🎓 ACCADEMIA: Configurazione matrice autorizzazioni...');
    await sql`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role VARCHAR(20) NOT NULL,
        permission_id VARCHAR(100) NOT NULL,
        granted BOOLEAN DEFAULT true,
        granted_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(role, permission_id)
      )
    `;

    // Crea tabella role_sections
    console.log('🎓 ACCADEMIA: Configurazione visibilità sezioni...');
    await sql`
      CREATE TABLE IF NOT EXISTS role_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role VARCHAR(20) NOT NULL,
        section VARCHAR(50) NOT NULL,
        visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(role, section)
      )
    `;

    // Inserisci dati di esempio
    console.log('🎓 ACCADEMIA: Popolamento archivio con dati iniziali...');
    await insertSampleData();
    
    // Inserisci permessi e configurazioni di default
    await insertDefaultPermissions();
    await insertDefaultRoleConfiguration();

    console.log('🎓 ACCADEMIA: Sistema inizializzato con successo!');
    return true;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore critico durante l\'inizializzazione:', error);
    console.error('🚨 ACCADEMIA: Dettagli tecnici:', error?.message);
    return false;
  }
}

// Inserisci dati di esempio
async function insertSampleData() {
  try {
    console.log('🎓 ACCADEMIA: Configurazione utenti amministrativi...');
    
    // Hash password semplificato per demo
    console.log('🎓 ACCADEMIA: Generazione credenziali sicure...');
    const adminHash = await hashPassword('admin123');
    const userHash = await hashPassword('user123');
    const superAdminHash = await hashPassword('superadmin2024!');

    // Inserisci utenti
    console.log('🎓 ACCADEMIA: Creazione profili utente...');
    await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES 
        ('superadmin@accademiatpl.org', 'Super Amministratore', ${superAdminHash}, 'superadmin'),
        ('admin@accademia.it', 'Amministratore', ${adminHash}, 'admin'),
        ('user@accademia.it', 'Utente Demo', ${userHash}, 'user')
      ON CONFLICT (email) DO NOTHING
    `;

    // Inserisci normative
    console.log('🎓 ACCADEMIA: Popolamento archivio normativo...');
    
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
        ),
        (
          'Sentenza TAR Lazio n. 1234/2023',
          'Il Tribunale Amministrativo Regionale del Lazio si è pronunciato sulla questione relativa ai requisiti per il rilascio delle autorizzazioni per il trasporto pubblico locale non di linea. La sentenza chiarisce i criteri di valutazione delle domande di autorizzazione.',
          'Giurisprudenza',
          'ruling',
          'TAR Lazio 1234/2023',
          '2023-05-20',
          '2023-05-20',
          ARRAY['tar', 'autorizzazioni', 'giurisprudenza']
        )
      ON CONFLICT (reference_number) DO NOTHING
    `;

    // Inserisci alcuni log di attività di esempio
    console.log('🎓 ACCADEMIA: Inizializzazione registro attività...');
    const adminUser = await sql`SELECT id FROM users WHERE email = 'admin@accademia.it'`;
    if (adminUser.length > 0) {
      await sql`
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
        VALUES 
          (${adminUser[0].id}, 'CREATE', 'normative', gen_random_uuid(), '{"title": "Decreto Legislativo 285/1992"}'),
          (${adminUser[0].id}, 'LOGIN', 'user', ${adminUser[0].id}, '{"ip": "127.0.0.1"}'),
          (${adminUser[0].id}, 'VIEW', 'normative', gen_random_uuid(), '{"title": "Legge Regionale 15/2018"}')
      `;
    }

    console.log('🎓 ACCADEMIA: Archivio popolato con successo!');
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore durante il popolamento archivio:', error);
    console.error('🚨 ACCADEMIA: Dettagli tecnici:', error?.message);
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

// Verifica password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  console.log('🎓 ACCADEMIA: Verifica credenziali di accesso...');
  
  const passwordHash = await hashPassword(password);
  const isValid = passwordHash === hash;
  
  console.log('🎓 ACCADEMIA: Credenziali', isValid ? 'valide' : 'non valide');
  return isValid;
}

// === METODI PER UTENTI ===
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log('🎓 ACCADEMIA: Ricerca profilo utente:', email);
    
    const result = await sql`
      SELECT id, email, full_name, password_hash, role, created_at
      FROM users
      WHERE email = ${email}
    `;
    
    if (result.length > 0) {
      console.log('🎓 ACCADEMIA: Profilo trovato:', result[0].full_name, `(${result[0].role})`);
      return result[0];
    }
    
    console.log('🎓 ACCADEMIA: Profilo non trovato per:', email);
    return null;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore ricerca profilo utente:', error?.message);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, email, full_name, role, created_at
      FROM users
      WHERE id = ${id}
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Errore recupero utente per ID:', error);
    return null;
  }
}

export async function createUser(email: string, fullName: string, passwordHash: string, role: 'user' | 'admin' | 'superadmin' | 'operator' = 'user'): Promise<User | null> {
  try {
    const result = await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES (${email}, ${fullName}, ${passwordHash}, ${role})
      RETURNING id, email, full_name, role, created_at
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Errore creazione utente:', error);
    return null;
  }
}

export async function getAllUsers(excludeSuperAdmin: boolean = false, currentUserId?: string): Promise<User[]> {
  try {
    const result = await sql`
      SELECT id, email, full_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    if (excludeSuperAdmin) {
      return result.filter(user => {
        // Se è un SuperAdmin che sta guardando, può vedere se stesso
        if (currentUserId && user.id === currentUserId) {
          return true;
        }
        // Altrimenti nascondi tutti i SuperAdmin
        return user.role !== 'superadmin';
      });
    }
    
    return result;
  } catch (error) {
    console.error('Errore recupero tutti gli utenti:', error);
    return [];
  }
}

export async function getUsersCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore conteggio profili utente:', error?.message);
    return 0;
  }
}

export async function updateUser(id: string, data: { email?: string; full_name?: string; role?: 'user' | 'admin' | 'superadmin' | 'operator' }): Promise<User | null> {
  try {
    console.log('🎓 ACCADEMIA: Aggiornamento profilo utente...');
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.full_name) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(data.full_name);
    }
    if (data.role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }

    if (updates.length === 0) return null;

    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, role, created_at
    `;
    values.push(id);

    const result = await sql.unsafe(query, values);
    return result[0] || null;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore aggiornamento profilo:', error?.message);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    console.log('🎓 ACCADEMIA: Rimozione profilo utente...');
    const result = await sql`
      DELETE FROM users 
      WHERE id = ${id}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore rimozione profilo:', error?.message);
    throw error;
  }
}

export async function updateUserPassword(id: string, newPassword: string): Promise<boolean> {
  try {
    const passwordHash = await hashPassword(newPassword);
    const result = await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}
      WHERE id = ${id}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Errore aggiornamento password:', error);
    throw error;
  }
}

// === METODI PER NORMATIVE ===
export async function getAllNormatives(): Promise<Normative[]> {
  try {
    const result = await sql`
      SELECT * FROM normatives
      ORDER BY publication_date DESC
    `;
    return result;
  } catch (error) {
    console.error('Errore recupero normative:', error);
    return [];
  }
}

export async function getNormativeById(id: string): Promise<Normative | null> {
  try {
    const result = await sql`
      SELECT * FROM normatives
      WHERE id = ${id}
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Errore recupero normativa per ID:', error);
    return null;
  }
}

export async function getNormativesCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM normatives`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore conteggio normative:', error);
    return 0;
  }
}

export async function getRecentNormativesCount(days: number = 30): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM normatives 
      WHERE created_at >= NOW() - INTERVAL '1 day' * ${days}
    `;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore conteggio normative recenti:', error);
    return 0;
  }
}

// === METODI PER PERMESSI ===
async function insertDefaultPermissions() {
  try {
    const permissions = [
      // Gestione Utenti
      { id: 'users.view', name: 'Visualizza Utenti', description: 'Può vedere la lista utenti', category: 'users', level: 2 },
      { id: 'users.create', name: 'Crea Utenti', description: 'Può creare nuovi utenti', category: 'users', level: 2 },
      { id: 'users.edit', name: 'Modifica Utenti', description: 'Può modificare utenti esistenti', category: 'users', level: 2 },
      { id: 'users.delete', name: 'Elimina Utenti', description: 'Può eliminare utenti', category: 'users', level: 1 },
      { id: 'users.manage_roles', name: 'Gestisce Ruoli', description: 'Può modificare i ruoli utente', category: 'users', level: 1 },
      
      // Gestione Normative
      { id: 'normatives.view', name: 'Visualizza Normative', description: 'Può vedere le normative', category: 'normatives', level: 4 },
      { id: 'normatives.create', name: 'Crea Normative', description: 'Può creare nuove normative', category: 'normatives', level: 3 },
      { id: 'normatives.edit', name: 'Modifica Normative', description: 'Può modificare normative', category: 'normatives', level: 2 },
      { id: 'normatives.delete', name: 'Elimina Normative', description: 'Può eliminare normative', category: 'normatives', level: 2 },
      { id: 'normatives.publish', name: 'Pubblica Normative', description: 'Può pubblicare normative', category: 'normatives', level: 2 },
      
      // Sistema
      { id: 'system.settings', name: 'Impostazioni Sistema', description: 'Accesso alle impostazioni', category: 'system', level: 1 },
      { id: 'system.permissions', name: 'Gestione Permessi', description: 'Può modificare i permessi', category: 'system', level: 1 },
      { id: 'system.logs', name: 'Log Sistema', description: 'Può vedere i log di sistema', category: 'system', level: 2 },
      
      // Report
      { id: 'reports.view', name: 'Visualizza Report', description: 'Può vedere i report', category: 'reports', level: 3 },
      { id: 'reports.export', name: 'Esporta Report', description: 'Può esportare i report', category: 'reports', level: 2 },
      
      // Documents
      { id: 'documents.view', name: 'Visualizza Documenti', description: 'Può vedere i documenti', category: 'documents', level: 4 },
      { id: 'documents.create', name: 'Crea Documenti', description: 'Può creare nuovi documenti', category: 'documents', level: 3 },
      { id: 'documents.edit', name: 'Modifica Documenti', description: 'Può modificare documenti', category: 'documents', level: 2 },
      { id: 'documents.delete', name: 'Elimina Documenti', description: 'Può eliminare documenti', category: 'documents', level: 2 },
      { id: 'documents.upload', name: 'Carica Documenti', description: 'Può caricare nuovi documenti', category: 'documents', level: 3 }
    ];

    for (const perm of permissions) {
      await sql`
        INSERT INTO permissions (permission_id, name, description, category, level)
        VALUES (${perm.id}, ${perm.name}, ${perm.description}, ${perm.category}, ${perm.level})
        ON CONFLICT (permission_id) DO NOTHING
      `;
    }
    
    console.log('🎓 ACCADEMIA: Sistema permessi configurato');
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore configurazione permessi:', error);
  }
}

async function insertDefaultRoleConfiguration() {
  try {
    const roleConfigs = [
      {
        role: 'superadmin',
        permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles', 
                     'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish',
                     'system.settings', 'system.permissions', 'system.logs', 'reports.view', 'reports.export',
                     'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.upload'],
        sections: ['dashboard', 'users', 'normatives', 'education', 'admin', 'superadmin', 'reports', 'settings']
      },
      {
        role: 'admin',
        permissions: ['users.view', 'users.create', 'users.edit', 'normatives.view', 'normatives.create', 
                     'normatives.edit', 'normatives.delete', 'normatives.publish', 'system.logs', 'reports.view', 'reports.export',
                     'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.upload'],
        sections: ['dashboard', 'users', 'normatives', 'education', 'admin', 'reports']
      },
      {
        role: 'operator',
        permissions: ['normatives.view', 'normatives.create', 'reports.view'],
        sections: ['dashboard', 'normatives', 'education', 'reports']
      },
      {
        role: 'user',
        permissions: ['normatives.view', 'documents.view'],
        sections: ['dashboard', 'normatives', 'education']
      },
      {
        role: 'guest',
        permissions: [],
        sections: ['dashboard']
      }
    ];

    // Inserisci permessi per ruoli
    for (const config of roleConfigs) {
      for (const permissionId of config.permissions) {
        await sql`
          INSERT INTO role_permissions (role, permission_id, granted)
          VALUES (${config.role}, ${permissionId}, true)
          ON CONFLICT (role, permission_id) DO NOTHING
        `;
      }
      
      // Inserisci sezioni visibili per ruoli
      for (const section of config.sections) {
        await sql`
          INSERT INTO role_sections (role, section, visible)
          VALUES (${config.role}, ${section}, true)
          ON CONFLICT (role, section) DO NOTHING
        `;
      }
    }
    
    console.log('🎓 ACCADEMIA: Matrice ruoli configurata');
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore configurazione ruoli:', error);
  }
}

export async function getUserPermissions(role: string): Promise<string[]> {
  try {
    const result = await sql`
      SELECT permission_id FROM role_permissions 
      WHERE role = ${role} AND granted = true
    `;
    return result.map(r => r.permission_id);
  } catch (error) {
    console.error('Errore recupero permessi utente:', error);
    return [];
  }
}

export async function getUserSections(role: string): Promise<string[]> {
  try {
    const result = await sql`
      SELECT section FROM role_sections 
      WHERE role = ${role} AND visible = true
    `;
    return result.map(r => r.section);
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore recupero sezioni autorizzate:', error?.message);
    return [];
  }
}

export async function updateRolePermission(role: string, permissionId: string, granted: boolean, grantedBy: string): Promise<boolean> {
  try {
    await sql`
      INSERT INTO role_permissions (role, permission_id, granted, granted_by, updated_at)
      VALUES (${role}, ${permissionId}, ${granted}, ${grantedBy}, NOW())
      ON CONFLICT (role, permission_id) 
      DO UPDATE SET granted = ${granted}, granted_by = ${grantedBy}, updated_at = NOW()
    `;
    return true;
  } catch (error) {
    console.error('Errore aggiornamento permesso ruolo:', error);
    return false;
  }
}

export async function updateRoleSection(role: string, section: string, visible: boolean): Promise<boolean> {
  try {
    await sql`
      INSERT INTO role_sections (role, section, visible)
      VALUES (${role}, ${section}, ${visible})
      ON CONFLICT (role, section) 
      DO UPDATE SET visible = ${visible}
    `;
    return true;
  } catch (error) {
    console.error('Errore aggiornamento sezione ruolo:', error);
    return false;
  }
}

export async function getAllPermissions(): Promise<any[]> {
  try {
    const result = await sql`
      SELECT * FROM permissions ORDER BY category, level, name
    `;
    return result;
  } catch (error) {
    console.error('Errore recupero tutti i permessi:', error);
    return [];
  }
}

// === METODI PER DATABASE TABLES ===
export async function getAllTables(): Promise<DatabaseTable[]> {
  try {
    console.log('🎓 ACCADEMIA: Recupero metadati tabelle database...');
    
    // Query per ottenere tutte le tabelle del database pubblico
    const tablesResult = await sql`
      SELECT 
        t.table_name as name,
        t.table_schema as schema,
        t.table_type as table_type,
        obj_description(c.oid) as comment
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `;

    const tables: DatabaseTable[] = [];

    // Per ogni tabella, ottieni il conteggio record e altre info
    for (const table of tablesResult) {
      try {
        console.log(`🎓 ACCADEMIA: Conteggio record per tabella ${table.name}...`);
        
        // Conteggio record sicuro
        const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
        const recordCount = parseInt(countResult[0]?.count || '0');
        
        console.log(`🎓 ACCADEMIA: Tabella ${table.name} - Query result:`, countResult);
        console.log(`🎓 ACCADEMIA: Tabella ${table.name} - Parsed count:`, recordCount);

        // Dimensione stimata della tabella
        const sizeResult = await sql`
          SELECT pg_size_pretty(pg_total_relation_size(quote_ident(${table.name}))) as size
        `;
        const estimatedSize = sizeResult[0]?.size || 'N/A';

        // Data ultima modifica (approssimativa)
        let lastModified = new Date().toISOString();
        try {
          // Prova a ottenere la data di modifica, ma non bloccare se fallisce
          const modifiedResult = await sql.unsafe(`
            SELECT 
              COALESCE(
                (SELECT MAX(created_at) FROM ${table.name} WHERE created_at IS NOT NULL),
                (SELECT MAX(updated_at) FROM ${table.name} WHERE updated_at IS NOT NULL),
                NOW()
              ) as last_modified
          `);
          lastModified = modifiedResult[0]?.last_modified || new Date().toISOString();
        } catch (dateError) {
          console.warn(`🎓 ACCADEMIA: Impossibile ottenere data modifica per ${table.name}, uso data corrente`);
        }
        const lastModified = modifiedResult[0]?.last_modified || new Date().toISOString();

        tables.push({
          name: table.name,
          schema: table.schema,
          recordCount,
          estimatedSize,
          lastModified: lastModified,
          tableType: table.table_type,
          comment: table.comment
        });

        console.log(`🎓 ACCADEMIA: Tabella ${table.name} - ${recordCount} record, ${estimatedSize}`);
      } catch (tableError) {
        console.error(`🚨 ACCADEMIA: Errore lettura tabella ${table.name}:`, tableError);
        console.error(`🚨 ACCADEMIA: Dettagli errore:`, tableError?.message);
        
        // Aggiungi comunque la tabella con dati di fallback
        tables.push({
          name: table.name,
          schema: table.schema,
          recordCount: 0,
          estimatedSize: 'N/A',
          lastModified: new Date().toISOString(),
          tableType: table.table_type,
          comment: table.comment
        });
      }
    }

    console.log(`🎓 ACCADEMIA: Trovate ${tables.length} tabelle nel database`);
    return tables;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore recupero tabelle database:', error?.message);
    return [];
  }
}

// === METODI PER STRUTTURA TABELLE ===
export async function getTableStructure(tableName: string): Promise<TableStructure | null> {
  try {
    console.log(`🎓 ACCADEMIA: Analisi struttura tabella ${tableName}...`);
    
    // 1. Query per le colonne
    const columnsResult = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default, 
        character_maximum_length,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = ${tableName} AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    if (columnsResult.length === 0) {
      console.log(`🎓 ACCADEMIA: Tabella ${tableName} non trovata`);
      return null;
    }

    // 2. Query per le chiavi primarie
    const primaryKeysResult = await sql`
      SELECT kc.column_name
      FROM information_schema.key_column_usage kc
      JOIN information_schema.table_constraints tc ON kc.constraint_name = tc.constraint_name
      WHERE tc.table_name = ${tableName} AND tc.constraint_type = 'PRIMARY KEY'
    `;
    const primaryKeys = new Set(primaryKeysResult.map(pk => pk.column_name));

    // 3. Query per le chiavi esterne
    const foreignKeysResult = await sql`
      SELECT 
        kc.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.key_column_usage kc
      JOIN information_schema.table_constraints tc ON kc.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = ${tableName} AND tc.constraint_type = 'FOREIGN KEY'
    `;
    const foreignKeysMap = new Map();
    foreignKeysResult.forEach(fk => {
      foreignKeysMap.set(fk.column_name, {
        referencedTable: fk.referenced_table,
        referencedColumn: fk.referenced_column
      });
    });

    // 4. Query per gli indici
    const indexesResult = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = ${tableName} AND schemaname = 'public'
    `;
    const indexes = indexesResult.map(idx => `${idx.indexname}: ${idx.indexdef}`);

    // 5. Conteggio record
    const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
    const recordCount = parseInt(countResult[0]?.count || '0');

    // 6. Costruisci le colonne con tutte le informazioni
    const columns: TableColumn[] = columnsResult.map(col => {
      const isPrimaryKey = primaryKeys.has(col.column_name);
      const foreignKeyInfo = foreignKeysMap.get(col.column_name);
      const isForeignKey = !!foreignKeyInfo;

      return {
        name: col.column_name,
        type: col.data_type.toUpperCase(),
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        isPrimaryKey,
        isForeignKey,
        referencedTable: foreignKeyInfo?.referencedTable,
        referencedColumn: foreignKeyInfo?.referencedColumn,
        maxLength: col.character_maximum_length,
        position: col.ordinal_position
      };
    });

    const structure: TableStructure = {
      tableName,
      schema: 'public',
      columns,
      indexes,
      constraints: [], // Implementabile in futuro se necessario
      recordCount
    };

    console.log(`🎓 ACCADEMIA: Struttura ${tableName} analizzata - ${columns.length} colonne, ${indexes.length} indici`);
    return structure;

  } catch (error) {
    console.error(`🚨 ACCADEMIA: Errore analisi struttura ${tableName}:`, error?.message);
    return null;
  }
}

export async function getRolePermissionsMatrix(): Promise<Map<string, any>> {
  try {
    const roles = ['superadmin', 'admin', 'operator', 'user', 'guest'];
    const matrix = new Map();
    
    for (const role of roles) {
      const permissions = await getUserPermissions(role);
      const sections = await getUserSections(role);
      matrix.set(role, { permissions, sections });
    }
    
    return matrix;
  } catch (error) {
    console.error('Errore recupero matrice permessi:', error);
    return new Map();
  }
}

// === INTERFACCE PER ESPLORAZIONE TABELLE ===
export interface TableRecordsOptions {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface TableRecordsResult {
  records: any[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  hiddenColumns: string[];
}

// === METODI PER ESPLORAZIONE RECORD TABELLE ===
export async function getTableRecords(
  tableName: string, 
  options: TableRecordsOptions = {}
): Promise<TableRecordsResult | null> {
  try {
    console.log(`🎓 ACCADEMIA: Esplorazione tabella ${tableName}...`);
    
    const {
      page = 1,
      limit = 50,
      search = '',
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = options;

    // Sicurezza: Limiti massimi
    const safeLimit = Math.min(limit, 50); // Max 50 record per pagina
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    // 1. Ottieni struttura tabella per identificare colonne
    const tableStructure = await getTableStructure(tableName);
    if (!tableStructure) {
      console.error(`🚨 ACCADEMIA: Tabella ${tableName} non trovata`);
      return null;
    }

    // 2. Filtro colonne sensibili
    const SENSITIVE_COLUMNS = ['password_hash', 'token', 'secret', 'api_key', 'private_key'];
    const safeColumns = tableStructure.columns
      .filter(col => !SENSITIVE_COLUMNS.some(sensitive => 
        col.name.toLowerCase().includes(sensitive.toLowerCase())
      ))
      .map(col => col.name);
    
    const hiddenColumns = tableStructure.columns
      .filter(col => SENSITIVE_COLUMNS.some(sensitive => 
        col.name.toLowerCase().includes(sensitive.toLowerCase())
      ))
      .map(col => col.name);

    if (safeColumns.length === 0) {
      console.error(`🚨 ACCADEMIA: Nessuna colonna sicura in ${tableName}`);
      return null;
    }

    // 3. Costruisci query SELECT sicura
    const selectColumns = safeColumns.join(', ');
    
    // 4. Validazione colonna ordinamento
    const validOrderBy = safeColumns.includes(orderBy) ? orderBy : safeColumns[0];
    const validDirection = ['ASC', 'DESC'].includes(orderDirection) ? orderDirection : 'DESC';

    // 5. Query conteggio totale
    let countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
    let countParams: any[] = [];

    // 6. Query record con filtri
    let recordsQuery = `SELECT ${selectColumns} FROM ${tableName}`;
    let recordsParams: any[] = [];

    // 7. Aggiungi ricerca se presente
    if (search.trim()) {
      // Trova colonne text/varchar per ricerca sicura
      const searchableColumns = tableStructure.columns
        .filter(col => 
          safeColumns.includes(col.name) &&
          (col.type.toLowerCase().includes('text') || 
           col.type.toLowerCase().includes('varchar') ||
           col.type.toLowerCase().includes('char'))
        )
        .map(col => col.name);

      if (searchableColumns.length > 0) {
        const searchConditions = searchableColumns
          .map((col, index) => `${col}::text ILIKE $${index + 1}`)
          .join(' OR ');
        
        const searchValue = `%${search.trim()}%`;
        const searchParams = searchableColumns.map(() => searchValue);
        
        countQuery += ` WHERE (${searchConditions})`;
        recordsQuery += ` WHERE (${searchConditions})`;
        
        countParams = searchParams;
        recordsParams = [...searchParams];
      }
    }

    // 8. Aggiungi ordinamento e paginazione
    recordsQuery += ` ORDER BY ${validOrderBy} ${validDirection}`;
    recordsQuery += ` LIMIT $${recordsParams.length + 1} OFFSET $${recordsParams.length + 2}`;
    recordsParams.push(safeLimit, offset);

    // 9. Esegui query
    console.log(`🎓 ACCADEMIA: Query conteggio: ${countQuery}`);
    console.log(`🎓 ACCADEMIA: Query record: ${recordsQuery}`);
    
    const [countResult, recordsResult] = await Promise.all([
      sql.unsafe(countQuery, countParams),
      sql.unsafe(recordsQuery, recordsParams)
    ]);

    const totalCount = parseInt(countResult[0]?.count || '0');
    const records = recordsResult || [];
    const hasMore = (offset + safeLimit) < totalCount;

    console.log(`🎓 ACCADEMIA: Trovati ${records.length} record di ${totalCount} totali`);
    if (hiddenColumns.length > 0) {
      console.log(`🎓 ACCADEMIA: Colonne nascoste per sicurezza: ${hiddenColumns.join(', ')}`);
    }

    return {
      records,
      totalCount,
      page: safePage,
      limit: safeLimit,
      hasMore,
      hiddenColumns
    };

  } catch (error) {
    console.error(`🚨 ACCADEMIA: Errore esplorazione ${tableName}:`, error?.message);
    return null;
  }
}