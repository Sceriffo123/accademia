// Sistema di permessi completamente basato su database Neon
// Questo file contiene solo le interfacce TypeScript e utility

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  created_at: string;
}

export interface RolePermissions {
  role: string;
  permissions: string[];
  sections: string[];
}

// Utility per raggruppare permessi per categoria (solo per UI)
export function groupPermissionsByCategory(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((groups, permission) => {
    const category = permission.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);
}

// Utility per ottenere il nome visualizzato di una categoria
export function getCategoryDisplayName(category: string): string {
  switch (category) {
    case 'normatives': return 'Gestione Normative';
    case 'documents': return 'Gestione Documenti';
    case 'users': return 'Gestione Utenti';
    case 'education': return 'Gestione Formazione';
    case 'system': return 'Gestione Sistema';
    case 'reports': return 'Gestione Report';
    default: return category;
  }
}

// Utility per ottenere la descrizione di una categoria
export function getCategoryDescription(category: string): string {
  switch (category) {
    case 'normatives': return 'Permessi per la gestione delle normative del trasporto pubblico locale';
    case 'documents': return 'Permessi per la gestione di documenti, template e modulistica';
    case 'users': return 'Permessi per la gestione degli utenti del sistema';
    case 'education': return 'Permessi per la gestione dei corsi e della formazione';
    case 'system': return 'Permessi per la configurazione e amministrazione del sistema';
    case 'reports': return 'Permessi per la visualizzazione e creazione di report';
    default: return 'Permessi di sistema';
  }
}

// Utility per ottenere il colore del ruolo
export function getRoleColor(role: string): string {
  switch (role) {
    case 'superadmin': return 'bg-purple-100 text-purple-800';
    case 'admin': return 'bg-red-100 text-red-800';
    case 'operator': return 'bg-yellow-100 text-yellow-800';
    case 'user': return 'bg-blue-100 text-blue-800';
    case 'guest': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Utility per ottenere il nome visualizzato del ruolo
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'superadmin': return 'Super Amministratore';
    case 'admin': return 'Amministratore';
    case 'operator': return 'Operatore';
    case 'user': return 'Utente';
    case 'guest': return 'Ospite';
    default: return role;
  }
}