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

// Inizializza le tabelle se non esistono
export async function initializeTables() {
  try {
    console.log('🏗️ INIT DEBUG: Inizializzazione tabelle...');
    console.log('🏗️ INIT DEBUG: Database URL presente:', !!import.meta.env.VITE_DATABASE_URL);
    
    // Crea tabella users
    console.log('🏗️ INIT DEBUG: Creazione tabella users...');
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
    console.log('🏗️ INIT DEBUG: Creazione tabella normatives...');
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
    console.log('🏗️ INIT DEBUG: Creazione tabella activity_logs...');
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
    console.log('🏗️ INIT DEBUG: Creazione tabella permissions...');
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
    console.log('🏗️ INIT DEBUG: Creazione tabella role_permissions...');
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
    console.log('🏗️ INIT DEBUG: Creazione tabella role_sections...');
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
    console.log('🏗️ INIT DEBUG: Inserimento dati di esempio...');
    await insertSampleData();
    
    // Inserisci permessi e configurazioni di default
    await insertDefaultPermissions();
    await insertDefaultRoleConfiguration();

    console.log('Database Neon inizializzato con successo!');
    return true;
  } catch (error) {
    console.error('Errore inizializzazione Neon:', error);
    console.error('🏗️ INIT DEBUG: Dettagli errore:', error?.message);
    return false;
  }
}

// Inserisci dati di esempio
async function insertSampleData() {
  try {
    console.log('📝 SAMPLE DEBUG: Inserimento dati di esempio...');
    
    // Hash password semplificato per demo
    console.log('📝 SAMPLE DEBUG: Hash password admin...');
    const adminHash = await hashPassword('admin123');
    console.log('📝 SAMPLE DEBUG: Hash password user...');
    const userHash = await hashPassword('user123');
    
    // Hash password per SuperAdmin
    console.log('📝 SAMPLE DEBUG: Hash password superadmin...');
    const superAdminHash = await hashPassword('superadmin2024!');
    
    console.log('📝 SAMPLE DEBUG: Admin hash (primi 10):', adminHash.substring(0, 10));
    console.log('📝 SAMPLE DEBUG: User hash (primi 10):', userHash.substring(0, 10));
    console.log('📝 SAMPLE DEBUG: SuperAdmin hash (primi 10):', superAdminHash.substring(0, 10));

    // Verifica che gli hash siano stati generati correttamente
    console.log('📝 SAMPLE DEBUG: Admin hash completo length:', adminHash.length);
    console.log('📝 SAMPLE DEBUG: User hash completo length:', userHash.length);

    // Inserisci utenti
    console.log('📝 SAMPLE DEBUG: Inserimento utenti...');
    await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES 
        ('superadmin@accademiatpl.org', 'Super Amministratore', ${superAdminHash}, 'superadmin'),
        ('admin@accademia.it', 'Amministratore', ${adminHash}, 'admin'),
        ('user@accademia.it', 'Utente Demo', ${userHash}, 'user')
      ON CONFLICT (email) DO NOTHING
    `;
    console.log('📝 SAMPLE DEBUG: Utenti inseriti con successo');
    
    // Verifica immediata che gli utenti siano stati inseriti
    const verifyUsers = await sql`SELECT id, email, full_name, role FROM users`;
    console.log('📝 SAMPLE DEBUG: Verifica utenti inseriti:', verifyUsers);

    // Inserisci normative
    console.log('📝 SAMPLE DEBUG: Inserimento normative...');
    
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
    console.log('📝 SAMPLE DEBUG: Normative inserite con successo');

    // Inserisci alcuni log di attività di esempio
    console.log('📝 SAMPLE DEBUG: Inserimento activity logs...');
    const adminUser = await sql`SELECT id FROM users WHERE email = 'admin@accademia.it'`;
    if (adminUser.length > 0) {
      await sql`
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
        VALUES 
          (${adminUser[0].id}, 'CREATE', 'normative', gen_random_uuid(), '{"title": "Decreto Legislativo 285/1992"}'),
          (${adminUser[0].id}, 'LOGIN', 'user', ${adminUser[0].id}, '{"ip": "127.0.0.1"}'),
          (${adminUser[0].id}, 'VIEW', 'normative', gen_random_uuid(), '{"title": "Legge Regionale 15/2018"}')
      `;
      console.log('📝 SAMPLE DEBUG: Activity logs inseriti con successo');
    }

    console.log('Dati di esempio inseriti con successo!');
  } catch (error) {
    console.error('Errore inserimento dati:', error);
    console.error('📝 SAMPLE DEBUG: Dettagli errore inserimento:', error?.message);
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
  console.log('🔒 PASSWORD DEBUG: Verifica password in corso...');
  console.log('🔒 PASSWORD DEBUG: Password length:', password.length);
  console.log('🔒 PASSWORD DEBUG: Hash length:', hash.length);
  
  const passwordHash = await hashPassword(password);
  console.log('🔒 PASSWORD DEBUG: Hash calcolato:', passwordHash.substring(0, 10) + '...');
  console.log('🔒 PASSWORD DEBUG: Hash database:', hash.substring(0, 10) + '...');
  
  return passwordHash === hash;
}

// === METODI PER UTENTI ===
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log('🗄️ DB DEBUG: getUserByEmail chiamato per:', email);
    console.log('🗄️ DB DEBUG: Email type:', typeof email);
    console.log('🗄️ DB DEBUG: Email length:', email.length);
    console.log('🗄️ DB DEBUG: Email trimmed:', email.trim());
    
    console.log('🗄️ DB DEBUG: Esecuzione query SQL...');
    console.log('🗄️ DB DEBUG: Query: SELECT * FROM users WHERE email = ', email);
    
    // Prima proviamo a vedere tutti gli utenti
    console.log('🗄️ DB DEBUG: Controllo tutti gli utenti...');
    const allUsers = await sql`SELECT email, full_name FROM users`;
    console.log('🗄️ DB DEBUG: Tutti gli utenti nel DB:', allUsers);
    
    // Poi la query specifica
    const result = await sql`
      SELECT id, email, full_name, password_hash, role, created_at
      FROM users
      WHERE email = ${email}
    `;
    
    console.log('🗄️ DB DEBUG: Query risultato:', result.length > 0 ? 'TROVATO' : 'NON TROVATO');
    console.log('🗄️ DB DEBUG: Numero righe:', result.length);
    
    // Proviamo anche una query case-insensitive
    console.log('🗄️ DB DEBUG: Provo query case-insensitive...');
    const resultCaseInsensitive = await sql`
      SELECT id, email, full_name, password_hash, role, created_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
    `;
    console.log('🗄️ DB DEBUG: Risultato case-insensitive:', resultCaseInsensitive.length);
    
    if (result.length > 0) {
      console.log('🗄️ DB DEBUG: Utente:', { 
        id: result[0].id, 
        email: result[0].email, 
        full_name: result[0].full_name,
        role: result[0].role 
      });
      return result[0];
    } else if (resultCaseInsensitive.length > 0) {
      console.log('🗄️ DB DEBUG: Trovato con case-insensitive:', resultCaseInsensitive[0]);
      return resultCaseInsensitive[0];
    }
    
    return null;
  } catch (error) {
    console.error('🗄️ DB DEBUG: Errore recupero utente per email:', error);
    console.error('🗄️ DB DEBUG: Tipo errore:', typeof error);
    console.error('🗄️ DB DEBUG: Messaggio errore:', error?.message);
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

export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await sql`
      SELECT id, email, full_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
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
    console.error('Errore conteggio utenti:', error);
    return 0;
  }
}

export async function updateUser(id: string, data: { email?: string; full_name?: string; role?: 'user' | 'admin' | 'superadmin' | 'operator' }): Promise<User | null> {
  try {
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
    console.error('Errore aggiornamento utente:', error);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM users 
      WHERE id = ${id}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Errore cancellazione utente:', error);
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
      WHERE created_at >= NOW() - INTERVAL '${days} days'
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
      { id: 'reports.export', name: 'Esporta Report', description: 'Può esportare i report', category: 'reports', level: 2 }
    ];

    for (const perm of permissions) {
      await sql`
        INSERT INTO permissions (permission_id, name, description, category, level)
        VALUES (${perm.id}, ${perm.name}, ${perm.description}, ${perm.category}, ${perm.level})
        ON CONFLICT (permission_id) DO NOTHING
      `;
    }
    
    console.log('📝 PERMISSIONS DEBUG: Permessi di default inseriti');
  } catch (error) {
    console.error('Errore inserimento permessi:', error);
  }
}

async function insertDefaultRoleConfiguration() {
  try {
    const roleConfigs = [
      {
        role: 'superadmin',
        permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles', 
                     'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish',
                     'system.settings', 'system.permissions', 'system.logs', 'reports.view', 'reports.export'],
        sections: ['dashboard', 'users', 'normatives', 'education', 'admin', 'superadmin', 'reports', 'settings']
      },
      {
        role: 'admin',
        permissions: ['users.view', 'users.create', 'users.edit', 'normatives.view', 'normatives.create', 
                     'normatives.edit', 'normatives.delete', 'normatives.publish', 'system.logs', 'reports.view', 'reports.export'],
        sections: ['dashboard', 'users', 'normatives', 'education', 'admin', 'reports']
      },
      {
        role: 'operator',
        permissions: ['normatives.view', 'normatives.create', 'reports.view'],
        sections: ['dashboard', 'normatives', 'education', 'reports']
      },
      {
        role: 'user',
        permissions: ['normatives.view'],
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
    
    console.log('📝 ROLES DEBUG: Configurazione ruoli inserita');
  } catch (error) {
    console.error('Errore inserimento configurazione ruoli:', error);
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
    console.error('Errore recupero sezioni utente:', error);
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