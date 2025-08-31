import { sql } from './neonDatabase';

export async function checkDatabaseStatus() {
  try {
    console.log('🔍 VERIFICA STATO DATABASE NEON...');
    
    // Verifica esistenza tabella courses
    const coursesExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'courses'
      );
    `;
    
    // Verifica vincoli role_permissions
    const rolePermConstraints = await sql`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'role_permissions' 
      AND constraint_type = 'UNIQUE';
    `;
    
    // Verifica vincoli role_sections  
    const roleSectConstraints = await sql`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'role_sections' 
      AND constraint_type = 'UNIQUE';
    `;
    
    // Conta permessi courses
    const coursesPermissions = await sql`
      SELECT COUNT(*) as count 
      FROM permissions 
      WHERE category = 'courses';
    `;
    
    const status = {
      coursesTableExists: coursesExists[0]?.exists || false,
      rolePermConstraints: rolePermConstraints.length,
      roleSectConstraints: roleSectConstraints.length,
      coursesPermissionsCount: coursesPermissions[0]?.count || 0
    };
    
    console.log('📊 STATO DATABASE:', status);
    
    if (!status.coursesTableExists) {
      console.log('❌ TABELLA COURSES MANCANTE - Migrazione necessaria');
    }
    
    if (status.coursesPermissionsCount === 0) {
      console.log('❌ PERMESSI COURSES MANCANTI - Migrazione necessaria');
    }
    
    if (status.coursesTableExists && status.coursesPermissionsCount > 0) {
      console.log('✅ DATABASE ALLINEATO');
    }
    
    return status;
    
  } catch (error) {
    console.error('🚨 ERRORE VERIFICA DATABASE:', error);
    return null;
  }
}

export async function forceMigration() {
  try {
    console.log('🚀 FORZATURA MIGRAZIONE DATABASE...');
    
    const { initializeTables, insertDefaultRoleConfiguration } = await import('./neonDatabase');
    
    await initializeTables();
    console.log('✅ Tabelle create/aggiornate');
    
    await insertDefaultRoleConfiguration();
    console.log('✅ Configurazione ruoli aggiornata');
    
    console.log('🎉 MIGRAZIONE COMPLETATA');
    return true;
    
  } catch (error) {
    console.error('🚨 ERRORE MIGRAZIONE:', error);
    return false;
  }
}
