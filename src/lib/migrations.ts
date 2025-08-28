// Database Migration System for Role-Based Access Control
import { neon } from '@neondatabase/serverless';
import { debugLog } from './devTools';

const sql = neon(import.meta.env.VITE_DATABASE_URL!);

export interface Migration {
  id: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Migration per aggiornare il sistema di ruoli
export const ROLE_MIGRATION: Migration = {
  id: '001_update_roles_system',
  name: 'Update Roles System',
  description: 'Aggiorna il sistema di ruoli da user/admin a gerarchia completa',
  
  async up() {
    debugLog('MIGRATION', 'Inizio migrazione sistema ruoli...');
    
    try {
      // 1. Crea tabella per tracking delle migrazioni
      await sql`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // 2. Backup della tabella users esistente
      await sql`
        CREATE TABLE IF NOT EXISTS users_backup_${Date.now()} AS 
        SELECT * FROM users
      `;
      
      // 3. Aggiorna il tipo ENUM per i ruoli
      await sql`
        ALTER TYPE user_role RENAME TO user_role_old
      `;
      
      await sql`
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'operator', 'user', 'guest')
      `;
      
      // 4. Aggiorna la colonna role nella tabella users
      await sql`
        ALTER TABLE users 
        ALTER COLUMN role DROP DEFAULT,
        ALTER COLUMN role TYPE user_role USING 
          CASE 
            WHEN role::text = 'admin' THEN 'admin'::user_role
            WHEN role::text = 'user' THEN 'user'::user_role
            ELSE 'user'::user_role
          END,
        ALTER COLUMN role SET DEFAULT 'user'::user_role
      `;
      
      // 5. Rimuovi il vecchio tipo
      await sql`DROP TYPE user_role_old`;
      
      // 6. Aggiungi nuove colonne per metadati ruolo
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS permissions_override JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
      `;
      
      // 7. Crea indici per performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
        CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
      `;
      
      // 8. Crea tabella per audit log delle autorizzazioni
      await sql`
        CREATE TABLE IF NOT EXISTS auth_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          action VARCHAR(255) NOT NULL,
          resource VARCHAR(255) NOT NULL,
          granted BOOLEAN NOT NULL,
          reason TEXT,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at);
      `;
      
      // 9. Registra la migrazione come completata
      await sql`
        INSERT INTO migrations (id, name) 
        VALUES (${this.id}, ${this.name})
        ON CONFLICT (id) DO NOTHING
      `;
      
      debugLog('MIGRATION', 'Migrazione sistema ruoli completata con successo');
      
    } catch (error) {
      debugLog('MIGRATION', 'Errore durante migrazione:', error);
      throw error;
    }
  },
  
  async down() {
    debugLog('MIGRATION', 'Rollback migrazione sistema ruoli...');
    
    try {
      // Rimuovi le nuove colonne
      await sql`
        ALTER TABLE users 
        DROP COLUMN IF EXISTS role_assigned_by,
        DROP COLUMN IF EXISTS role_assigned_at,
        DROP COLUMN IF EXISTS permissions_override,
        DROP COLUMN IF EXISTS is_active,
        DROP COLUMN IF EXISTS last_login
      `;
      
      // Ripristina il vecchio sistema di ruoli
      await sql`
        CREATE TYPE user_role_old AS ENUM ('user', 'admin')
      `;
      
      await sql`
        ALTER TABLE users 
        ALTER COLUMN role TYPE user_role_old USING 
          CASE 
            WHEN role::text IN ('super_admin', 'admin') THEN 'admin'::user_role_old
            ELSE 'user'::user_role_old
          END
      `;
      
      await sql`DROP TYPE user_role`;
      await sql`ALTER TYPE user_role_old RENAME TO user_role`;
      
      // Rimuovi tabelle create
      await sql`DROP TABLE IF EXISTS auth_audit_log`;
      
      // Rimuovi record migrazione
      await sql`DELETE FROM migrations WHERE id = ${this.id}`;
      
      debugLog('MIGRATION', 'Rollback completato');
      
    } catch (error) {
      debugLog('MIGRATION', 'Errore durante rollback:', error);
      throw error;
    }
  }
};

// Sistema di gestione migrazioni
export class MigrationManager {
  
  /**
   * Verifica se una migrazione è già stata applicata
   */
  static async isMigrationApplied(migrationId: string): Promise<boolean> {
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM migrations WHERE id = ${migrationId}
      `;
      return parseInt(result[0].count) > 0;
    } catch (error) {
      // Se la tabella migrations non esiste, la migrazione non è stata applicata
      return false;
    }
  }
  
  /**
   * Applica una migrazione
   */
  static async applyMigration(migration: Migration): Promise<boolean> {
    try {
      const isApplied = await this.isMigrationApplied(migration.id);
      
      if (isApplied) {
        debugLog('MIGRATION', `Migrazione ${migration.id} già applicata`);
        return true;
      }
      
      debugLog('MIGRATION', `Applicando migrazione ${migration.id}: ${migration.name}`);
      await migration.up();
      
      return true;
    } catch (error) {
      debugLog('MIGRATION', `Errore applicando migrazione ${migration.id}:`, error);
      return false;
    }
  }
  
  /**
   * Rollback di una migrazione
   */
  static async rollbackMigration(migration: Migration): Promise<boolean> {
    try {
      const isApplied = await this.isMigrationApplied(migration.id);
      
      if (!isApplied) {
        debugLog('MIGRATION', `Migrazione ${migration.id} non applicata, skip rollback`);
        return true;
      }
      
      debugLog('MIGRATION', `Rollback migrazione ${migration.id}: ${migration.name}`);
      await migration.down();
      
      return true;
    } catch (error) {
      debugLog('MIGRATION', `Errore rollback migrazione ${migration.id}:`, error);
      return false;
    }
  }
  
  /**
   * Ottiene lista migrazioni applicate
   */
  static async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await sql`
        SELECT id FROM migrations ORDER BY applied_at ASC
      `;
      return result.map(row => row.id);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Verifica compatibilità per migrazione ruoli
   */
  static async checkRoleMigrationCompatibility(): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Verifica struttura tabella users
      const tableInfo = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `;
      
      const columns = tableInfo.map(col => col.column_name);
      
      // Verifica colonne richieste
      const requiredColumns = ['id', 'email', 'role', 'password_hash'];
      for (const col of requiredColumns) {
        if (!columns.includes(col)) {
          issues.push(`Colonna mancante: ${col}`);
        }
      }
      
      // Verifica dati esistenti
      const userData = await sql`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `;
      
      debugLog('MIGRATION', 'Distribuzione ruoli attuali:', userData);
      
      // Verifica se ci sono ruoli non standard
      const validOldRoles = ['user', 'admin'];
      for (const row of userData) {
        if (!validOldRoles.includes(row.role)) {
          issues.push(`Ruolo non riconosciuto: ${row.role}`);
        }
      }
      
      // Raccomandazioni
      if (userData.length > 0) {
        recommendations.push('Creare backup della tabella users prima della migrazione');
        recommendations.push('Testare la migrazione in ambiente di sviluppo');
      }
      
      const adminCount = userData.find(r => r.role === 'admin')?.count || 0;
      if (adminCount === 0) {
        recommendations.push('Assicurarsi di avere almeno un utente admin prima della migrazione');
      }
      
      return {
        compatible: issues.length === 0,
        issues,
        recommendations
      };
      
    } catch (error) {
      issues.push(`Errore verifica compatibilità: ${error}`);
      return { compatible: false, issues, recommendations };
    }
  }
  
  /**
   * Applica tutte le migrazioni pendenti
   */
  static async runPendingMigrations(): Promise<{
    success: boolean;
    applied: string[];
    failed: string[];
  }> {
    const applied: string[] = [];
    const failed: string[] = [];
    
    // Lista di tutte le migrazioni disponibili
    const migrations = [ROLE_MIGRATION];
    
    for (const migration of migrations) {
      const success = await this.applyMigration(migration);
      if (success) {
        applied.push(migration.id);
      } else {
        failed.push(migration.id);
      }
    }
    
    return {
      success: failed.length === 0,
      applied,
      failed
    };
  }
}
