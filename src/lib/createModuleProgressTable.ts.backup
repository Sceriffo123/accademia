import { sql } from './neonDatabase';

/**
 * Crea la tabella module_progress nel database Neon
 * Esegue il DDL per il tracking del progresso dei moduli
 */
export async function createModuleProgressTable(): Promise<boolean> {
  try {
    console.log('🎓 NEON: Creazione tabella module_progress...');
    
    // Crea tabella module_progress
    await sql`
      CREATE TABLE IF NOT EXISTS module_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        score INTEGER CHECK (score >= 0 AND score <= 100),
        time_spent INTEGER CHECK (time_spent >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(enrollment_id, module_id)
      )
    `;
    
    console.log('✅ Tabella module_progress creata');
    
    // Crea indici per performance
    await sql`CREATE INDEX IF NOT EXISTS idx_module_progress_enrollment ON module_progress(enrollment_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_module_progress_module ON module_progress(module_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_module_progress_completed ON module_progress(completed)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_module_progress_completed_at ON module_progress(completed_at)`;
    
    console.log('✅ Indici module_progress creati');
    
    // Crea trigger per updated_at (se non esiste già)
    await sql`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    await sql`
      DROP TRIGGER IF EXISTS trigger_module_progress_updated_at ON module_progress
    `;
    
    await sql`
      CREATE TRIGGER trigger_module_progress_updated_at
          BEFORE UPDATE ON module_progress
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at()
    `;
    
    console.log('✅ Trigger module_progress creato');
    
    // Aggiungi commenti per documentazione
    await sql`COMMENT ON TABLE module_progress IS 'Tracking progresso completamento moduli per ogni iscrizione'`;
    await sql`COMMENT ON COLUMN module_progress.enrollment_id IS 'Riferimento all''iscrizione utente-corso'`;
    await sql`COMMENT ON COLUMN module_progress.module_id IS 'Riferimento al modulo del corso'`;
    await sql`COMMENT ON COLUMN module_progress.completed IS 'Flag completamento modulo'`;
    await sql`COMMENT ON COLUMN module_progress.completed_at IS 'Timestamp completamento modulo'`;
    await sql`COMMENT ON COLUMN module_progress.score IS 'Punteggio ottenuto (0-100)'`;
    await sql`COMMENT ON COLUMN module_progress.time_spent IS 'Tempo speso in secondi'`;
    
    console.log('✅ Commenti module_progress aggiunti');
    console.log('🎓 NEON: Tabella module_progress creata con successo!');
    
    return true;
  } catch (error) {
    console.error('🚨 NEON: Errore creazione tabella module_progress:', error);
    return false;
  }
}

/**
 * Verifica se la tabella module_progress esiste
 */
export async function checkModuleProgressTable(): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'module_progress'
      )
    `;
    
    return result[0]?.exists || false;
  } catch (error) {
    console.error('🚨 NEON: Errore verifica tabella module_progress:', error);
    return false;
  }
}
