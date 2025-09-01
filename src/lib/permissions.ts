// Sistema di permessi gerarchico controllato dal SuperAdmin
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'normatives' | 'system' | 'reports';
  level: number; // 1=SuperAdmin, 2=Admin, 3=Operator, 4=User, 5=Guest
}

export interface RolePermissions {
  role: 'superadmin' | 'admin' | 'operator' | 'user' | 'guest';
  level: number;
  permissions: string[]; // Array di permission IDs
  canManageRoles: string[]; // Quali ruoli può gestire
  visibleSections: string[]; // Sezioni visibili nell'interfaccia
}

// Definizione delle autorizzazioni base
export const PERMISSIONS: Permission[] = [
  // Gestione Utenti
  { id: 'users.view', name: 'Visualizza Utenti', description: 'Può vedere la lista utenti', category: 'users', level: 2 },
  { id: 'users.create', name: 'Crea Utenti', description: 'Può creare nuovi utenti', category: 'users', level: 2 },
  { id: 'users.edit', name: 'Modifica Utenti', description: 'Può modificare utenti esistenti', category: 'users', level: 2 },
  { id: 'users.delete', name: 'Elimina Utenti', description: 'Può eliminare utenti', category: 'users', level: 1 },
  { id: 'users.manage_roles', name: 'Gestisce Ruoli', description: 'Può modificare i ruoli utente', category: 'users', level: 1 },
  
  // Gestione Normative
  { id: 'normatives.view', name: 'Visualizza Normative', description: 'Può vedere le normative', category: 'normatives', level: 4 },
  { id: 'normatives.create', name: 'Crea Normative', description: 'Può creare nuove normative', category: 'normatives', level: 3 },
  { id: 'normatives.edit', name: 'Modifica Normative', description: 'Può modificare normative', category: 'normatives', level: 2 },
  { id: 'normatives.delete', name: 'Elimina Normative', description: 'Può eliminare normative', category: 'normatives', level: 2 },
  { id: 'normatives.publish', name: 'Pubblica Normative', description: 'Può pubblicare normative', category: 'normatives', level: 2 },
  
  // Sistema
  { id: 'system.settings', name: 'Impostazioni Sistema', description: 'Accesso alle impostazioni', category: 'system', level: 1 },
  { id: 'system.permissions', name: 'Gestione Permessi', description: 'Può modificare i permessi', category: 'system', level: 1 },
  { id: 'system.logs', name: 'Log Sistema', description: 'Può vedere i log di sistema', category: 'system', level: 2 },
  
  // Report
  { id: 'reports.view', name: 'Visualizza Report', description: 'Può vedere i report', category: 'reports', level: 3 },
  { id: 'reports.export', name: 'Esporta Report', description: 'Può esportare i report', category: 'reports', level: 2 },
];

// Configurazione ruoli di default (modificabile dal SuperAdmin)
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'superadmin',
    level: 1,
    permissions: PERMISSIONS.map(p => p.id), // Tutti i permessi
    canManageRoles: ['admin', 'operator', 'user', 'guest'],
    visibleSections: ['dashboard', 'users', 'normatives', 'education', 'admin', 'superadmin', 'reports', 'settings']
  },
  {
    role: 'admin',
    level: 2,
    permissions: [
      'users.view', 'users.create', 'users.edit',
      'normatives.view', 'normatives.create', 'normatives.edit', 'normatives.delete', 'normatives.publish',
      'system.logs', 'reports.view', 'reports.export'
    ],
    canManageRoles: ['operator', 'user'],
    visibleSections: ['dashboard', 'users', 'normatives', 'education', 'admin', 'reports']
  },
  {
    role: 'operator',
    level: 3,
    permissions: [
      'normatives.view', 'normatives.create',
      'reports.view'
    ],
    canManageRoles: ['user'],
    visibleSections: ['dashboard', 'normatives', 'education', 'reports']
  },
  {
    role: 'user',
    level: 4,
    permissions: ['normatives.view'],
    canManageRoles: [],
    visibleSections: ['dashboard', 'normatives', 'education']
  },
  {
    role: 'guest',
    level: 5,
    permissions: [],
    canManageRoles: [],
    visibleSections: ['dashboard']
  }
];

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