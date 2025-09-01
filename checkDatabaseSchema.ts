// Script per verificare lo schema della tabella users nel database Neon
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.VITE_DATABASE_URL!);

async function checkUsersTableSchema() {
  try {
    console.log('🔍 Verifica schema tabella users...');
    
    // Controlla le colonne della tabella users
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Colonne tabella users:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Verifica se updated_at esiste
    const hasUpdatedAt = columns.some(col => col.column_name === 'updated_at');
    console.log(`\n🎯 Colonna updated_at presente: ${hasUpdatedAt ? '✅ SÌ' : '❌ NO'}`);
    
    if (!hasUpdatedAt) {
      console.log('\n🚨 PROBLEMA IDENTIFICATO: La colonna updated_at NON esiste nel database!');
      console.log('💡 SOLUZIONE: Eseguire migrazione per aggiungere la colonna');
    }
    
  } catch (error) {
    console.error('❌ Errore verifica schema:', error);
  }
}

async function addUpdatedAtColumn() {
  try {
    console.log('🔧 Aggiunta colonna updated_at alla tabella users...');
    
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `;
    
    console.log('✅ Colonna updated_at aggiunta con successo!');
    
    // Verifica che sia stata aggiunta
    await checkUsersTableSchema();
    
  } catch (error) {
    console.error('❌ Errore aggiunta colonna:', error);
  }
}

// Esegui verifica
checkUsersTableSchema().then(() => {
  console.log('\n🔧 Vuoi aggiungere la colonna updated_at? Esegui addUpdatedAtColumn()');
});

export { checkUsersTableSchema, addUpdatedAtColumn };
