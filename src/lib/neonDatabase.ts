import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL!);

export interface User {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: 'user' | 'admin';
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
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
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
        reference_number VARCHAR(100) NOT NULL,
        publication_date DATE NOT NULL,
        effective_date DATE NOT NULL,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // FORZA sempre l'inserimento di dati puliti
    console.log('🏗️ INIT DEBUG: FORZANDO inserimento dati puliti...');
    await insertSampleData();

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
    console.log('🧹 CLEAN DEBUG: Pulizia dati esistenti...');
    
    // Cancella tutti i dati esistenti
    await sql`DELETE FROM users`;
    await sql`DELETE FROM normatives`;
    console.log('🧹 CLEAN DEBUG: Dati cancellati');
    
    console.log('📝 SAMPLE DEBUG: Inserimento dati di esempio...');
    
    // Hash password semplificato per demo
    console.log('📝 SAMPLE DEBUG: Hash password admin...');
    const adminHash = await hashPassword('admin123');
    console.log('📝 SAMPLE DEBUG: Hash password user...');
    const userHash = await hashPassword('user123');
    
    console.log('📝 SAMPLE DEBUG: Admin hash (primi 10):', adminHash.substring(0, 10));
    console.log('📝 SAMPLE DEBUG: User hash (primi 10):', userHash.substring(0, 10));

    // Verifica che gli hash siano stati generati correttamente
    console.log('📝 SAMPLE DEBUG: Admin hash completo length:', adminHash.length);
    console.log('📝 SAMPLE DEBUG: User hash completo length:', userHash.length);

    // Inserisci utenti
    console.log('📝 SAMPLE DEBUG: Inserimento utenti...');
    const insertResult = await sql`
      INSERT INTO users (email, full_name, password_hash, role)
      VALUES 
        ('admin@accademia.it', 'Amministratore', ${adminHash}, 'admin'),
        ('user@accademia.it', 'Utente Demo', ${userHash}, 'user')
     ON CONFLICT (email) DO NOTHING
      RETURNING id, email, full_name, role
    `;
    console.log('📝 SAMPLE DEBUG: Utenti inseriti:', insertResult);
    
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
    `;
    console.log('📝 SAMPLE DEBUG: Normative inserite con successo');

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

export async function createUser(email: string, fullName: string, passwordHash: string, role: 'user' | 'admin' = 'user'): Promise<User | null> {
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