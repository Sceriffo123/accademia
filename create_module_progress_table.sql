-- ==============================================
-- DDL per tabella module_progress
-- ==============================================

-- Crea tabella module_progress per tracking completamento moduli
CREATE TABLE IF NOT EXISTS module_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    time_spent INTEGER CHECK (time_spent >= 0), -- in secondi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint per evitare duplicati
    UNIQUE(enrollment_id, module_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_module_progress_enrollment ON module_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module ON module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_completed ON module_progress(completed);
CREATE INDEX IF NOT EXISTS idx_module_progress_completed_at ON module_progress(completed_at);

-- Trigger per aggiornamento automatico updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_module_progress_updated_at ON module_progress;
CREATE TRIGGER trigger_module_progress_updated_at
    BEFORE UPDATE ON module_progress
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE module_progress IS 'Tracking progresso completamento moduli per ogni iscrizione';
COMMENT ON COLUMN module_progress.enrollment_id IS 'Riferimento all''iscrizione utente-corso';
COMMENT ON COLUMN module_progress.module_id IS 'Riferimento al modulo del corso';
COMMENT ON COLUMN module_progress.completed IS 'Flag completamento modulo';
COMMENT ON COLUMN module_progress.completed_at IS 'Timestamp completamento modulo';
COMMENT ON COLUMN module_progress.score IS 'Punteggio ottenuto (0-100)';
COMMENT ON COLUMN module_progress.time_spent IS 'Tempo speso in secondi';
