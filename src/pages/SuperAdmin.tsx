import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  getAllPermissions, 
  getRolePermissionsMatrix, 
  updateRolePermission, 
  updateRoleSection 
} from '../lib/neonDatabase';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Crown,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export default function SuperAdmin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'permissions' | 'roles' | 'system'>('permissions');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Map<string, any>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['users']));
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Solo SuperAdmin può accedere
  if (profile?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadPermissionsData();
  }, []);

  async function loadPermissionsData() {
    try {
      setLoading(true);
      const [allPermissions, matrix] = await Promise.all([
        getAllPermissions(),
        getRolePermissionsMatrix()
      ]);
      
      setPermissions(allPermissions);
      setRoleMatrix(matrix);
    } catch (error) {
      console.error('Errore caricamento permessi:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = async (role: string, permissionId: string) => {
    const roleData = roleMatrix.get(role);
    const hasPermission = roleData?.permissions.includes(permissionId);
    
    try {
      const success = await updateRolePermission(role, permissionId, !hasPermission, profile?.id || '');
      if (success) {
        await loadPermissionsData(); // Ricarica i dati
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Errore aggiornamento permesso:', error);
    }
  };

  const toggleSectionVisibility = async (role: string, section: string) => {
    const roleData = roleMatrix.get(role);
    const isVisible = roleData?.sections.includes(section);
    
    try {
      const success = await updateRoleSection(role, section, !isVisible);
      if (success) {
        await loadPermissionsData(); // Ricarica i dati
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Errore aggiornamento sezione:', error);
    }
  };

  const saveChanges = () => {
    // Le modifiche sono già salvate nel database in tempo reale
    setHasChanges(false);
  };

  const resetToDefaults = () => {
    if (confirm('Sei sicuro di voler ripristinare i permessi di default? Tutte le modifiche andranno perse.')) {
      // Implementare reset ai default del database
      loadPermissionsData();
      setHasChanges(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Amministratore';
      case 'admin': return 'Amministratore';
      case 'operator': return 'Operatore';
      case 'user': return 'Utente';
      case 'guest': return 'Ospite';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'operator': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'user': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'guest': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const categories = [...new Set(permissions.map(p => p.category))];
  const sections = ['dashboard', 'users', 'normatives', 'education', 'admin', 'superadmin', 'reports', 'settings'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-800"></div>
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
              <Crown className="h-8 w-8 text-purple-800" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Pannello Super Amministratore
              </h1>
              <p className="text-gray-600">
                Controllo completo su permessi, ruoli e visibilità del sistema
              </p>
            </div>
          </div>
          
          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">Hai modifiche non salvate</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetToDefaults}
                  className="flex items-center space-x-1 px-3 py-1 text-yellow-700 hover:bg-yellow-100 rounded transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={saveChanges}
                  className="flex items-center space-x-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Salva</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'permissions', label: 'Gestione Permessi', icon: Shield },
                { id: 'roles', label: 'Visibilità Sezioni', icon: Eye },
                { id: 'system', label: 'Impostazioni Sistema', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Matrice Permessi per Ruolo
                </h3>
                
                {categories.map(category => (
                  <div key={category} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {expandedCategories.has(category) ? 
                          <ChevronDown className="h-5 w-5 text-gray-500" /> : 
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        }
                        <span className="font-medium text-gray-900 capitalize">
                          {category === 'users' ? 'Gestione Utenti' :
                           category === 'normatives' ? 'Gestione Normative' :
                           category === 'system' ? 'Sistema' :
                           category === 'reports' ? 'Report' : category}
                        </span>
                      </div>
                    </button>
                    
                    {expandedCategories.has(category) && (
                      <div className="p-4 border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th className="text-left py-2 px-3 font-medium text-gray-700 min-w-[200px]">
                                  Permesso
                                </th>
                                {Array.from(roleMatrix.keys()).map(role => (
                                  <th key={role} className="text-center py-2 px-3 min-w-[120px]">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
                                      {getRoleDisplayName(role)}
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {permissions.filter(p => p.category === category).map(permission => (
                                <tr key={permission.permission_id} className="border-t border-gray-100">
                                  <td className="py-3 px-3">
                                    <div>
                                      <div className="font-medium text-gray-900">{permission.name}</div>
                                      <div className="text-sm text-gray-500">{permission.description}</div>
                                    </div>
                                  </td>
                                  {Array.from(roleMatrix.keys()).map(role => {
                                    const roleData = roleMatrix.get(role);
                                    const hasPermission = roleData?.permissions.includes(permission.permission_id);
                                    const isDisabled = role === 'superadmin'; // SuperAdmin ha sempre tutti i permessi
                                    
                                    return (
                                      <td key={role} className="py-3 px-3 text-center">
                                        <button
                                          onClick={() => !isDisabled && togglePermission(role, permission.permission_id)}
                                          disabled={isDisabled}
                                          className={`p-2 rounded-lg transition-colors ${
                                            hasPermission 
                                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                          {hasPermission ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
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
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Visibilità Sezioni per Ruolo
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Sezione
                        </th>
                        {Array.from(roleMatrix.keys()).map(role => (
                          <th key={role} className="text-center py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
                              {getRoleDisplayName(role)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map(section => (
                        <tr key={section} className="border-t border-gray-100">
                          <td className="py-3 px-4 font-medium text-gray-900 capitalize">
                            {section === 'dashboard' ? 'Dashboard' :
                             section === 'users' ? 'Gestione Utenti' :
                             section === 'normatives' ? 'Normative' :
                             section === 'education' ? 'Formazione' :
                             section === 'admin' ? 'Amministrazione' :
                             section === 'superadmin' ? 'Super Admin' :
                             section === 'reports' ? 'Report' :
                             section === 'settings' ? 'Impostazioni' : section}
                          </td>
                          {Array.from(roleMatrix.keys()).map(role => {
                            const roleData = roleMatrix.get(role);
                            const isVisible = roleData?.sections.includes(section);
                            const isDisabled = role === 'superadmin'; // SuperAdmin vede sempre tutto
                            
                            return (
                              <td key={role} className="py-3 px-4 text-center">
                                <button
                                  onClick={() => !isDisabled && toggleSectionVisibility(role, section)}
                                  disabled={isDisabled}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isVisible 
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Impostazioni Sistema
                </h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="h-6 w-6 text-blue-600" />
                    <h4 className="text-lg font-semibold text-blue-900">
                      Configurazione Avanzata
                    </h4>
                  </div>
                  <p className="text-blue-800 mb-4">
                    Questa sezione sarà sviluppata nei prossimi step per includere:
                  </p>
                  <ul className="list-disc list-inside text-blue-700 space-y-2">
                    <li>Configurazione database e connessioni</li>
                    <li>Impostazioni di sicurezza avanzate</li>
                    <li>Gestione backup e ripristino</li>
                    <li>Monitoraggio sistema e performance</li>
                    <li>Configurazione notifiche e alert</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}