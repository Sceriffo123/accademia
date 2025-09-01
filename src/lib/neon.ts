import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL);

export interface User {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
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

// Funzione per creare le tabelle iniziali
export async function createTables() {
  try {
    // Crea tabella users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Inserisci utente admin di default se non esiste
    await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES ('admin@accademia.it', 'Amministratore', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
      ON CONFLICT (email) DO NOTHING
    `;

    console.log('Tabelle create con successo!');
    return true;
  } catch (error) {
    console.error('Errore nella creazione delle tabelle:', error);
    return false;
  }
}

// Funzioni per gestire gli utenti
export async function createUser(email: string, fullName: string, passwordHash: string, role: 'user' | 'admin' = 'user') {
  try {
    const result = await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES (${email}, ${fullName}, ${passwordHash}, ${role})
      RETURNING id, email, full_name, role, created_at
    `;
    return result[0];
  } catch (error) {
    console.error('Errore nella creazione utente:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await sql`
      SELECT id, email, full_name, password_hash, role, created_at
      FROM users
      WHERE email = ${email}
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    return null;
  }
}

export async function getUserById(id: string) {
  try {
    const result = await sql`
      SELECT id, email, full_name, role, created_at
      FROM users
      WHERE id = ${id}
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    const result = await sql`
      SELECT id, email, full_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    return result;
  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    return [];
  }
}

export async function getUsersCount() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore nel conteggio utenti:', error);
    return 0;
  }
}

// Funzioni per gestire le normative
export async function createNormative(data: Omit<Normative, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const result = await sql`
      INSERT INTO normatives (title, content, category, type, reference_number, publication_date, effective_date, tags)
      VALUES (${data.title}, ${data.content}, ${data.category}, ${data.type}, ${data.reference_number}, ${data.publication_date}, ${data.effective_date}, ${data.tags})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Errore nella creazione normativa:', error);
    throw error;
  }
}

export async function getAllNormatives() {
  try {
    const result = await sql`
      SELECT * FROM normatives
      ORDER BY publication_date DESC
    `;
    return result;
  } catch (error) {
    console.error('Errore nel recupero normative:', error);
    return [];
  }
}

export async function getNormativeById(id: string) {
  try {
    const result = await sql`
      SELECT * FROM normatives
      WHERE id = ${id}
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Errore nel recupero normativa:', error);
    return null;
  }
}

export async function getNormativesCount() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM normatives`;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore nel conteggio normative:', error);
    return 0;
  }
}

export async function getRecentNormativesCount(days: number = 30) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM normatives 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Errore nel conteggio normative recenti:', error);
    return 0;
  }
}

// Funzione per inserire dati di esempio
export async function insertSampleData() {
  try {
    // Inserisci normative di esempio
    await sql`
      INSERT INTO normatives (title, content, category, type, reference_number, publication_date, effective_date, tags)
      VALUES 
      (
        'Decreto Legislativo 285/1992 - Codice della Strada',
        'Il presente decreto disciplina la circolazione stradale e stabilisce le norme per il trasporto pubblico locale non di linea. Articolo 1: Definizioni e campo di applicazione...',
        'Trasporto Pubblico',
        'law',
        'D.Lgs. 285/1992',
        '1992-04-30',
        '1993-01-01',
        ARRAY['trasporto', 'codice strada', 'pubblico locale']
      ),
      (
        'Legge Regionale 15/2018 - Disciplina TPL non di linea',
        'La presente legge disciplina il trasporto pubblico locale non di linea nella regione, stabilendo requisiti, procedure e controlli. Articolo 1: Oggetto e finalità...',
        'Normativa Regionale',
        'regulation',
        'L.R. 15/2018',
        '2018-03-15',
        '2018-06-01',
        ARRAY['trasporto locale', 'regionale', 'licenze']
      ),
      (
        'Sentenza TAR Lazio n. 1234/2023',
        'Il Tribunale Amministrativo Regionale del Lazio si è pronunciato sulla questione relativa ai requisiti per il rilascio delle autorizzazioni...',
        'Giurisprudenza',
        'ruling',
        'TAR Lazio 1234/2023',
        '2023-05-20',
        '2023-05-20',
        ARRAY['tar', 'autorizzazioni', 'giurisprudenza']
      )
      ON CONFLICT DO NOTHING
    `;

    console.log('Dati di esempio inseriti con successo!');
    return true;
  } catch (error) {
    console.error('Errore nell\'inserimento dati di esempio:', error);
    return false;
  }
}