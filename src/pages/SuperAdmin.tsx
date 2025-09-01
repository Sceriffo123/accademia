import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllUsers, 
  getAllPermissions, 
  getRolePermissionsMatrix,
  updateRolePermission,
  updateRoleSection,
  getUsersCount,
  getNormativesCount,
  getDocumentsCount,
  getAllTables,
  getTableRecords,
  getTableStructure
} from '../lib/neonDatabase';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
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
  RefreshCw
} from 'lucide-react';

interface PermissionMatrix {
  [role: string]: {
    permissions: string[];
    sections: string[];
  };
}

export default function SuperAdmin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'permissions' | 'users' | 'database' | 'system'>('permissions');
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
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
      const permissionsData = await getAllPermissions();
      const matrix = await getRolePermissionsMatrix();
      setPermissions(permissionsData);
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
      await updateRolePermission(role, permission, granted);
      await loadPermissionsData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore aggiornamento permesso:', error);
    }
  }

  async function handleSectionToggle(role: string, section: string, granted: boolean) {
    try {
      await updateRoleSection(role, section, granted);
      await loadPermissionsData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore aggiornamento sezione:', error);
    }
  }

  async function handleViewTable(tableName: string) {
    try {
      setSelectedTable(tableName);
      const [data, structure] = await Promise.all([
        getTableRecords(tableName, 50),
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

  const roles = ['superadmin', 'admin', 'operator', 'user'];
  const sections = ['dashboard', 'normatives', 'education', 'documents', 'admin', 'superadmin'];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'operator': return 'bg-yellow-100 text-yellow-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Amministratore';
      case 'admin': return 'Amministratore';
      case 'operator': return 'Operatore';
      case 'user': return 'Utente';
      default: return role;
    }
  };

  const getPermissionLabel = (permissionId: string) => {
    const permission = PERMISSIONS.find(p => p.id === permissionId);
    return permission?.name || permissionId;
  };

  const hasPermission = (role: string, permissionId: string): boolean => {
    const roleData = roleMatrix.get(role);
    return roleData?.permissions?.includes(permissionId) || false;
  };

  const hasSection = (role: string, section: string): boolean => {
    const roleData = roleMatrix.get(role);
    return roleData?.visibleSections?.includes(section) || false;
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
                    Matrice Permessi per Ruolo
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Gestisci i permessi specifici per ogni ruolo del sistema
                  </p>
                </div>

                {/* Permissions Matrix */}
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                          Permesso
                        </th>
                        {roles.map(role => (
                          <th key={role} className="px-4 py-3 text-center text-sm font-medium border-b">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                              {getRoleLabel(role)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {PERMISSIONS.map((permission) => (
                        <tr key={permission.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {permission.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </td>
                          {roles.map(role => {
                            const granted = hasPermission(role, permission.id);
                            return (
                              <td key={role} className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handlePermissionToggle(role, permission.id, !granted)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    granted 
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                  title={granted ? 'Rimuovi permesso' : 'Concedi permesso'}
                                >
                                  {granted ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sections Matrix */}
                <div className="mt-12">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Sezioni Visibili per Ruolo
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Controlla quali sezioni dell'interfaccia sono visibili per ogni ruolo
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                            Sezione
                          </th>
                          {roles.map(role => (
                            <th key={role} className="px-4 py-3 text-center text-sm font-medium border-b">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                                {getRoleLabel(role)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {sections.map((section) => (
                          <tr key={section} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm capitalize">
                                {section}
                              </div>
                            </td>
                            {roles.map(role => {
                              const visible = hasSection(role, section);
                              return (
                                <td key={role} className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleSectionToggle(role, section, !visible)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      visible 
                                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                    title={visible ? 'Nascondi sezione' : 'Mostra sezione'}
                                  >
                                    {visible ? <Eye className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                              {getRoleLabel(user.role)}
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Gestione Database
                  </h3>
                  <button 
                    onClick={loadTablesData}
                    className="flex items-center space-x-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Aggiorna</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tables.map((table) => (
                    <div
                      key={table}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleViewTable(table)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Database className="h-5 w-5 text-gray-400" />
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{table}</h4>
                      <p className="text-sm text-gray-600">Clicca per visualizzare</p>
                    </div>
                  ))}
                </div>
              </div>
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
                        {tableData.slice(0, 20).map((row, index) => (
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