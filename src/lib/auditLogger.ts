import { appendFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface AuditLogEntry {
  timestamp: string;
  operation: string;
  status: 'SUCCESS' | 'ERROR' | 'VERIFICATION_FAILED' | 'WARNING';
  data: any;
  user?: string;
}

// Funzione per scrivere nel file audit log
export async function writeAuditLog(operation: string, status: 'SUCCESS' | 'ERROR' | 'VERIFICATION_FAILED' | 'WARNING', data: any, user?: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const logEntry: AuditLogEntry = {
      timestamp,
      operation,
      status,
      data,
      user
    };

    const logLine = `[${timestamp}] ${operation} - ${status}: ${JSON.stringify(data)}\n`;
    const auditPath = join(process.cwd(), 'AUDIT_LOG.md');
    
    // Aggiungi al file markdown
    const markdownEntry = `
### ${timestamp} - ${operation}
- **Status**: ${status}
- **Data**: \`${JSON.stringify(data, null, 2)}\`
${user ? `- **User**: ${user}` : ''}

---
`;
    
    await appendFile(auditPath, markdownEntry);
    
    // Log anche in console per debug immediato
    console.log('📝 AUDIT:', logEntry);
    
  } catch (error) {
    console.error('🚨 AUDIT: Errore scrittura log:', error);
  }
}

// Funzione per verificare integrità database dopo modifiche
export async function verifyDatabaseIntegrity(sql: any): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Verifica esistenza tabelle critiche
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'roles', 'permissions', 'role_permissions', 'role_sections')
    `;
    
    const requiredTables = ['users', 'roles', 'permissions', 'role_permissions', 'role_sections'];
    const existingTables = tables.map((t: any) => t.table_name);
    
    for (const table of requiredTables) {
      if (!existingTables.includes(table)) {
        errors.push(`Missing critical table: ${table}`);
      }
    }

    // 2. Verifica integrità referenziale role_permissions
    const orphanedPermissions = await sql`
      SELECT rp.role_id, rp.permission_id 
      FROM role_permissions rp
      LEFT JOIN roles r ON r.id = rp.role_id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id IS NULL OR p.id IS NULL
    `;
    
    if (orphanedPermissions.length > 0) {
      errors.push(`Found ${orphanedPermissions.length} orphaned role_permissions records`);
    }

    // 3. Verifica integrità referenziale role_sections
    const orphanedSections = await sql`
      SELECT rs.role_id, rs.section_id 
      FROM role_sections rs
      LEFT JOIN roles r ON r.id = rs.role_id
      WHERE r.id IS NULL
    `;
    
    if (orphanedSections.length > 0) {
      errors.push(`Found ${orphanedSections.length} orphaned role_sections records`);
    }

    // 4. Verifica ruolo SuperAdmin esiste
    const superAdminRole = await sql`
      SELECT id FROM roles WHERE name = 'superadmin'
    `;
    
    if (superAdminRole.length === 0) {
      errors.push('Critical: SuperAdmin role not found');
    }

    // 5. Verifica permessi critici esistono
    const criticalPermissions = ['users.view', 'users.create', 'users.edit', 'users.delete'];
    const existingPermissions = await sql`
      SELECT name FROM permissions WHERE name = ANY(${criticalPermissions})
    `;
    
    const missingPermissions = criticalPermissions.filter(
      perm => !existingPermissions.some((ep: any) => ep.name === perm)
    );
    
    if (missingPermissions.length > 0) {
      warnings.push(`Missing permissions: ${missingPermissions.join(', ')}`);
    }

    // 6. Verifica duplicati
    const duplicateRoles = await sql`
      SELECT name, COUNT(*) as count 
      FROM roles 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateRoles.length > 0) {
      errors.push(`Duplicate roles found: ${duplicateRoles.map((r: any) => r.name).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    
  } catch (error) {
    errors.push(`Database integrity check failed: ${error}`);
    return {
      isValid: false,
      errors,
      warnings
    };
  }
}

// Funzione per creare alert nel Centro di Controllo
export function createSystemAlert(type: 'error' | 'warning' | 'info', message: string, details?: any): void {
  const alert = {
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  };
  
  // Emetti evento personalizzato per il Centro di Controllo
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('systemAlert', { detail: alert }));
  }
  
  console.log(`🚨 SYSTEM ALERT [${type.toUpperCase()}]:`, message, details);
}
