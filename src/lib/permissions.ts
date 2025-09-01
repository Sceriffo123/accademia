// Sistema di permessi gerarchico controllato dal SuperAdmin
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'normatives' | 'documents' | 'users' | 'education' | 'system' | 'reports';
  level: number; // 1=SuperAdmin, 2=Admin, 3=Operator, 4=User, 5=Guest
}

export interface RolePermissions {
  role: 'superadmin' | 'admin' | 'operator' | 'user' | 'guest';
  level: number;
  permissions: string[]; // Array di permission IDs
  canManageRoles: string[]; // Quali ruoli può gestire
  visibleSections: string[]; // Sezioni visibili nell'interfaccia
}

// Definizione delle autorizzazioni complete per tutti i moduli
export const PERMISSIONS: Permission[] = [
  // === GESTIONE NORMATIVE ===
  { id: 'normatives.view', name: 'Visualizza Normative', description: 'Può vedere le normative', category: 'normatives', level: 4 },
  { id: 'normatives.create', name: 'Crea Normative', description: 'Può creare nuove normative', category: 'normatives', level: 3 },
  { id: 'normatives.edit', name: 'Modifica Normative', description: 'Può modificare normative esistenti', category: 'normatives', level: 2 },
  { id: 'normatives.delete', name: 'Elimina Normative', description: 'Può eliminare normative', category: 'normatives', level: 2 },
  { id: 'normatives.publish', name: 'Pubblica Normative', description: 'Può pubblicare normative', category: 'normatives', level: 2 },

  // === GESTIONE DOCUMENTI ===
  { id: 'documents.view', name: 'Visualizza Documenti', description: 'Può vedere i documenti', category: 'documents', level: 4 },
  { id: 'documents.create', name: 'Crea Documenti', description: 'Può creare nuovi documenti', category: 'documents', level: 3 },
  { id: 'documents.edit', name: 'Modifica Documenti', description: 'Può modificare documenti esistenti', category: 'documents', level: 2 },
  { id: 'documents.delete', name: 'Elimina Documenti', description: 'Può eliminare documenti', category: 'documents', level: 2 },
  { id: 'documents.upload', name: 'Carica Documenti', description: 'Può caricare nuovi documenti', category: 'documents', level: 3 },

  // === GESTIONE UTENTI ===
  { id: 'users.view', name: 'Visualizza Utenti', description: 'Può vedere la lista utenti', category: 'users', level: 2 },
  { id: 'users.create', name: 'Crea Utenti', description: 'Può creare nuovi utenti', category: 'users', level: 2 },
  { id: 'users.edit', name: 'Modifica Utenti', description: 'Può modificare utenti esistenti', category: 'users', level: 2 },
  { id: 'users.delete', name: 'Elimina Utenti', description: 'Può eliminare utenti', category: 'users', level: 1 },
  { id: 'users.manage_roles', name: 'Gestisce Ruoli', description: 'Può modificare i ruoli utente', category: 'users', level: 1 },

  // === GESTIONE FORMAZIONE ===
  { id: 'education.view', name: 'Visualizza Corsi', description: 'Può vedere i corsi di formazione', category: 'education', level: 4 },
  { id: 'education.create', name: 'Crea Corsi', description: 'Può creare nuovi corsi', category: 'education', level: 2 },
  { id: 'education.edit', name: 'Modifica Corsi', description: 'Può modificare corsi esistenti', category: 'education', level: 2 },
  { id: 'education.delete', name: 'Elimina Corsi', description: 'Può eliminare corsi', category: 'education', level: 1 },
  { id: 'education.enroll', name: 'Iscrizione Corsi', description: 'Può iscriversi ai corsi', category: 'education', level: 4 },

  // === SISTEMA ===
  { id: 'system.settings', name: 'Impostazioni Sistema', description: 'Accesso alle impostazioni', category: 'system', level: 1 },
  { id: 'system.permissions', name: 'Gestione Permessi', description: 'Può modificare i permessi', category: 'system', level: 1 },
  { id: 'system.logs', name: 'Log Sistema', description: 'Può vedere i log di sistema', category: 'system', level: 2 },
  { id: 'system.backup', name: 'Backup Sistema', description: 'Può fare backup del sistema', category: 'system', level: 1 },

  // === REPORT ===
  { id: 'reports.view', name: 'Visualizza Report', description: 'Può vedere i report', category: 'reports', level: 3 },
  { id: 'reports.export', name: 'Esporta Report', description: 'Può esportare i report', category: 'reports', level: 2 },
  { id: 'reports.create', name: 'Crea Report', description: 'Può creare nuovi report', category: 'reports', level: 2 },
];

// Configurazione ruoli di default (modificabile dal SuperAdmin)
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'superadmin',
    level: 1,
    permissions: PERMISSIONS.map(p => p.id), // Tutti i permessi
    canManageRoles: ['admin', 'operator', 'user', 'guest'],
    visibleSections: ['dashboard', 'normatives', 'documents', 'education', 'users', 'admin', 'superadmin', 'reports', 'system']
  },
  {
    role: 'admin',
    level: 2,
    permissions: [
      'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish',
      'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.upload',
      'users.view', 'users.create', 'users.edit',
      'education.view', 'education.create', 'education.edit', 'education.enroll',
      'system.logs', 'reports.view', 'reports.export', 'reports.create'
    ],
    canManageRoles: ['operator', 'user'],
    visibleSections: ['dashboard', 'normatives', 'documents', 'education', 'users', 'admin', 'reports']
  },
  {
    role: 'operator',
    level: 3,
    permissions: [
      'normatives.view', 'normatives.create',
      'documents.view', 'documents.create', 'documents.upload',
      'education.view', 'education.enroll',
      'reports.view'
    ],
    canManageRoles: ['user'],
    visibleSections: ['dashboard', 'normatives', 'documents', 'education', 'reports']
  },
  {
    role: 'user',
    level: 4,
    permissions: [
      'normatives.view',
      'documents.view',
      'education.view', 'education.enroll'
    ],
    canManageRoles: [],
    visibleSections: ['dashboard', 'normatives', 'documents', 'education']
  },
  {
    role: 'guest',
    level: 5,
    permissions: [],
    canManageRoles: [],
    visibleSections: ['dashboard']
  }
];

// Raggruppa i permessi per categoria per la visualizzazione
export const PERMISSION_CATEGORIES = {
  'normatives': {
    name: 'Gestione Normative',
    description: 'Permessi per la gestione delle normative del trasporto pubblico locale',
    permissions: PERMISSIONS.filter(p => p.category === 'normatives')
  },
  'documents': {
    name: 'Gestione Documenti',
    description: 'Permessi per la gestione di documenti, template e modulistica',
    permissions: PERMISSIONS.filter(p => p.category === 'documents')
  },
  'users': {
    name: 'Gestione Utenti',
    description: 'Permessi per la gestione degli utenti del sistema',
    permissions: PERMISSIONS.filter(p => p.category === 'users')
  },
  'education': {
    name: 'Gestione Formazione',
    description: 'Permessi per la gestione dei corsi e della formazione',
    permissions: PERMISSIONS.filter(p => p.category === 'education')
  },
  'system': {
    name: 'Gestione Sistema',
    description: 'Permessi per la configurazione e amministrazione del sistema',
    permissions: PERMISSIONS.filter(p => p.category === 'system')
  },
  'reports': {
    name: 'Gestione Report',
    description: 'Permessi per la visualizzazione e creazione di report',
    permissions: PERMISSIONS.filter(p => p.category === 'reports')
  }
};

// Classe per gestire i permessi
export class PermissionManager {
  private rolePermissions: Map<string, RolePermissions> = new Map();

  constructor() {
    // Inizializza con i permessi di default
    DEFAULT_ROLE_PERMISSIONS.forEach(rp => {
      this.rolePermissions.set(rp.role, rp);
    });
  }

  // Verifica se un ruolo ha un permesso specifico
  hasPermission(userRole: string, permissionId: string): boolean {
    const rolePerms = this.rolePermissions.get(userRole);
    return rolePerms?.permissions.includes(permissionId) || false;
  }

  // Verifica se un ruolo può gestire un altro ruolo
  canManageRole(managerRole: string, targetRole: string): boolean {
    const rolePerms = this.rolePermissions.get(managerRole);
    return rolePerms?.canManageRoles.includes(targetRole) || false;
  }

  // Ottiene le sezioni visibili per un ruolo
  getVisibleSections(userRole: string): string[] {
    const rolePerms = this.rolePermissions.get(userRole);
    return rolePerms?.visibleSections || [];
  }

  // Ottiene tutti i permessi per un ruolo
  getRolePermissions(role: string): RolePermissions | undefined {
    return this.rolePermissions.get(role);
  }

  // Aggiorna i permessi di un ruolo (solo SuperAdmin)
  updateRolePermissions(role: string, permissions: RolePermissions): boolean {
    this.rolePermissions.set(role, permissions);
    return true;
  }

  // Ottiene tutti i ruoli gestibili da un ruolo
  getManagedRoles(managerRole: string): string[] {
    const rolePerms = this.rolePermissions.get(managerRole);
    return rolePerms?.canManageRoles || [];
  }

  // Ottiene i permessi per categoria
  getPermissionsByCategory(category: string): Permission[] {
    return PERMISSIONS.filter(p => p.category === category);
  }

  // Verifica se un utente può accedere a una sezione
  canAccessSection(userRole: string, section: string): boolean {
    const visibleSections = this.getVisibleSections(userRole);
    return visibleSections.includes(section);
  }
}

// Istanza globale del gestore permessi
export const permissionManager = new PermissionManager();