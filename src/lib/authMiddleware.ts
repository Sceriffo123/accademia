// Authentication and Authorization Middleware
import { AuthorizationManager, Role } from './rbac';
import { verifyToken } from './auth';
import { getUserById } from './neonDatabase';
import { debugLog } from './devTools';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: Role;
    is_active: boolean;
  } | null;
  isAuthenticated: boolean;
  permissions: {
    hasPermission: (resource: string, action: string, context?: Record<string, any>) => boolean;
    canAccessAdmin: (resource?: string) => boolean;
    canUseDevTools: (tool?: string) => boolean;
    getRoleLevel: () => number;
  };
}

export class AuthMiddleware {
  
  /**
   * Verifica il token e crea il contesto di autenticazione
   */
  static async createAuthContext(token?: string): Promise<AuthContext> {
    const defaultContext: AuthContext = {
      user: null,
      isAuthenticated: false,
      permissions: {
        hasPermission: () => false,
        canAccessAdmin: () => false,
        canUseDevTools: () => false,
        getRoleLevel: () => 0
      }
    };

    if (!token) {
      return defaultContext;
    }

    try {
      // Verifica token
      const tokenPayload = verifyToken(token);
      if (!tokenPayload) {
        debugLog('AUTH', 'Token non valido o scaduto');
        return defaultContext;
      }

      // Ottieni dati utente
      const user = await getUserById(tokenPayload.userId);
      if (!user) {
        debugLog('AUTH', 'Utente non trovato per token');
        return defaultContext;
      }

      // Verifica se l'utente è attivo
      const isActive = user.is_active !== false; // Default true se campo non esiste

      if (!isActive) {
        debugLog('AUTH', 'Utente disattivato:', user.email);
        return defaultContext;
      }

      // Crea contesto autenticato
      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role as Role,
          is_active: isActive
        },
        isAuthenticated: true,
        permissions: {
          hasPermission: (resource: string, action: string, context?: Record<string, any>) =>
            AuthorizationManager.hasPermission(user.role as Role, resource, action, context),
          
          canAccessAdmin: (resource?: string) =>
            resource 
              ? AuthorizationManager.canAccessAdminResource(user.role as Role, resource)
              : AuthorizationManager.hasPermission(user.role as Role, 'admin_panel', 'access'),
          
          canUseDevTools: (tool?: string) =>
            AuthorizationManager.canUseDevTools(user.role as Role, tool),
          
          getRoleLevel: () => AuthorizationManager.getRoleLevel(user.role as Role)
        }
      };

    } catch (error) {
      debugLog('AUTH', 'Errore creazione contesto auth:', error);
      return defaultContext;
    }
  }

  /**
   * Middleware per proteggere le route che richiedono autenticazione
   */
  static requireAuth() {
    return async (authContext: AuthContext): Promise<boolean> => {
      if (!authContext.isAuthenticated) {
        debugLog('AUTH', 'Accesso negato: utente non autenticato');
        return false;
      }
      return true;
    };
  }

  /**
   * Middleware per proteggere le route che richiedono un ruolo specifico
   */
  static requireRole(requiredRole: Role) {
    return async (authContext: AuthContext): Promise<boolean> => {
      if (!authContext.isAuthenticated || !authContext.user) {
        debugLog('AUTH', 'Accesso negato: utente non autenticato');
        return false;
      }

      const userLevel = AuthorizationManager.getRoleLevel(authContext.user.role);
      const requiredLevel = AuthorizationManager.getRoleLevel(requiredRole);

      if (userLevel < requiredLevel) {
        debugLog('AUTH', `Accesso negato: ruolo ${authContext.user.role} insufficiente per ${requiredRole}`);
        return false;
      }

      return true;
    };
  }

  /**
   * Middleware per proteggere le route che richiedono un permesso specifico
   */
  static requirePermission(resource: string, action: string, context?: Record<string, any>) {
    return async (authContext: AuthContext): Promise<boolean> => {
      if (!authContext.isAuthenticated || !authContext.user) {
        debugLog('AUTH', 'Accesso negato: utente non autenticato');
        return false;
      }

      const hasPermission = authContext.permissions.hasPermission(resource, action, context);
      
      if (!hasPermission) {
        debugLog('AUTH', `Accesso negato: permesso ${action} su ${resource} mancante per ${authContext.user.role}`);
        return false;
      }

      return true;
    };
  }

  /**
   * Middleware per l'accesso al pannello admin
   */
  static requireAdminAccess(resource?: string) {
    return async (authContext: AuthContext): Promise<boolean> => {
      if (!authContext.isAuthenticated || !authContext.user) {
        debugLog('AUTH', 'Accesso negato: utente non autenticato');
        return false;
      }

      const canAccess = authContext.permissions.canAccessAdmin(resource);
      
      if (!canAccess) {
        debugLog('AUTH', `Accesso negato al pannello admin${resource ? ` (${resource})` : ''} per ${authContext.user.role}`);
        return false;
      }

      return true;
    };
  }

  /**
   * Middleware per l'accesso agli strumenti di sviluppo
   */
  static requireDevToolsAccess(tool?: string) {
    return async (authContext: AuthContext): Promise<boolean> => {
      if (!authContext.isAuthenticated || !authContext.user) {
        debugLog('AUTH', 'Accesso negato: utente non autenticato');
        return false;
      }

      const canAccess = authContext.permissions.canUseDevTools(tool);
      
      if (!canAccess) {
        debugLog('AUTH', `Accesso negato agli strumenti di sviluppo${tool ? ` (${tool})` : ''} per ${authContext.user.role}`);
        return false;
      }

      return true;
    };
  }

  /**
   * Filtra elementi basandosi sui permessi dell'utente
   */
  static filterByPermissions<T>(
    items: T[],
    authContext: AuthContext,
    resource: string,
    action: string,
    getContext?: (item: T) => Record<string, any>
  ): T[] {
    if (!authContext.isAuthenticated || !authContext.user) {
      return [];
    }

    return AuthorizationManager.filterByPermissions(
      items,
      authContext.user.role,
      resource,
      action,
      getContext
    );
  }

  /**
   * Registra un tentativo di accesso nel log di audit
   */
  static async logAuthAttempt(
    userId: string | null,
    action: string,
    resource: string,
    granted: boolean,
    reason?: string,
    metadata?: {
      ip_address?: string;
      user_agent?: string;
    }
  ): Promise<void> {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL!);

      await sql`
        INSERT INTO auth_audit_log (
          user_id, action, resource, granted, reason, ip_address, user_agent
        ) VALUES (
          ${userId}, ${action}, ${resource}, ${granted}, ${reason || null},
          ${metadata?.ip_address || null}, ${metadata?.user_agent || null}
        )
      `;

      debugLog('AUTH', `Audit log: ${action} su ${resource} ${granted ? 'concesso' : 'negato'} per utente ${userId}`);
    } catch (error) {
      debugLog('AUTH', 'Errore scrittura audit log:', error);
    }
  }

  /**
   * Wrapper per eseguire azioni con controllo permessi e audit
   */
  static async executeWithPermissionCheck<T>(
    authContext: AuthContext,
    resource: string,
    action: string,
    operation: () => Promise<T>,
    context?: Record<string, any>,
    metadata?: { ip_address?: string; user_agent?: string }
  ): Promise<T> {
    const hasPermission = authContext.permissions.hasPermission(resource, action, context);
    
    // Log del tentativo
    await this.logAuthAttempt(
      authContext.user?.id || null,
      action,
      resource,
      hasPermission,
      hasPermission ? 'Permesso concesso' : 'Permesso insufficiente',
      metadata
    );

    if (!hasPermission) {
      throw new Error(`Accesso negato: permesso ${action} su ${resource} richiesto`);
    }

    return await operation();
  }
}

// Hook React per utilizzare il middleware
export function useAuthMiddleware() {
  return {
    requireAuth: AuthMiddleware.requireAuth,
    requireRole: AuthMiddleware.requireRole,
    requirePermission: AuthMiddleware.requirePermission,
    requireAdminAccess: AuthMiddleware.requireAdminAccess,
    requireDevToolsAccess: AuthMiddleware.requireDevToolsAccess,
    filterByPermissions: AuthMiddleware.filterByPermissions,
    executeWithPermissionCheck: AuthMiddleware.executeWithPermissionCheck
  };
}
