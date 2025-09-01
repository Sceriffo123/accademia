import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DatabaseTableViewer from '../components/DatabaseTableViewer';
import { 
  getAllUsers,
  getAllPermissionsFromDB,
  getAllRolesFromDB,
  getAllSectionsFromDB,
  getPermissionsMatrixFromDB,
  updateRolePermissionInDB,
  updateRoleSectionInDB,
  initializePermissionsSystem,
  seedPermissionsData,
  getUsersCount,
  getNormativesCount,
  getDocumentsCount,
  getAllTables,
  getTableRecords,
  getTableStructure
} from '../lib/neonDatabase';
import { 
  groupPermissionsByCategory,
  getCategoryDisplayName,
  getCategoryDescription,
  getRoleColor,
  getRoleDisplayName,
  type Permission,
  type Role,
  type Section
} from '../lib/permissions';
import { 
  Crown, 
  Users, 
  Shield, 
  Database, 
  Settings, 
  Lock, 
  Unlock,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export default function SuperAdmin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'permissions' | 'users' | 'database' | 'system'>('permissions');
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalNormatives: 0,
    totalDocuments: 0
  });
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableStructure, setTableStructure] = useState<any[]>([]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    full_name: '',
    role: 'user' as 'user' | 'admin' | 'superadmin' | 'operator'
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [initializingSystem, setInitializingSystem] = useState(false);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      loadAllData();
    }
  }, [profile]);

  async function loadAllData() {
    setLoading(true);
    try {
      await Promise.all([
        loadUsersData(),
        loadPermissionsData(),
        loadStatsData(),
        loadTablesData()
      ]);
    } catch (error) {
      console.error('Errore caricamento dati SuperAdmin:', error);
      setError('Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsersData() {
    try {
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
    }
  }

  async function loadPermissionsData() {
    try {
      const permissionsData = await getAllPermissionsFromDB();
      const rolesData = await getAllRolesFromDB();
      const sectionsData = await getAllSectionsFromDB();
      const matrix = await getPermissionsMatrixFromDB();
      
      setPermissions(permissionsData);
      setRoles(rolesData);
      setSections(sectionsData);
      setRoleMatrix(matrix);
    } catch (error) {
      console.error('Errore caricamento permessi:', error);
    }
  }

  async function loadStatsData() {
    try {
      const [totalUsers, totalNormatives, totalDocuments] = await Promise.all([
        getUsersCount(),
        getNormativesCount(),
        getDocumentsCount()
      ]);
      setStats({ totalUsers, totalNormatives, totalDocuments });
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    }
  }

  async function loadTablesData() {
    try {
      const tablesData = await getAllTables();
      setTables(tablesData);
    } catch (error) {
      console.error('Errore caricamento tabelle:', error);
    }
  }

  async function handlePermissionToggle(role: string, permission: string, granted: boolean) {
    try {
      await updateRolePermissionInDB(role, permission, granted);
      await loadPermissionsData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore aggiornamento permesso:', error);
    }
  }

  async function handleSectionToggle(role: string, section: string, granted: boolean) {
    try {
      await updateRoleSectionInDB(role, section, granted);
      await loadPermissionsData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore aggiornamento sezione:', error);
    }
  }

  async function handleViewTable(tableName: string) {
    try {
      setSelectedTable(tableName);
      const [data, structure] = await Promise.all([
        getTableRecords(tableName, 1000),
        getTableStructure(tableName)
      ]);
      setTableData(data);
      setTableStructure(structure);
      setShowTableModal(true);
    } catch (error) {
      console.error('Errore caricamento dati tabella:', error);
    }
  }

  function handleEditUser(user: any) {
    setEditingUser(user);
    setUserFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role
    });
    setShowEditUserModal(true);
  }

  async function handleSaveUser() {
    if (!editingUser) return;
    
    try {
      const { updateUser } = await import('../lib/neonDatabase');
      await updateUser(editingUser.id, userFormData);
      await loadUsersData(); // Ricarica la lista utenti
      setShowEditUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Errore aggiornamento utente:', error);
      setError('Errore durante l\'aggiornamento dell\'utente');
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;
    
    try {
      const { deleteUser } = await import('../lib/neonDatabase');
      await deleteUser(userId);
      await loadUsersData(); // Ricarica la lista utenti
    } catch (error) {
      console.error('Errore eliminazione utente:', error);
      setError('Errore durante l\'eliminazione dell\'utente');
    }
  }

  function toggleCategory(category: string) {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  }

  function getMenuIcon(sectionName: string): string {
    switch (sectionName) {
      case 'dashboard': return '🏠';
      case 'normatives': return '📋';
      case 'documents': return '📄';
      case 'docx': return '📄';
      case 'education': return '🎓';
      case 'users': return '👥';
      case 'admin': return '⚙️';
      case 'superadmin': return '👑';
      case 'reports': return '📊';
      default: return '📁';
    }
  }

  async function handleBulkSectionUpdate(action: 'enable' | 'disable') {
    if (!confirm(`Sei sicuro di voler ${action === 'enable' ? 'abilitare' : 'disabilitare'} tutti i menu per tutti i ruoli?`)) {
      return;
    }

    try {
      const visible = action === 'enable';
      
      for (const role of roles) {
        for (const section of sections) {
          await handleSectionToggle(role.name, section.name, visible);
        }
      }
      
      await loadPermissionsData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore aggiornamento bulk sezioni:', error);
    }
  }

  async function handleBulkPermissionUpdate(action: 'enable' | 'disable') {
    if (!confirm(`Sei sicuro di voler ${action === 'enable' ? 'abilitare' : 'disabilitare'} tutti i permessi per tutti i ruoli?`)) {
      return;
    }

    try {
      const granted = action === 'enable';
      
      for (const role of roles) {
        for (const permission of permissions) {
          await handlePermissionToggle(role.name, permission.name, granted);
        }
      }
      
      await loadPermissionsData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore aggiornamento bulk permessi:', error);
    }
  }

  async function handleRoleMenuToggle(roleName: string) {
    try {
      // Controlla se il ruolo ha già tutti i menu abilitati
      const roleData = roleMatrix.get(roleName);
      const currentSections = roleData?.sections || [];
      const allSectionsEnabled = sections.every(s => currentSections.includes(s.name));
      
      // Se tutti abilitati, disabilita tutto; altrimenti abilita tutto
      const newState = !allSectionsEnabled;
      
      for (const section of sections) {
        await handleSectionToggle(roleName, section.name, newState);
      }
      
      await loadPermissionsData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore toggle menu ruolo:', error);
    }
  }
  const roleNames = roles.map(r => r.name);
  const sectionNames = sections.map(s => s.name);

  const hasPermission = (role: string, permissionId: string): boolean => {
    const roleData = roleMatrix.get(role);
    return roleData?.permissions?.includes(permissionId) || false;
  };

  const hasSection = (role: string, section: string): boolean => {
    const roleData = roleMatrix.get(role);
    return roleData?.sections?.includes(section) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Errore</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Crown className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Super Amministratore
              </h1>
              <p className="text-gray-600">
                Gestione completa del sistema, permessi e configurazioni
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Utenti Totali</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Database className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Normative</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalNormatives}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Documenti</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'permissions', label: 'Gestione Permessi', icon: Shield },
                { id: 'users', label: 'Gestione Utenti', icon: Users },
                { id: 'database', label: 'Database', icon: Database },
                { id: 'system', label: 'Sistema', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Gestione Menu e Permessi
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Gestisci la visibilità dei menu e i permessi specifici per ogni ruolo
                  </p>
                </div>

                {/* Menu Management Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        🎛️ Gestione Menu di Navigazione
                      </h4>
                      <p className="text-gray-600">
                        Controlla quali sezioni dell'interfaccia sono visibili per ogni ruolo
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBulkSectionUpdate('enable')}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Abilita Tutto</span>
                      </button>
                      <button
                        onClick={() => handleBulkSectionUpdate('disable')}
                        className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <X className="h-4 w-4" />
                        <span>Disabilita Tutto</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4">
                          <h5 className="font-medium text-gray-900">Menu / Sezione</h5>
                        </div>
                        {roles.map(role => (
                          <div key={role.name} className="col-span-2 text-center">
                            <div className="flex flex-col items-center space-y-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.name)}`}>
                                {getRoleDisplayName(role.name)}
                              </span>
                              <button
                                onClick={() => handleRoleMenuToggle(role.name)}
                                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                Toggle All
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sezioni */}
                    <div className="divide-y divide-gray-100">
                      {sections.map((section) => (
                        <div key={section.name} className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-gray-50">
                          <div className="col-span-4">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">
                                {getMenuIcon(section.name)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {section.display_name}
                                </div>
                                {section.description && (
                                  <div className="text-xs text-gray-500">
                                    {section.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {roles.map(role => {
                            const visible = hasSection(role.name, section.name);
                            return (
                              <div key={role.name} className="col-span-2 text-center">
                                <button
                                  onClick={() => handleSectionToggle(role.name, section.name, !visible)}
                                  className={`p-3 rounded-xl transition-all transform hover:scale-105 ${
                                    visible 
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200 shadow-sm' 
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                  title={visible ? `Nascondi ${section.display_name} per ${getRoleDisplayName(role.name)}` : `Mostra ${section.display_name} per ${getRoleDisplayName(role.name)}`}
                                >
                                  {visible ? <Eye className="h-5 w-5" /> : <X className="h-5 w-5" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Permissions Matrix */}
                <div className="overflow-x-auto mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        🔐 Matrice Permessi Dettagliati
                      </h4>
                      <p className="text-gray-600">
                        Gestisci i permessi specifici per ogni ruolo del sistema
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBulkPermissionUpdate('enable')}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Abilita Tutto</span>
                      </button>
                      <button
                        onClick={() => handleBulkPermissionUpdate('disable')}
                        className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <X className="h-4 w-4" />
                        <span>Disabilita Tutto</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {/* Header con ruoli */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4">
                          <h4 className="font-medium text-gray-900">Permesso</h4>
                        </div>
                        {roles.map(role => (
                          <div key={role.name} className="col-span-2 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(role.name)}`}>
                              {getRoleDisplayName(role.name)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Categorie di permessi */}
                    {Object.entries(groupPermissionsByCategory(permissions)).map(([categoryKey, categoryPermissions]) => (
                      <div key={categoryKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* Header categoria */}
                        <button
                          onClick={() => toggleCategory(categoryKey)}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            {expandedCategories.has(categoryKey) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-900">{getCategoryDisplayName(categoryKey)}</h3>
                              <p className="text-sm text-gray-600">{getCategoryDescription(categoryKey)}</p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {categoryPermissions.length} permessi
                          </span>
                        </button>

                        {/* Permessi della categoria */}
                        {expandedCategories.has(categoryKey) && (
                          <div className="border-t border-gray-200">
                            {categoryPermissions.map((permission) => (
                              <div key={permission.id} className="grid grid-cols-12 gap-4 items-center p-4 border-b border-gray-100 hover:bg-gray-50">
                                <div className="col-span-4">
                                  <div className="font-medium text-gray-900 text-sm">
                                    {permission.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {permission.description}
                                  </div>
                                </div>
                                {roles.map(role => {
                                  const granted = hasPermission(role.name, permission.name);
                                  return (
                                    <div key={role.name} className="col-span-2 text-center">
                                      <button
                                        onClick={() => handlePermissionToggle(role.name, permission.name, !granted)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          granted 
                                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        }`}
                                        title={granted ? 'Rimuovi permesso' : 'Concedi permesso'}
                                      >
                                        {granted ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Gestione Utenti ({users.length})
                  </h3>
                  <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    <Plus className="h-4 w-4" />
                    <span>Nuovo Utente</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ruolo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Registrato</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{user.full_name}</td>
                          <td className="px-4 py-3 text-gray-600">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                              {getRoleDisplayName(user.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {new Date(user.created_at).toLocaleDateString('it-IT')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button 
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifica utente"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              {user.role !== 'superadmin' && (
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Elimina utente"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Database Tab */}
            {activeTab === 'database' && (
              <DatabaseTableViewer />
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Configurazioni Sistema
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Informazioni Sistema</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Versione:</span>
                        <span className="font-medium">1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Database:</span>
                        <span className="font-medium">Neon PostgreSQL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ambiente:</span>
                        <span className="font-medium">Sviluppo</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Azioni Sistema</h4>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <Download className="h-4 w-4" />
                        <span>Backup Database</span>
                      </button>
                      <button className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <Upload className="h-4 w-4" />
                        <span>Ripristina Backup</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Modal */}
      {showTableModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Tabella: {selectedTable}
              </h3>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              {/* Table Structure */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Struttura Tabella</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Colonna</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Tipo</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Nullable</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableStructure.map((column, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="px-3 py-2 font-medium">{column.column_name}</td>
                          <td className="px-3 py-2 text-gray-600">{column.data_type}</td>
                          <td className="px-3 py-2 text-gray-600">{column.is_nullable}</td>
                          <td className="px-3 py-2 text-gray-600">{column.column_default || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Data */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Dati Tabella ({tableData.length} record)
                </h4>
                {tableData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(tableData[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left font-medium text-gray-700">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 text-gray-600 max-w-xs truncate">
                                {value?.toString() || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Nessun dato nella tabella</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Modifica Utente
              </h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({...userFormData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ruolo
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({...userFormData, role: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="user">Utente</option>
                  <option value="operator">Operatore</option>
                  <option value="admin">Amministratore</option>
                  <option value="superadmin">Super Amministratore</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salva</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}