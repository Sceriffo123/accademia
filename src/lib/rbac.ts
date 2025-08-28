// Role-Based Access Control (RBAC) System
// Sistema di autorizzazioni scalabile basato su gerarchia di ruoli

export type Role = 'super_admin' | 'admin' | 'operator' | 'user' | 'guest';

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RoleDefinition {
  name: Role;
  level: number; // Livello gerarchico (più alto = più permessi)
  permissions: Permission[];
  inheritsFrom?: Role[]; // Ruoli da cui eredita i permessi
}

// Definizione della gerarchia dei ruoli
export const ROLE_HIERARCHY: Record<Role, RoleDefinition> = {
  super_admin: {
    name: 'super_admin',
    level: 100,
    permissions: [
      { resource: '*', action: '*' }, // Accesso completo a tutto
    ]
  },
  
  admin: {
    name: 'admin',
    level: 80,
    permissions: [
      // Gestione utenti
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      
      // Gestione normative
      { resource: 'normatives', action: 'create' },
      { resource: 'normatives', action: 'read' },
      { resource: 'normatives', action: 'update' },
      { resource: 'normatives', action: 'delete' },
      
      // Accesso pannello admin
      { resource: 'admin_panel', action: 'access' },
      { resource: 'admin_panel', action: 'users_tab' },
      { resource: 'admin_panel', action: 'normatives_tab' },
      
      // Strumenti di sviluppo (limitati)
      { resource: 'dev_tools', action: 'inspect_database' },
      { resource: 'dev_tools', action: 'validate_structure' },
    ]
  },
  
  operator: {
    name: 'operator',
    level: 60,
    permissions: [
      // Solo lettura utenti
      { resource: 'users', action: 'read' },
      
      // Gestione normative
      { resource: 'normatives', action: 'create' },
      { resource: 'normatives', action: 'read' },
      { resource: 'normatives', action: 'update' },
      
      // Accesso limitato pannello admin
      { resource: 'admin_panel', action: 'access' },
      { resource: 'admin_panel', action: 'normatives_tab' },
    ]
  },
  
  user: {
    name: 'user',
    level: 40,
    permissions: [
      // Solo lettura normative
      { resource: 'normatives', action: 'read' },
      
      // Gestione proprio profilo
      { resource: 'profile', action: 'read', conditions: { own: true } },
      { resource: 'profile', action: 'update', conditions: { own: true } },
    ]
  },
  
  guest: {
    name: 'guest',
    level: 20,
    permissions: [
      // Solo lettura limitata
      { resource: 'normatives', action: 'read', conditions: { public: true } },
    ]
  }
};

// Classe per la gestione delle autorizzazioni
export class AuthorizationManager {
  
  /**
   * Verifica se un ruolo ha un permesso specifico
   */
  static hasPermission(
    userRole: Role, 
    resource: string, 
    action: string, 
    context?: Record<string, any>
  ): boolean {
    const roleDefinition = ROLE_HIERARCHY[userRole];
    if (!roleDefinition) return false;

    // Super admin ha accesso a tutto
    if (userRole === 'super_admin') return true;

    // Controlla permessi diretti
    for (const permission of roleDefinition.permissions) {
      if (this.matchesPermission(permission, resource, action, context)) {
        return true;
      }
    }

    // Controlla permessi ereditati
    if (roleDefinition.inheritsFrom) {
      for (const inheritedRole of roleDefinition.inheritsFrom) {
        if (this.hasPermission(inheritedRole, resource, action, context)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Verifica se un permesso corrisponde alla richiesta
   */
  private static matchesPermission(
    permission: Permission,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Wildcard per risorsa
    if (permission.resource === '*') return true;
    
    // Wildcard per azione
    if (permission.resource === resource && permission.action === '*') return true;
    
    // Match esatto
    if (permission.resource === resource && permission.action === action) {
      // Verifica condizioni se presenti
      if (permission.conditions && context) {
        return this.checkConditions(permission.conditions, context);
      }
      return true;
    }

    return false;
  }

  /**
   * Verifica le condizioni del permesso
   */
  private static checkConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Ottiene tutti i permessi per un ruolo
   */
  static getRolePermissions(role: Role): Permission[] {
    const roleDefinition = ROLE_HIERARCHY[role];
    if (!roleDefinition) return [];

    let permissions = [...roleDefinition.permissions];

    // Aggiungi permessi ereditati
    if (roleDefinition.inheritsFrom) {
      for (const inheritedRole of roleDefinition.inheritsFrom) {
        permissions = [...permissions, ...this.getRolePermissions(inheritedRole)];
      }
    }

    return permissions;
  }

  /**
   * Verifica se un ruolo può accedere a una risorsa admin
   */
  static canAccessAdminResource(role: Role, resource: string): boolean {
    return this.hasPermission(role, 'admin_panel', resource);
  }

  /**
   * Verifica se un ruolo può utilizzare strumenti di sviluppo
   */
  static canUseDevTools(role: Role, tool?: string): boolean {
    if (tool) {
      return this.hasPermission(role, 'dev_tools', tool);
    }
    return this.hasPermission(role, 'dev_tools', 'access');
  }

  /**
   * Ottiene il livello gerarchico di un ruolo
   */
  static getRoleLevel(role: Role): number {
    return ROLE_HIERARCHY[role]?.level || 0;
  }

  /**
   * Verifica se un ruolo è superiore a un altro nella gerarchia
   */
  static isRoleHigher(role1: Role, role2: Role): boolean {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }

  /**
   * Filtra una lista di elementi basandosi sui permessi
   */
  static filterByPermissions<T>(
    items: T[],
    userRole: Role,
    resource: string,
    action: string,
    getContext?: (item: T) => Record<string, any>
  ): T[] {
    return items.filter(item => {
      const context = getContext ? getContext(item) : undefined;
      return this.hasPermission(userRole, resource, action, context);
    });
  }
}

// Hook per React per verificare i permessi
export function usePermissions(userRole: Role) {
  return {
    hasPermission: (resource: string, action: string, context?: Record<string, any>) =>
      AuthorizationManager.hasPermission(userRole, resource, action, context),
    
    canAccessAdmin: (resource?: string) =>
      resource 
        ? AuthorizationManager.canAccessAdminResource(userRole, resource)
        : AuthorizationManager.hasPermission(userRole, 'admin_panel', 'access'),
    
    canUseDevTools: (tool?: string) =>
      AuthorizationManager.canUseDevTools(userRole, tool),
    
    getRoleLevel: () => AuthorizationManager.getRoleLevel(userRole),
    
    isHigherThan: (otherRole: Role) =>
      AuthorizationManager.isRoleHigher(userRole, otherRole)
  };
}

// Middleware per proteggere le route
export function requirePermission(
  resource: string,
  action: string,
  context?: Record<string, any>
) {
  return (userRole: Role): boolean => {
    return AuthorizationManager.hasPermission(userRole, resource, action, context);
  };
}

// Decoratori per le funzioni che richiedono autorizzazioni
export function withPermission(
  resource: string,
  action: string,
  context?: Record<string, any>
) {
  return function<T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = function(this: any, ...args: any[]) {
      const userRole = this.userRole || args[0]?.userRole;
      
      if (!AuthorizationManager.hasPermission(userRole, resource, action, context)) {
        throw new Error(`Accesso negato: permesso ${action} su ${resource} richiesto`);
      }
      
      return originalMethod.apply(this, args);
    } as T;
    
    return descriptor;
  };
}
