import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL!);

// Export sql per uso in altri moduli
export { sql };

// BACKUP CREATO: neonDatabase.ts.backup prima delle modifiche per sistema corsi professionali

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
  filename?: string;
  file_path?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor?: string;
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

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'failed';
  enrolled_at: string;
  completed_at?: string;
  score?: number;
  payment_status: 'free' | 'paid' | 'pending';
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
        filename VARCHAR(255),
        file_path VARCHAR(500),
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
    console.log('🎓 ACCADEMIA: Configurazione sistema documenti...');
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500),
        file_size BIGINT,
        mime_type VARCHAR(100),
        type VARCHAR(20) NOT NULL CHECK (type IN ('template', 'form', 'guide', 'report')),
        category VARCHAR(100) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        version VARCHAR(20) DEFAULT '1.0',
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
        uploaded_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella courses
    console.log('🎓 ACCADEMIA: Configurazione sistema formazione...');
    await sql`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration VARCHAR(50) NOT NULL,
        level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
        instructor VARCHAR(255),
        category VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
        modules_count INTEGER DEFAULT 0,
        enrollment_count INTEGER DEFAULT 0,
        rating DECIMAL(2,1) DEFAULT 0.0,
        tags TEXT[] DEFAULT '{}',
        file_path VARCHAR(500),
        thumbnail_path VARCHAR(500),
        price DECIMAL(10,2) DEFAULT 0.00,
        is_free BOOLEAN DEFAULT true,
        certificate_template TEXT,
        passing_score INTEGER DEFAULT 70,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crea tabella course_enrollments
    console.log('🎓 ACCADEMIA: Configurazione iscrizioni corsi...');
    await sql`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'cancelled', 'failed')),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        completed_at TIMESTAMP,
        UNIQUE(user_id, course_id)
      )
    `;

    // Crea tabella course_modules
    console.log('🎓 ACCADEMIA: Configurazione moduli corso...');
    await sql`
      CREATE TABLE IF NOT EXISTS course_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL CHECK (type IN ('lesson', 'video', 'document', 'quiz', 'assignment')),
        content TEXT,
        video_url VARCHAR(500),
        document_url VARCHAR(500),
        order_num INTEGER NOT NULL,
        duration_minutes INTEGER,
        is_required BOOLEAN DEFAULT true,
        level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Crea tabelle quiz
    console.log('🎓 ACCADEMIA: Configurazione sistema quiz...');
    await createQuizTables();

    // Inserisci configurazione ruoli di default se non esiste
    // Inserisci dati di esempio
    console.log('🎓 ACCADEMIA: Popolamento archivio con dati iniziali...');
    await insertSampleData(); // RIABILITATO: Serve per creare utenti amministrativi
    
    // Inserisci permessi e configurazioni di default
    await insertDefaultPermissions();
    await insertDefaultRoleConfiguration();
    
    // Migrazione: Aggiungi colonne mancanti a courses se non esistono
    console.log('🎓 ACCADEMIA: Verifica migrazione courses...');
    try {
      await sql`
        ALTER TABLE courses 
        ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS certificate_template TEXT,
        ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70
      `;
      console.log('🎓 ACCADEMIA: Migrazione courses completata.');
    } catch (migrationError) {
      console.log('🎓 ACCADEMIA: Colonne courses già esistenti o errore migrazione:', migrationError);
    }

    // Popola corsi reali dal frontend
    await insertRealCourses();

    // Migrazione: Aggiungi colonne filename e file_path a normatives se non esistono
    console.log('🎓 ACCADEMIA: Verifica migrazione normatives...');
    try {
      await sql`
        ALTER TABLE normatives 
        ADD COLUMN IF NOT EXISTS filename VARCHAR(255),
        ADD COLUMN IF NOT EXISTS file_path VARCHAR(500)
      `;
      console.log('🎓 ACCADEMIA: Migrazione normatives completata.');
    } catch (migrationError) {
      console.log('🎓 ACCADEMIA: Colonne già esistenti o errore migrazione:', migrationError);
    }

    console.log('🎓 ACCADEMIA: Inizializzazione completata con successo!');
    return true;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore critico durante l\'inizializzazione:', error);
    console.error('🚨 ACCADEMIA: Dettagli tecnici:', error instanceof Error ? error.message : String(error));
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

    // NORMATIVE DI ESEMPIO DISATTIVATE
    // Non inserire più dati fittizi che creano confusione
    console.log('🎓 ACCADEMIA: Archivio normativo pronto (senza dati di esempio)');

    // Inserisci alcuni log di attività di esempio
    console.log('🎓 ACCADEMIA: Inizializzazione registro attività...');
    const adminUser = await sql`SELECT id FROM users WHERE email = 'admin@accademia.it'`;
    if (adminUser.length > 0) {
      await sql`
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
        VALUES 
          (${adminUser[0].id}, 'CREATE', 'normative', gen_random_uuid(), '{"title": "Sistema Inizializzato"}'),
          (${adminUser[0].id}, 'LOGIN', 'user', ${adminUser[0].id}, '{"ip": "127.0.0.1"}')
      `;
    }

    console.log('🎓 ACCADEMIA: Archivio popolato con successo!');
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore durante il popolamento archivio:', error);
    console.error('🚨 ACCADEMIA: Dettagli tecnici:', error instanceof Error ? error.message : String(error));
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
      return result[0] as User;
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
    return result[0] as Normative;
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
    return result[0] as Normative;
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
    return result[0] as Normative;
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
    return result[0] as Normative;
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

// === METODI CRUD PER NORMATIVE ===
export async function createNormative(data: {
  title: string;
  content: string;
  category: string;
  type: 'law' | 'regulation' | 'ruling';
  reference_number: string;
  publication_date: string;
  effective_date: string;
  filename?: string;
  file_path?: string;
  tags?: string[];
}): Promise<Normative | null> {
  try {
    console.log('🎓 ACCADEMIA: Creazione nuova normativa...');
    
    const result = await sql`
      INSERT INTO normatives (
        title, content, category, type, reference_number, 
        publication_date, effective_date, filename, file_path, tags, updated_at
      )
      VALUES (
        ${data.title}, ${data.content}, ${data.category}, ${data.type}, 
        ${data.reference_number}, ${data.publication_date}, ${data.effective_date}, 
        ${data.filename || null}, ${data.file_path || null}, ${data.tags || []}, NOW()
      )
      RETURNING *
    `;
    
    console.log('🎓 ACCADEMIA: Normativa creata con successo:', result[0]?.title);
    return result[0] as Normative;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore creazione normativa:', error?.message);
    throw error;
  }
}

export async function updateNormative(id: string, data: {
  title?: string;
  content?: string;
  category?: string;
  type?: 'law' | 'regulation' | 'ruling';
  reference_number?: string;
  publication_date?: string;
  effective_date?: string;
  filename?: string;
  file_path?: string;
  tags?: string[];
}): Promise<Normative | null> {
  try {
    console.log('🎓 ACCADEMIA: updateNormative chiamata con:', { id, data });

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(data.type);
    }
    if (data.reference_number !== undefined) {
      updates.push(`reference_number = $${paramIndex++}`);
      values.push(data.reference_number);
    }
    if (data.publication_date !== undefined) {
      updates.push(`publication_date = $${paramIndex++}`);
      values.push(data.publication_date);
    }
    if (data.effective_date !== undefined) {
      updates.push(`effective_date = $${paramIndex++}`);
      values.push(data.effective_date);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(data.tags);
    }

    if (updates.length === 0) {
      console.log('🎓 ACCADEMIA: Nessun campo da aggiornare');
      return null;
    }

    // Aggiungi sempre updated_at
    updates.push(`updated_at = NOW()`);

    console.log('🎓 ACCADEMIA: Query SQL:', updates.join(', '));
    console.log('🎓 ACCADEMIA: Valori:', values);

    // Usa il metodo template literal invece di sql.unsafe per compatibilità
    const result = await sql`
      UPDATE normatives
      SET title = ${data.title}, content = ${data.content}, category = ${data.category},
          type = ${data.type}, reference_number = ${data.reference_number},
          publication_date = ${data.publication_date}, effective_date = ${data.effective_date},
          filename = ${data.filename || null}, file_path = ${data.file_path || null},
          tags = ${data.tags}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    console.log('🎓 ACCADEMIA: Risultato query:', result);
    console.log('🎓 ACCADEMIA: Tipo del risultato:', typeof result);
    console.log('🎓 ACCADEMIA: È un array?', Array.isArray(result));
    console.log('🎓 ACCADEMIA: Lunghezza risultato:', result?.length);

    if (result && result.length > 0) {
      console.log('🎓 ACCADEMIA: Normativa aggiornata:', result[0]?.title);
      return result[0] as Normative;
    } else {
      console.log('🎓 ACCADEMIA: Nessuna normativa aggiornata');
      return null;
    }
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore aggiornamento normativa:', error?.message);
    console.error('🚨 ACCADEMIA: Dettagli errore:', error);
    throw error;
  }
}

export async function deleteNormative(id: string): Promise<boolean> {
  try {
    console.log('🎓 ACCADEMIA: Eliminazione normativa:', id);
    
    const result = await sql`
      DELETE FROM normatives 
      WHERE id = ${id}
      RETURNING id, title
    `;
    
    if (result.length > 0) {
      console.log('🎓 ACCADEMIA: Normativa eliminata:', result[0].title);
      return true;
    } else {
      console.log('🎓 ACCADEMIA: Normativa non trovata per eliminazione');
      return false;
    }
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore eliminazione normativa:', error?.message);
    throw error;
  }
}

// === METODI PER DOCUMENTI ===
export async function getAllDocuments(): Promise<Document[]> {
  try {
    const result = await sql`
      SELECT * FROM documents
      ORDER BY created_at DESC
    `;
    return result;
  } catch (error) {
    console.error('Errore recupero documenti:', error);
    return [];
  }
}

export async function getDocumentById(id: string): Promise<Document | null> {
  try {
    const result = await sql`
      SELECT * FROM documents
      WHERE id = ${id}
    `;
    return result[0] as Document;
  } catch (error) {
    console.error('Errore recupero documento per ID:', error);
    return null;
  }
}

export async function getDocumentsCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM documents`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore conteggio documenti:', error);
    return 0;
  }
}

export async function getRecentDocumentsCount(days: number = 30): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM documents
      WHERE created_at >= NOW() - INTERVAL '1 day' * ${days}
    `;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore conteggio documenti recenti:', error);
    return 0;
  }
}

// === METODI CRUD PER DOCUMENTI ===
export async function createDocument(data: {
  title: string;
  description?: string;
  filename: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  type: 'template' | 'form' | 'guide' | 'report';
  category: string;
  tags?: string[];
  version?: string;
  status?: 'active' | 'pending' | 'rejected';
  uploaded_by?: string;
}): Promise<Document | null> {
  try {
    console.log('🎓 ACCADEMIA: Creazione nuovo documento...');

    const result = await sql`
      INSERT INTO documents (
        title, description, filename, file_path, file_size, mime_type,
        type, category, tags, version, status, uploaded_by, updated_at
      )
      VALUES (
        ${data.title}, ${data.description}, ${data.filename}, ${data.file_path},
        ${data.file_size}, ${data.mime_type}, ${data.type}, ${data.category},
        ${data.tags || []}, ${data.version || '1.0'}, ${data.status || 'active'},
        ${data.uploaded_by}, NOW()
      )
      RETURNING *
    `;

    console.log('🎓 ACCADEMIA: Documento creato con successo:', result[0]?.title);
    return result[0] as Document;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore creazione documento:', error?.message);
    throw error;
  }
}

export async function updateDocument(id: string, data: {
  title?: string;
  description?: string;
  filename?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  type?: 'template' | 'form' | 'guide' | 'report';
  category?: string;
  tags?: string[];
  version?: string;
  status?: 'active' | 'pending' | 'rejected';
  approved_by?: string;
}): Promise<Document | null> {
  try {
    console.log('🎓 ACCADEMIA: updateDocument chiamata con:', { id, data });

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.filename !== undefined) {
      updates.push(`filename = $${paramIndex++}`);
      values.push(data.filename);
    }
    if (data.file_path !== undefined) {
      updates.push(`file_path = $${paramIndex++}`);
      values.push(data.file_path);
    }
    if (data.file_size !== undefined) {
      updates.push(`file_size = $${paramIndex++}`);
      values.push(data.file_size);
    }
    if (data.mime_type !== undefined) {
      updates.push(`mime_type = $${paramIndex++}`);
      values.push(data.mime_type);
    }
    if (data.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(data.type);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(data.tags);
    }
    if (data.version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      values.push(data.version);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.approved_by !== undefined) {
      updates.push(`approved_by = $${paramIndex++}`);
      values.push(data.approved_by);
    }

    if (updates.length === 0) {
      console.log('🎓 ACCADEMIA: Nessun campo da aggiornare');
      return null;
    }

    // Aggiungi sempre updated_at
    updates.push(`updated_at = NOW()`);

    console.log('🎓 ACCADEMIA: Query SQL:', updates.join(', '));
    console.log('🎓 ACCADEMIA: Valori:', values);

    // Usa il metodo template literal invece di sql.unsafe per compatibilità
    const result = await sql`
      UPDATE documents
      SET title = ${data.title}, description = ${data.description}, filename = ${data.filename},
          file_path = ${data.file_path}, file_size = ${data.file_size}, mime_type = ${data.mime_type},
          type = ${data.type}, category = ${data.category}, tags = ${data.tags},
          version = ${data.version}, status = ${data.status}, approved_by = ${data.approved_by},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    console.log('🎓 ACCADEMIA: Risultato query:', result);
    console.log('🎓 ACCADEMIA: Tipo del risultato:', typeof result);
    console.log('🎓 ACCADEMIA: È un array?', Array.isArray(result));
    console.log('🎓 ACCADEMIA: Lunghezza risultato:', result?.length);

    if (result && result.length > 0) {
      console.log('🎓 ACCADEMIA: Documento aggiornato:', result[0]?.title);
      return result[0] as Document;
    } else {
      console.log('🎓 ACCADEMIA: Nessun documento aggiornato');
      return null;
    }
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore aggiornamento documento:', error?.message);
    console.error('🚨 ACCADEMIA: Dettagli errore:', error);
    throw error;
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    console.log('🎓 ACCADEMIA: Eliminazione documento:', id);

    const result = await sql`
      DELETE FROM documents
      WHERE id = ${id}
      RETURNING id, title
    `;

    if (result.length > 0) {
      console.log('🎓 ACCADEMIA: Documento eliminato:', result[0].title);
      return true;
    } else {
      console.log('🎓 ACCADEMIA: Documento non trovato per eliminazione');
      return false;
    }
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore eliminazione documento:', error?.message);
    throw error;
  }
}

export async function incrementDocumentDownloads(id: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE documents
      SET download_count = download_count + 1
      WHERE id = ${id}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Errore incremento download documento:', error);
    return false;
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
      { id: 'documents.upload', name: 'Carica Documenti', description: 'Può caricare nuovi documenti', category: 'documents', level: 3 },
      
      // Courses/Formazione
      { id: 'courses.view', name: 'Visualizza Corsi', description: 'Può vedere i corsi di formazione', category: 'courses', level: 4 },
      { id: 'courses.create', name: 'Crea Corsi', description: 'Può creare nuovi corsi', category: 'courses', level: 2 },
      { id: 'courses.edit', name: 'Modifica Corsi', description: 'Può modificare corsi esistenti', category: 'courses', level: 2 },
      { id: 'courses.delete', name: 'Elimina Corsi', description: 'Può eliminare corsi', category: 'courses', level: 1 },
      { id: 'courses.publish', name: 'Pubblica Corsi', description: 'Può pubblicare corsi', category: 'courses', level: 2 },
      { id: 'courses.enroll', name: 'Iscrizione Corsi', description: 'Può iscriversi ai corsi', category: 'courses', level: 3 }
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

export async function insertDefaultRoleConfiguration() {
  try {
    const roleConfigs = [
      // Super Admin - tutti i permessi
      { 
        role: 'superadmin', 
        permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles', 'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish', 'admin.access', 'admin.settings', 'admin.logs', 'dev.tools', 'dev.database', 'reports.view', 'reports.export', 'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.upload', 'courses.view', 'courses.create', 'courses.edit', 'courses.delete', 'courses.publish', 'courses.enroll'],
        sections: ['users', 'normatives', 'admin', 'documents', 'courses']
      },
      
      // Admin - gestione completa tranne dev tools avanzati
      { 
        role: 'admin', 
        permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles', 'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish', 'admin.access', 'admin.settings', 'admin.logs', 'reports.view', 'reports.export', 'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.upload', 'courses.view', 'courses.create', 'courses.edit', 'courses.delete', 'courses.publish', 'courses.enroll'],
        sections: ['users', 'normatives', 'admin', 'documents', 'courses']
      },
      
      // Operator - gestione normative e lettura utenti
      { 
        role: 'operator', 
        permissions: ['users.view', 'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish', 'admin.access', 'courses.view', 'courses.enroll'],
        sections: ['normatives', 'admin', 'courses']
      },
      
      // User - solo lettura normative e gestione profilo
      { 
        role: 'user', 
        permissions: ['normatives.view', 'documents.view', 'courses.view', 'courses.enroll'],
        sections: ['normatives', 'documents', 'courses']
      },
      
      // Guest - solo lettura limitata
      { 
        role: 'guest', 
        permissions: ['normatives.view', 'courses.view'],
        sections: ['normatives', 'courses']
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
    // PROTEZIONE CRITICA: Il SuperAdmin non può disabilitare la propria sezione superadmin
    if (role === 'superadmin' && section === 'superadmin' && !visible) {
      console.warn('🚨 ACCADEMIA: Tentativo bloccato - SuperAdmin non può disabilitare la propria sezione');
      return false;
    }

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
        
        // Conteggio record sicuro - CORRETTO per QueryResult
        const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
        
        // Estrai il dato correttamente dal QueryResult
        let countData: any[] = [];
        if (Array.isArray(countResult)) {
          countData = countResult;
        } else if (countResult && typeof countResult === 'object') {
          if ('rows' in countResult) {
            countData = countResult.rows;
          } else if ('result' in countResult && Array.isArray(countResult.result)) {
            countData = countResult.result;
          } else {
            countData = Object.values(countResult).filter(Array.isArray)[0] || [];
          }
        }
        
        const recordCount = parseInt(countData[0]?.count || '0');
        
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
    console.error('Errore caricamento matrice permessi:', error);
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

    // Estrai i dati correttamente dal QueryResult
    console.log(`🎓 ACCADEMIA: === DEBUG DETTAGLIATO ===`);
    console.log(`🎓 ACCADEMIA: countResult raw:`, countResult);
    console.log(`🎓 ACCADEMIA: recordsResult raw:`, recordsResult);
    console.log(`🎓 ACCADEMIA: Tipo countResult:`, typeof countResult, Array.isArray(countResult));
    console.log(`🎓 ACCADEMIA: Tipo recordsResult:`, typeof recordsResult, Array.isArray(recordsResult));
    
    // Prova diverse modalità di estrazione
    let countData: any[] = [];
    let recordsData: any[] = [];
    
    if (Array.isArray(countResult)) {
      countData = countResult;
      console.log(`🎓 ACCADEMIA: countResult è array diretto`);
    } else if (countResult && typeof countResult === 'object') {
      if ('rows' in countResult) {
        countData = countResult.rows;
        console.log(`🎓 ACCADEMIA: Estratto da countResult.rows`);
      } else if ('result' in countResult && Array.isArray(countResult.result)) {
        countData = countResult.result;
        console.log(`🎓 ACCADEMIA: Estratto da countResult.result`);
      } else {
        // Prova a iterare sull'oggetto
        countData = Object.values(countResult).filter(Array.isArray)[0] || [];
        console.log(`🎓 ACCADEMIA: Estratto da Object.values`);
      }
    }
    
    if (Array.isArray(recordsResult)) {
      recordsData = recordsResult;
      console.log(`🎓 ACCADEMIA: recordsResult è array diretto`);
    } else if (recordsResult && typeof recordsResult === 'object') {
      if ('rows' in recordsResult) {
        recordsData = recordsResult.rows;
        console.log(`🎓 ACCADEMIA: Estratto da recordsResult.rows`);
      } else if ('result' in recordsResult && Array.isArray(recordsResult.result)) {
        recordsData = recordsResult.result;
        console.log(`🎓 ACCADEMIA: Estratto da recordsResult.result`);
      } else {
        // Prova a iterare sull'oggetto
        recordsData = Object.values(recordsResult).filter(Array.isArray)[0] || [];
        console.log(`🎓 ACCADEMIA: Estratto da Object.values`);
      }
    }

    console.log(`🎓 ACCADEMIA: countData:`, countData);
    console.log(`🎓 ACCADEMIA: recordsData:`, recordsData);

    const totalCount = parseInt(countData[0]?.count || '0');
    const records = recordsData;
    const hasMore = (safePage * safeLimit) < totalCount;

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

// === METODI PER CORSI DI FORMAZIONE ===
export async function getAllCourses(): Promise<Course[]> {
  try {
    const result = await sql`
      SELECT * FROM courses
      ORDER BY created_at DESC
    `;
    return result as Course[];
  } catch (error) {
    console.error('Errore recupero corsi:', error);
    return [];
  }
}

export async function getCourseById(id: string): Promise<Course | null> {
  try {
    const result = await sql`
      SELECT * FROM courses
      WHERE id = ${id}
    `;
    return result[0] as Course;
  } catch (error) {
    console.error('Errore recupero corso per ID:', error);
    return null;
  }
}

export async function getCoursesCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM courses`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore conteggio corsi:', error);
    return 0;
  }
}

export async function createCourse(data: {
  title: string;
  description?: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor?: string;
  category: string;
  status?: 'active' | 'draft' | 'archived';
  modules_count?: number;
  enrollment_count?: number;
  rating?: number;
  tags?: string[];
  file_path?: string;
  thumbnail_path?: string;
  price?: number;
  is_free?: boolean;
  certificate_template?: string;
  passing_score?: number;
}): Promise<Course | null> {
  try {
    console.log('🎓 ACCADEMIA: Creazione nuovo corso...');
    
    const result = await sql`
      INSERT INTO courses (
        title, description, duration, level, instructor, category, 
        status, modules_count, enrollment_count, rating, tags, 
        file_path, thumbnail_path, price, is_free, certificate_template, 
        passing_score, updated_at
      )
      VALUES (
        ${data.title}, ${data.description}, ${data.duration}, ${data.level}, 
        ${data.instructor}, ${data.category}, ${data.status || 'active'}, 
        ${data.modules_count || 0}, ${data.enrollment_count || 0}, 
        ${data.rating || 0.0}, ${data.tags || []}, ${data.file_path}, 
        ${data.thumbnail_path}, ${data.price || 0.00}, ${data.is_free ?? true}, 
        ${data.certificate_template}, ${data.passing_score || 70}, NOW()
      )
      RETURNING *
    `;
    
    console.log('🎓 ACCADEMIA: Corso creato con successo:', result[0]?.title);
    return result[0] as Course;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore creazione corso:', error);
    throw error;
  }
}

export async function updateCourse(id: string, data: {
  title?: string;
  description?: string;
  duration?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  instructor?: string;
  category?: string;
  status?: 'active' | 'draft' | 'archived';
  modules_count?: number;
  enrollment_count?: number;
  rating?: number;
  tags?: string[];
  file_path?: string;
  thumbnail_path?: string;
  price?: number;
  is_free?: boolean;
  certificate_template?: string;
  passing_score?: number;
}): Promise<Course | null> {
  try {
    console.log('🎓 ACCADEMIA: Aggiornamento corso:', id);
    
    const result = await sql`
      UPDATE courses
      SET title = ${data.title}, description = ${data.description}, 
          duration = ${data.duration}, level = ${data.level}, 
          instructor = ${data.instructor}, category = ${data.category},
          status = ${data.status}, modules_count = ${data.modules_count},
          enrollment_count = ${data.enrollment_count}, rating = ${data.rating},
          tags = ${data.tags}, file_path = ${data.file_path},
          thumbnail_path = ${data.thumbnail_path}, price = ${data.price},
          is_free = ${data.is_free}, certificate_template = ${data.certificate_template},
          passing_score = ${data.passing_score},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result && result.length > 0) {
      console.log('🎓 ACCADEMIA: Corso aggiornato:', result[0]?.title);
      return result[0] as Course;
    } else {
      console.log('🎓 ACCADEMIA: Nessun corso aggiornato');
      return null;
    }
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore aggiornamento corso:', error);
    throw error;
  }
}

export async function deleteCourse(id: string): Promise<boolean> {
  try {
    console.log('🎓 ACCADEMIA: Eliminazione corso:', id);
    
    const result = await sql`
      DELETE FROM courses 
      WHERE id = ${id}
      RETURNING id, title
    `;
    
    if (result.length > 0) {
      console.log('🎓 ACCADEMIA: Corso eliminato:', result[0].title);
      return true;
    } else {
      console.log('🎓 ACCADEMIA: Corso non trovato per eliminazione');
      return false;
    }
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore eliminazione corso:', error);
    throw error;
  }
}

// === METODI CRUD PER ENROLLMENTS ===
export async function createEnrollment(data: {
  user_id: string;
  course_id: string;
  payment_status?: 'free' | 'paid' | 'pending';
}): Promise<Enrollment | null> {
  try {
    console.log('🎓 ACCADEMIA: Creazione nuova iscrizione...');
    
    const result = await sql`
      INSERT INTO enrollments (user_id, course_id, payment_status)
      VALUES (${data.user_id}, ${data.course_id}, ${data.payment_status || 'free'})
      RETURNING *
    `;
    
    console.log('🎓 ACCADEMIA: Iscrizione creata con successo');
    return result[0] as Enrollment;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore creazione iscrizione:', error);
    throw error;
  }
}

export async function getUserEnrollments(userId: string): Promise<Enrollment[]> {
  try {
    const result = await sql`
      SELECT e.*, c.title as course_title, c.description as course_description,
             c.duration, c.level, c.rating, c.price, c.is_free
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${userId}
      ORDER BY e.enrolled_at DESC
    `;
    return result as Enrollment[];
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore recupero iscrizioni utente:', error);
    return [];
  }
}

export async function getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
  try {
    const result = await sql`
      SELECT e.*, u.full_name as user_name, u.email as user_email
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = ${courseId}
      ORDER BY e.enrolled_at DESC
    `;
    return result as Enrollment[];
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore recupero iscrizioni corso:', error);
    return [];
  }
}

export async function updateEnrollmentStatus(id: string, data: {
  status?: 'enrolled' | 'in_progress' | 'completed' | 'failed';
  score?: number;
  completed_at?: string;
}): Promise<Enrollment | null> {
  try {
    console.log('🎓 ACCADEMIA: Aggiornamento stato iscrizione:', id);
    
    const result = await sql`
      UPDATE enrollments
      SET status = ${data.status}, score = ${data.score}, 
          completed_at = ${data.completed_at}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result && result.length > 0) {
      console.log('🎓 ACCADEMIA: Iscrizione aggiornata');
      return result[0] as Enrollment;
    }
    return null;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore aggiornamento iscrizione:', error);
    throw error;
  }
}

export async function deleteEnrollment(id: string): Promise<boolean> {
  try {
    console.log('🎓 ACCADEMIA: Eliminazione iscrizione:', id);
    
    const result = await sql`
      DELETE FROM enrollments 
      WHERE id = ${id}
      RETURNING id
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore eliminazione iscrizione:', error);
    throw error;
  }
}

export async function checkUserEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  try {
    const result = await sql`
      SELECT * FROM enrollments
      WHERE user_id = ${userId} AND course_id = ${courseId}
    `;
    return result[0] as Enrollment || null;
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore verifica iscrizione:', error);
    return null;
  }
}

// Popola corsi reali dal frontend Education.tsx
async function insertRealCourses() {
  try {
    console.log('🎓 ACCADEMIA: Popolamento corsi reali...');
    
    // Verifica se esistono già corsi
    const existingCourses = await sql`SELECT COUNT(*) as count FROM courses`;
    if (parseInt(existingCourses[0].count) > 0) {
      console.log('🎓 ACCADEMIA: Corsi già presenti, skip popolamento');
      return;
    }

    const realCourses = [
      {
        title: 'Normative di Base del Trasporto Locale',
        description: 'Introduzione alle principali normative che regolano il trasporto pubblico locale non di linea',
        duration: '2 ore',
        level: 'beginner',
        category: 'Normative',
        instructor: 'Dott. Marco Rossi',
        modules_count: 6,
        rating: 4.8,
        price: 0.00,
        is_free: true,
        passing_score: 70,
        tags: ['normative', 'base', 'trasporto', 'locale']
      },
      {
        title: 'Licenze e Autorizzazioni',
        description: 'Procedure per ottenere e mantenere le licenze necessarie per operare nel settore',
        duration: '3 ore',
        level: 'intermediate',
        category: 'Licenze',
        instructor: 'Avv. Laura Bianchi',
        modules_count: 8,
        rating: 4.9,
        price: 49.99,
        is_free: false,
        passing_score: 75,
        tags: ['licenze', 'autorizzazioni', 'procedure']
      },
      {
        title: 'Sicurezza e Responsabilità',
        description: 'Normative sulla sicurezza, responsabilità civile e penale degli operatori',
        duration: '2.5 ore',
        level: 'intermediate',
        category: 'Sicurezza',
        instructor: 'Ing. Giuseppe Verdi',
        modules_count: 7,
        rating: 4.7,
        price: 39.99,
        is_free: false,
        passing_score: 80,
        tags: ['sicurezza', 'responsabilità', 'civile', 'penale']
      },
      {
        title: 'Gestione Documenti e Adempimenti',
        description: 'Come gestire correttamente documenti, registri e adempimenti obbligatori',
        duration: '1.5 ore',
        level: 'beginner',
        category: 'Amministrazione',
        instructor: 'Dott.ssa Anna Neri',
        modules_count: 5,
        rating: 4.6,
        price: 0.00,
        is_free: true,
        passing_score: 70,
        tags: ['documenti', 'adempimenti', 'registri']
      },
      {
        title: 'Controlli e Sanzioni',
        description: 'Normative sui controlli, procedure sanzionatorie e ricorsi',
        duration: '2 ore',
        level: 'advanced',
        category: 'Controlli',
        instructor: 'Avv. Roberto Blu',
        modules_count: 6,
        rating: 4.9,
        price: 59.99,
        is_free: false,
        passing_score: 85,
        tags: ['controlli', 'sanzioni', 'ricorsi']
      },
      {
        title: 'Evoluzione Normativa 2024',
        description: 'Aggiornamenti e novità normative introdotte nel 2024',
        duration: '1 ora',
        level: 'advanced',
        category: 'Aggiornamenti',
        instructor: 'Prof. Claudio Gialli',
        modules_count: 4,
        rating: 5.0,
        price: 29.99,
        is_free: false,
        passing_score: 90,
        tags: ['2024', 'aggiornamenti', 'novità']
      }
    ];

    for (const course of realCourses) {
      await sql`
        INSERT INTO courses (
          title, description, duration, level, category, instructor,
          modules_count, rating, price, is_free, passing_score, tags, status
        )
        VALUES (
          ${course.title}, ${course.description}, ${course.duration}, 
          ${course.level}, ${course.category}, ${course.instructor},
          ${course.modules_count}, ${course.rating}, ${course.price},
          ${course.is_free}, ${course.passing_score}, ${course.tags}, 'active'
        )
      `;
    }

    console.log('🎓 ACCADEMIA: 6 corsi reali inseriti con successo!');
  } catch (error) {
    console.error('🚨 ACCADEMIA: Errore popolamento corsi:', error);
  }
}

// ===== COURSE MODULES SYSTEM =====

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  type: 'lesson' | 'video' | 'document' | 'quiz' | 'assignment';
  content?: string; // Per lezioni testuali
  video_url?: string; // Per video
  document_url?: string; // Per documenti
  order_num: number;
  duration_minutes?: number;
  is_required: boolean;
  level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  updated_at: string;
}

// ===== QUIZ SYSTEM =====

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  points: number;
  order: number;
}

export interface Quiz {
  id: string;
  module_id: string; // Collegato al modulo invece che al corso
  title: string;
  description: string;
  time_limit: number; // minuti
  passing_score: number; // percentuale
  max_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  answers: { [questionId: string]: number };
  score: number;
  passed: boolean;
  started_at: string;
  completed_at?: string;
  time_taken: number; // secondi
}

// Crea tabelle moduli corso
export async function createCourseModuleTables() {
  try {
    // Tabella moduli corso
    await sql`
      CREATE TABLE IF NOT EXISTS course_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL CHECK (type IN ('lesson', 'video', 'document', 'quiz', 'assignment')),
        content TEXT,
        video_url VARCHAR(500),
        document_url VARCHAR(500),
        order_num INTEGER NOT NULL,
        duration_minutes INTEGER,
        is_required BOOLEAN DEFAULT true,
        level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Tabella course_modules creata con successo');
  } catch (error) {
    console.error('❌ Errore creazione tabella course_modules:', error);
  }
}

// Crea tabelle quiz
export async function createQuizTables() {
  try {
    // Crea tabella quiz (collegata ai moduli)
    await sql`
      CREATE TABLE IF NOT EXISTS quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        time_limit INTEGER DEFAULT 30,
        passing_score INTEGER DEFAULT 70,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Tabella domande quiz
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer INTEGER NOT NULL,
        explanation TEXT,
        points INTEGER DEFAULT 1,
        order_num INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabella tentativi quiz
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        passed BOOLEAN NOT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        time_taken INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Tabelle quiz create con successo');
  } catch (error) {
    console.error('❌ Errore creazione tabelle quiz:', error);
    throw error;
  }
}

// Ottieni quiz per corso
export async function getQuizByCourseId(courseId: string): Promise<Quiz | null> {
  try {
    const result = await sql`
      SELECT * FROM quizzes 
      WHERE course_id = ${courseId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Errore recupero quiz:', error);
    return null;
  }
}

// Ottieni quiz per modulo
export async function getQuizzesByModuleId(moduleId: string): Promise<Quiz[]> {
  try {
    const result = await sql`
      SELECT * FROM quizzes 
      WHERE module_id = ${moduleId}
      ORDER BY created_at ASC
    `;
    return result as Quiz[];
  } catch (error) {
    console.error('Errore recupero quiz per modulo:', error);
    return [];
  }
}

// Ottieni domande quiz
export async function getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  try {
    const result = await sql`
      SELECT * FROM quiz_questions 
      WHERE quiz_id = ${quizId}
      ORDER BY order_num ASC
    `;
    return result.map(row => ({
      ...row,
      options: Array.isArray(row.options) ? row.options : JSON.parse(row.options)
    }));
  } catch (error) {
    console.error('Errore recupero domande quiz:', error);
    return [];
  }
}

// Funzioni CRUD per moduli corso
export async function createCourseModule(module: Omit<CourseModule, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO course_modules (course_id, title, description, type, content, video_url, document_url, order_num, duration_minutes, is_required, level)
      VALUES (${module.course_id}, ${module.title}, ${module.description}, ${module.type}, ${module.content}, ${module.video_url}, ${module.document_url}, ${module.order_num}, ${module.duration_minutes}, ${module.is_required}, ${module.level})
      RETURNING id
    `;
    return result[0].id;
  } catch (error) {
    console.error('Errore creazione modulo corso:', error);
    throw error;
  }
}

export async function getCourseModules(courseId: string): Promise<CourseModule[]> {
  try {
    const result = await sql`
      SELECT * FROM course_modules 
      WHERE course_id = ${courseId}
      ORDER BY order_num ASC
    `;
    return result as CourseModule[];
  } catch (error) {
    console.error('Errore recupero moduli corso:', error);
    throw error;
  }
}

export async function updateCourseModule(moduleId: string, module: Partial<Omit<CourseModule, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  try {
    const updates = [];
    const values = [];
    
    if (module.title !== undefined) { updates.push('title = $' + (values.length + 1)); values.push(module.title); }
    if (module.description !== undefined) { updates.push('description = $' + (values.length + 1)); values.push(module.description); }
    if (module.type !== undefined) { updates.push('type = $' + (values.length + 1)); values.push(module.type); }
    if (module.content !== undefined) { updates.push('content = $' + (values.length + 1)); values.push(module.content); }
    if (module.video_url !== undefined) { updates.push('video_url = $' + (values.length + 1)); values.push(module.video_url); }
    if (module.document_url !== undefined) { updates.push('document_url = $' + (values.length + 1)); values.push(module.document_url); }
    if (module.order_num !== undefined) { updates.push('order_num = $' + (values.length + 1)); values.push(module.order_num); }
    if (module.duration_minutes !== undefined) { updates.push('duration_minutes = $' + (values.length + 1)); values.push(module.duration_minutes); }
    if (module.is_required !== undefined) { updates.push('is_required = $' + (values.length + 1)); values.push(module.is_required); }
    if (module.level !== undefined) { updates.push('level = $' + (values.length + 1)); values.push(module.level); }
    
    updates.push('updated_at = NOW()');
    values.push(moduleId);
    
    if (updates.length > 1) { // Almeno un campo da aggiornare oltre a updated_at
      const query = `UPDATE course_modules SET ${updates.join(', ')} WHERE id = $${values.length}`;
      await sql.unsafe(query, values);
    }
  } catch (error) {
    console.error('Errore aggiornamento modulo corso:', error);
    throw error;
  }
}

export async function deleteCourseModule(moduleId: string): Promise<void> {
  try {
    await sql`DELETE FROM course_modules WHERE id = ${moduleId}`;
  } catch (error) {
    console.error('Errore eliminazione modulo corso:', error);
    throw error;
  }
}

// Funzioni CRUD per quiz
export async function createQuiz(quiz: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO quizzes (module_id, title, description, time_limit, passing_score, max_attempts)
      VALUES (${quiz.module_id}, ${quiz.title}, ${quiz.description}, ${quiz.time_limit}, ${quiz.passing_score}, ${quiz.max_attempts})
      RETURNING id
    `;
    return result[0].id;
  } catch (error) {
    console.error('Errore creazione quiz:', error);
    throw error;
  }
}

// Aggiorna quiz
export async function updateQuiz(quizId: string, quiz: Partial<Omit<Quiz, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  try {
    await sql`
      UPDATE quizzes 
      SET title = ${quiz.title}, description = ${quiz.description}, 
          time_limit = ${quiz.time_limit}, passing_score = ${quiz.passing_score}, 
          max_attempts = ${quiz.max_attempts}, updated_at = NOW()
      WHERE id = ${quizId}
    `;
  } catch (error) {
    console.error('Errore aggiornamento quiz:', error);
    throw error;
  }
}

// Elimina quiz
export async function deleteQuiz(quizId: string): Promise<void> {
  try {
    // Prima elimina le domande
    await sql`DELETE FROM quiz_questions WHERE quiz_id = ${quizId}`;
    // Poi elimina i tentativi
    await sql`DELETE FROM quiz_attempts WHERE quiz_id = ${quizId}`;
    // Infine elimina il quiz
    await sql`DELETE FROM quizzes WHERE id = ${quizId}`;
  } catch (error) {
    console.error('Errore eliminazione quiz:', error);
    throw error;
  }
}

// Crea domanda quiz
export async function createQuizQuestion(question: Omit<QuizQuestion, 'id'>): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation, points, order_num)
      VALUES (${question.quiz_id}, ${question.question}, ${JSON.stringify(question.options)}, 
              ${question.correct_answer}, ${question.explanation}, ${question.points}, ${question.order})
      RETURNING id
    `;
    return result[0].id;
  } catch (error) {
    console.error('Errore creazione domanda quiz:', error);
    throw error;
  }
}

// Aggiorna domanda quiz
export async function updateQuizQuestion(questionId: string, question: Partial<Omit<QuizQuestion, 'id'>>): Promise<void> {
  try {
    await sql`
      UPDATE quiz_questions 
      SET question = ${question.question}, options = ${JSON.stringify(question.options)}, 
          correct_answer = ${question.correct_answer}, explanation = ${question.explanation}, 
          points = ${question.points}, order_num = ${question.order}
      WHERE id = ${questionId}
    `;
  } catch (error) {
    console.error('Errore aggiornamento domanda quiz:', error);
    throw error;
  }
}

// Elimina domanda quiz
export async function deleteQuizQuestion(questionId: string): Promise<void> {
  try {
    await sql`DELETE FROM quiz_questions WHERE id = ${questionId}`;
  } catch (error) {
    console.error('Errore eliminazione domanda quiz:', error);
    throw error;
  }
}

// Salva tentativo quiz
export async function saveQuizAttempt(attempt: Omit<QuizAttempt, 'id'>): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO quiz_attempts (user_id, quiz_id, answers, score, passed, started_at, completed_at, time_taken)
      VALUES (${attempt.user_id}, ${attempt.quiz_id}, ${JSON.stringify(attempt.answers)}, 
              ${attempt.score}, ${attempt.passed}, ${attempt.started_at}, ${attempt.completed_at}, ${attempt.time_taken})
      RETURNING id
    `;
    return result[0].id;
  } catch (error) {
    console.error('Errore salvataggio tentativo quiz:', error);
    throw error;
  }
}

// Ottieni tentativi utente per quiz
export async function getUserQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
  try {
    const result = await sql`
      SELECT * FROM quiz_attempts 
      WHERE user_id = ${userId} AND quiz_id = ${quizId}
      ORDER BY created_at DESC
    `;
    return result.map(row => ({
      ...row,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers
    }));
  } catch (error) {
    console.error('Errore recupero tentativi quiz:', error);
    return [];
  }
}

// Popola quiz demo
export async function populateDemoQuizzes() {
  try {
    // Ottieni tutti i corsi
    const courses = await getAllCourses();
    
    for (const course of courses) {
      // Verifica se esiste già un quiz per questo corso
      const existingQuiz = await getQuizByCourseId(course.id);
      if (existingQuiz) continue;
      
      // Crea quiz per il corso
      const quizId = await createQuiz({
        course_id: course.id,
        title: `Quiz Finale - ${course.title}`,
        description: `Verifica delle competenze acquisite nel corso "${course.title}"`,
        time_limit: 30,
        passing_score: course.passing_score,
        max_attempts: 3
      });
      
      // Crea domande demo basate sul corso
      const demoQuestions = generateDemoQuestions(course);
      
      for (let i = 0; i < demoQuestions.length; i++) {
        await createQuizQuestion({
          quiz_id: quizId,
          question: demoQuestions[i].question,
          options: demoQuestions[i].options,
          correct_answer: demoQuestions[i].correct_answer,
          explanation: demoQuestions[i].explanation,
          points: 1,
          order: i + 1
        });
      }
    }
    
    console.log('🎯 Quiz demo popolati con successo');
  } catch (error) {
    console.error('❌ Errore popolamento quiz demo:', error);
  }
}


function generateDemoQuestions(course: Course) {
  const baseQuestions = [
    {
      question: `Qual è l'obiettivo principale del corso "${course.title}"?`,
      options: [
        'Fornire una formazione completa sugli argomenti trattati',
        'Sostituire la formazione tradizionale',
        'Ridurre i costi di formazione',
        'Aumentare il numero di partecipanti'
      ],
      correct_answer: 0,
      explanation: 'Il corso mira a fornire una formazione completa e aggiornata sugli argomenti specifici trattati.'
    },
    {
      question: `Quale livello di competenza è richiesto per il corso "${course.title}"?`,
      options: [
        course.level === 'beginner' ? 'Nessuna competenza specifica' : 'Competenze avanzate',
        course.level === 'intermediate' ? 'Competenze di base' : 'Competenze specialistiche',
        course.level === 'advanced' ? 'Esperienza consolidata' : 'Conoscenze teoriche',
        'Certificazioni professionali'
      ],
      correct_answer: course.level === 'beginner' ? 0 : course.level === 'intermediate' ? 1 : 2,
      explanation: `Questo corso è di livello ${course.level} e richiede competenze appropriate.`
    },
    {
      question: `Qual è la durata stimata del corso "${course.title}"?`,
      options: [
        course.duration,
        '2 ore',
        '30 minuti',
        '3 ore'
      ],
      correct_answer: 0,
      explanation: `La durata del corso è di ${course.duration} come indicato nelle specifiche.`
    }
  ];
  
  return baseQuestions;
}