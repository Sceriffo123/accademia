// Browser-compatible audit logging (no fs/promises)

interface AuditLogEntry {
  timestamp: string;
  operation: string;
  status: 'SUCCESS' | 'ERROR' | 'VERIFICATION_FAILED' | 'WARNING';
  data: any;
  user?: string;
}

// Browser-compatible audit logging using localStorage and console
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

    // Store in localStorage for persistence
    const existingLogs = localStorage.getItem('auditLogs') || '[]';
    const logs = JSON.parse(existingLogs);
    logs.push(logEntry);
    
    // Keep only last 1000 entries to prevent storage overflow
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    localStorage.setItem('auditLogs', JSON.stringify(logs));

    // AGGIUNTA: Salva anche nel database Neon activity_logs
    try {
      const { sql } = await import('./neonDatabase');
      await sql`
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
        VALUES (
          ${user || null},
          ${operation},
          'audit_log',
          ${null},
          ${JSON.stringify({
            status,
            data,
            timestamp
          })}
        )
      `;
      console.log('📝 AUDIT: Log salvato anche nel database Neon');
    } catch (dbError) {
      console.warn('⚠️ AUDIT: Errore salvataggio database (continuando solo localStorage):', dbError);
    }
    
    // Log in console with structured format
    const statusEmoji = {
      'SUCCESS': '✅',
      'ERROR': '🚨',
      'VERIFICATION_FAILED': '⚠️',
      'WARNING': '🟡'
    };
    
    console.log(`📝 AUDIT ${statusEmoji[status]} [${operation}]:`, {
      timestamp,
      status,
      data,
      user
    });
    
    // Also send to any listening components via custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auditLog', { 
        detail: logEntry 
      }));
    }
    
  } catch (error) {
    console.error('🚨 AUDIT: Errore scrittura log:', error);
  }
}

// Funzione per recuperare log di audit dal localStorage
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const logs = localStorage.getItem('auditLogs') || '[]';
    return JSON.parse(logs);
  } catch (error) {
    console.error('🚨 AUDIT: Errore lettura log:', error);
    return [];
  }
}

// Funzione per esportare log di audit come file
export function exportAuditLogs(): void {
  try {
    const logs = getAuditLogs();
    const markdown = generateMarkdownReport(logs);
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📝 AUDIT: Log esportati come file markdown');
  } catch (error) {
    console.error('🚨 AUDIT: Errore export log:', error);
  }
}

// Genera report markdown dai log
function generateMarkdownReport(logs: AuditLogEntry[]): string {
  const header = `# Audit Log Report
Generated: ${new Date().toISOString()}
Total Entries: ${logs.length}

---

`;

  const entries = logs.map(log => `
### ${log.timestamp} - ${log.operation}
- **Status**: ${log.status}
- **Data**: \`${JSON.stringify(log.data, null, 2)}\`
${log.user ? `- **User**: ${log.user}` : ''}

---
`).join('');

  return header + entries;
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
