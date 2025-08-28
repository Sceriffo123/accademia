/**
 * STRUMENTI DI SVILUPPO E DEBUG
 * 
 * Questa sezione contiene utilities per il debugging, ispezione database,
 * e strumenti di sviluppo che possono essere utilizzati durante tutto
 * il ciclo di vita del progetto.
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL);

// ================================
// ISPEZIONE DATABASE
// ================================

/**
 * Ispeziona la struttura completa del database
 */
export async function inspectDatabase() {
  console.log('🔍 ISPEZIONANDO DATABASE NEON...');
  
  try {
    // Lista tutte le tabelle
    const tables = await sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('📋 TABELLE ESISTENTI:');
    console.table(tables);

    // Ispeziona struttura tabella users
    await inspectUsersTable();
    
    // Ispeziona struttura tabella normatives
    await inspectNormativesTable();
    
    // Mostra dati esistenti
    await showExistingData();
    
  } catch (error) {
    console.error('❌ Errore durante ispezione database:', error);
  }
}

/**
 * Ispeziona la struttura della tabella users
 */
export async function inspectUsersTable() {
  console.log('\n👥 STRUTTURA TABELLA USERS:');
  
  try {
    // Struttura colonne
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    
    console.table(columns);

    // Constraint sulla tabella users
    const constraints = await sql`
      SELECT constraint_name, constraint_type, check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'users';
    `;
    
    console.log('🔒 CONSTRAINT TABELLA USERS:');
    console.table(constraints);
    
  } catch (error) {
    console.error('❌ Errore ispezione tabella users:', error);
  }
}

/**
 * Ispeziona la struttura della tabella normatives
 */
export async function inspectNormativesTable() {
  console.log('\n📋 STRUTTURA TABELLA NORMATIVES:');
  
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'normatives'
      ORDER BY ordinal_position;
    `;
    
    console.table(columns);
    
  } catch (error) {
    console.error('❌ Errore ispezione tabella normatives:', error);
  }
}

/**
 * Mostra i dati esistenti nel database
 */
export async function showExistingData() {
  console.log('\n📊 DATI ESISTENTI:');
  
  try {
    // Utenti esistenti
    const users = await sql`SELECT id, email, role, created_at FROM users ORDER BY created_at DESC`;
    console.log('👥 UTENTI:');
    console.table(users);
    
    // Distribuzione ruoli
    const roleDistribution = await sql`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY count DESC
    `;
    console.log('📈 DISTRIBUZIONE RUOLI:');
    console.table(roleDistribution);
    
    // Statistiche normative
    const normativeStats = await sql`
      SELECT COUNT(*) as total_normatives,
             COUNT(CASE WHEN status = 'active' THEN 1 END) as active_normatives
      FROM normatives
    `;
    console.log('📋 STATISTICHE NORMATIVE:');
    console.table(normativeStats);
    
  } catch (error) {
    console.error('❌ Errore recupero dati esistenti:', error);
  }
}

/**
 * Verifica la compatibilità per la migrazione dei ruoli
 */
export async function checkRoleMigrationCompatibility() {
  console.log('\n🔧 VERIFICA COMPATIBILITÀ MIGRAZIONE RUOLI...');
  
  try {
    // Controlla ruoli attuali
    const currentRoles = await sql`
      SELECT DISTINCT role FROM users ORDER BY role
    `;
    
    console.log('🏷️ RUOLI ATTUALI:');
    console.table(currentRoles);
    
    // Nuovi ruoli proposti
    const newRoles = ['superadmin', 'admin', 'operatore', 'utente', 'ospite'];
    
    console.log('🆕 NUOVI RUOLI PROPOSTI:');
    console.table(newRoles.map(role => ({ role })));
    
    // Mapping suggerito
    console.log('🔄 MAPPING SUGGERITO:');
    console.table([
      { ruolo_attuale: 'admin', nuovo_ruolo: 'admin', note: 'Mantiene privilegi amministrativi' },
      { ruolo_attuale: 'user', nuovo_ruolo: 'utente', note: 'Diventa utente registrato standard' },
      { ruolo_attuale: 'N/A', nuovo_ruolo: 'superadmin', note: 'Da creare manualmente' },
      { ruolo_attuale: 'N/A', nuovo_ruolo: 'operatore', note: 'Nuovo ruolo intermedio' },
      { ruolo_attuale: 'N/A', nuovo_ruolo: 'ospite', note: 'Per accesso pubblico limitato' }
    ]);
    
    return {
      currentRoles: currentRoles.map(r => r.role),
      newRoles,
      migrationNeeded: true
    };
    
  } catch (error) {
    console.error('❌ Errore verifica compatibilità:', error);
    return null;
  }
}

// ================================
// STRUMENTI DI DEBUG GENERALI
// ================================

/**
 * Log strutturato per debug
 */
export function debugLog(category: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.group(`🐛 [${category}] ${timestamp}`);
  console.log(message);
  if (data) {
    console.log('Data:', data);
  }
  console.groupEnd();
}

/**
 * Misura performance di una funzione
 */
export async function measurePerformance<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`❌ ${name} fallito dopo ${(end - start).toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Valida la struttura del database
 */
export async function validateDatabaseStructure() {
  console.log('🔍 VALIDAZIONE STRUTTURA DATABASE...');
  
  const checks = [
    {
      name: 'Tabella users esiste',
      check: async () => {
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users'
          )
        `;
        return result[0].exists;
      }
    },
    {
      name: 'Tabella normatives esiste',
      check: async () => {
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'normatives'
          )
        `;
        return result[0].exists;
      }
    },
    {
      name: 'Colonna role in users',
      check: async () => {
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
          )
        `;
        return result[0].exists;
      }
    }
  ];
  
  for (const check of checks) {
    try {
      const result = await check.check();
      console.log(`${result ? '✅' : '❌'} ${check.name}: ${result ? 'OK' : 'FALLITO'}`);
    } catch (error) {
      console.error(`❌ ${check.name}: ERRORE -`, error);
    }
  }
}

// ================================
// UTILITIES DI MIGRAZIONE
// ================================

/**
 * Crea backup della tabella users prima della migrazione
 */
export async function createUsersBackup() {
  console.log('💾 CREAZIONE BACKUP TABELLA USERS...');
  
  try {
    // Crea tabella di backup con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
    const backupTableName = `users_backup_${timestamp}`;
    
    await sql`
      CREATE TABLE ${sql(backupTableName)} AS 
      SELECT * FROM users
    `;
    
    console.log(`✅ Backup creato: ${backupTableName}`);
    return backupTableName;
    
  } catch (error) {
    console.error('❌ Errore creazione backup:', error);
    throw error;
  }
}

/**
 * Lista tutti i backup esistenti
 */
export async function listBackups() {
  try {
    const backups = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'users_backup_%'
      ORDER BY table_name DESC
    `;
    
    console.log('📋 BACKUP ESISTENTI:');
    console.table(backups);
    return backups;
    
  } catch (error) {
    console.error('❌ Errore lista backup:', error);
    return [];
  }
}
