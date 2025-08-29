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

    // Crea tabella documents
    console.log('🎓 ACCADEMIA: Configurazione archivio documenti...');
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500),
        file_size INTEGER,
        mime_type VARCHAR(100),
        type VARCHAR(50) NOT NULL CHECK (type IN ('template', 'form', 'guide', 'report', 'manual')),
        category VARCHAR(100) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        version VARCHAR(20) DEFAULT '1.0',
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
        download_count INTEGER DEFAULT 0,
        uploaded_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

    // Inserisci documenti di esempio
    console.log('🎓 ACCADEMIA: Popolamento archivio documenti...');
    adminUser = await sql`SELECT id FROM users WHERE email = 'admin@accademia.it'`;
    if (adminUser.length > 0) {
      await sql`
        INSERT INTO documents (title, description, filename, file_size, mime_type, type, category, tags, uploaded_by, approved_by)
        VALUES 
          (
            'Modulo Richiesta Licenza Taxi',
            'Template per la richiesta di nuova licenza taxi comunale',
            'modulo_licenza_taxi.docx',
            251904,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'template',
            'Licenze',
            ARRAY['taxi', 'licenza', 'modulo'],
            ${adminUser[0].id},
            ${adminUser[0].id}
          ),
          (
            'Guida Compilazione Domanda NCC',
            'Istruzioni dettagliate per la compilazione della domanda di autorizzazione NCC',
            'guida_ncc.pdf',
            1258291,
            'application/pdf',
            'guide',
            'Guide',
            ARRAY['ncc', 'autorizzazione', 'guida'],
            ${adminUser[0].id},
            ${adminUser[0].id}
          ),
          (
            'Report Controlli 2023',
            'Relazione annuale sui controlli effettuati nel settore TPL',
            'report_controlli_2023.pdf',
            3567616,
            'application/pdf',
            'report',
            'Report',
            ARRAY['controlli', 'report', '2023'],
            ${adminUser[0].id},
            ${adminUser[0].id}
          ),
          (
            'Modulo Comunicazione Variazioni',
            'Form per comunicare variazioni ai dati dell''autorizzazione',
            'modulo_variazioni.docx',
            184320,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'form',
            'Modulistica',
            ARRAY['variazioni', 'comunicazione', 'modulo'],
            ${adminUser[0].id},
            ${adminUser[0].id}
          ),
          (
            'Checklist Requisiti Veicoli',
            'Lista di controllo per la verifica dei requisiti tecnici dei veicoli',
            'checklist_veicoli.docx',
            327680,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'template',
            'Controlli',
            ARRAY['veicoli', 'requisiti', 'checklist'],
            ${adminUser[0].id},
            ${adminUser[0].id}
          )
        ON CONFLICT DO NOTHING
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
        // Escludi SuperAdmin, ma se è il SuperAdmin corrente può vedere se stesso
        if (user.role === 'superadmin') {
          return currentUserId === user.id;
        }
        return true;
      });
    }
    
    return result;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore recupero utenti:', error);
    return [];
  }
}

// === METODI PER NORMATIVE ===
export async function getAllNormatives(): Promise<Normative[]> {
  try {
    console.log('🎓 ACCADEMIA: Recupero archivio normativo...');
    
    const result = await sql`
      SELECT id, title, content, category, type, reference_number, 
             publication_date, effective_date, tags, created_at, updated_at
      FROM normatives
      ORDER BY publication_date DESC
    `;
    
    console.log('🎓 ACCADEMIA: Trovate', result.length, 'normative');
    return result;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore recupero normative:', error);
    return [];
  }
}

export async function getNormativeById(id: string): Promise<Normative | null> {
  try {
    console.log('🎓 ACCADEMIA: Recupero normativa ID:', id);
    
    const result = await sql`
      SELECT id, title, content, category, type, reference_number,
             publication_date, effective_date, tags, created_at, updated_at
      FROM normatives
      WHERE id = ${id}
    `;
    
    if (result.length > 0) {
      console.log('🎓 ACCADEMIA: Normativa trovata:', result[0].title);
      return result[0];
    }
    
    console.log('🎓 ACCADEMIA: Normativa non trovata per ID:', id);
    return null;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore recupero normativa:', error);
    return null;
  }
}

export async function createNormative(normative: Omit<Normative, 'id' | 'created_at' | 'updated_at'>): Promise<Normative | null> {
  try {
    console.log('🎓 ACCADEMIA: Creazione nuova normativa:', normative.title);
    
    const result = await sql`
      INSERT INTO normatives (title, content, category, type, reference_number, publication_date, effective_date, tags)
      VALUES (${normative.title}, ${normative.content}, ${normative.category}, ${normative.type}, 
              ${normative.reference_number}, ${normative.publication_date}, ${normative.effective_date}, ${normative.tags})
      RETURNING id, title, content, category, type, reference_number, publication_date, effective_date, tags, created_at, updated_at
    `;
    
    console.log('🎓 ACCADEMIA: Normativa creata con successo');
    return result[0] || null;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore creazione normativa:', error);
    return null;
  }
}

export async function updateNormative(id: string, updates: Partial<Omit<Normative, 'id' | 'created_at'>>): Promise<Normative | null> {
  try {
    console.log('🎓 ACCADEMIA: Aggiornamento normativa ID:', id);
    
    // Costruisci la query di aggiornamento dinamicamente
    const updateFields = Object.entries(updates);
    if (updateFields.length === 0) {
      return await getNormativeById(id);
    }

    // Costruisci la parte SET della query
    const setParts = updateFields.map(([key, value]) => {
      if (key === 'tags' && Array.isArray(value)) {
        return sql`${sql(key)} = ${value}`;
      }
      return sql`${sql(key)} = ${value}`;
    });

    const result = await sql`
      UPDATE normatives 
      SET ${sql.join(setParts, sql`, `)}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, content, category, type, reference_number, 
                publication_date, effective_date, tags, created_at, updated_at
    `;
    
    console.log('🎓 ACCADEMIA: Normativa aggiornata con successo');
    return result[0] || null;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore aggiornamento normativa:', error);
    return null;
  }
}