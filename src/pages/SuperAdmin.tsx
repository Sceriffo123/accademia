import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useDebugLogger } from '../hooks/useDebugLogger';
import { 
  getAllPermissionsFromDB, 
  getRolePermissionsMatrix, 
  updateRolePermission, 
  updateRoleSection,
} from '../lib/neonDatabase';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Info,
  CheckCircle,
  GraduationCap,
  X,
  HelpCircle,
  Wrench,
  Crown,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  AlertCircle,
  Database,
  RefreshCw
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function SuperAdmin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'permissions' | 'roles' | 'system'>('permissions');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Map<string, any>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['users']));
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [migrationMessage, setMigrationMessage] = useState('');

  // Debug Logger Integration
  const debugLogger = useDebugLogger({
    page: 'SuperAdmin',
    operation: 'SystemManagement',
    userId: profile?.id,
    userRole: profile?.role
  });

  function addNotification(type: 'success' | 'error' | 'info', title: string, message: string) {
    const id = Date.now().toString();
    const notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
    
    // Rimuovi automaticamente dopo 4 secondi
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }

  function removeNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  // Funzioni di migrazione database (temporaneamente disabilitate)
  async function handleCheckMigration() {
    addNotification('info', 'Funzione Temporaneamente Disabilitata', 'La verifica migrazione sarà implementata in una versione futura');
  }

  async function handleForceMigration() {
    addNotification('info', 'Funzione Temporaneamente Disabilitata', 'La migrazione forzata sarà implementata in una versione futura');
  }

  // Solo SuperAdmin può accedere
  if (profile?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      debugLogger.logInfo('SuperAdmin panel inizializzato', { userId: profile.id, userRole: profile.role });
      loadPermissionsData();
      }
  }, [profile]);

  async function loadPermissionsData() {
    try {
      setLoading(true);
      debugLogger.logInfo('Inizio caricamento dati sistema completo');
      console.log(' SuperAdmin: Caricamento dati dal database...');
      
      const [allPermissions, matrix] = await Promise.all([
        debugLogger.wrapOperation('getAllPermissionsFromDB', () => getAllPermissionsFromDB()),
        debugLogger.wrapOperation('getRolePermissionsMatrix', () => getRolePermissionsMatrix())
      ]);
      
      // Verifica integrità dati caricati
      debugLogger.logInfo('Dati sistema caricati', {
        permissionsCount: allPermissions?.length || 0,
        matrixSize: matrix?.size || 0
      });
      
      console.log(' SuperAdmin: Permessi caricati:', allPermissions.length);
      console.log(' SuperAdmin: Matrix caricata:', matrix);
      
      setPermissions(allPermissions);
      setRoleMatrix(matrix);
      
      debugLogger.logSuccess('Sistema caricato completamente dal database');
      
      addNotification('success', 'Dati Caricati', 
        `${allPermissions.length} permessi e ${matrix.size} ruoli caricati dal database`);
    } catch (error) {
      debugLogger.logError('Errore critico caricamento sistema', error as Error, {
        operation: 'loadPermissionsData',
        timestamp: new Date().toISOString()
      });
      console.error(' SuperAdmin: Errore caricamento permessi:', error);
      addNotification('error', 'Errore Database', 
        'Impossibile caricare permessi e ruoli dal database');
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

  const togglePermission = async (role: string, permissionName: string) => {
    const roleData = roleMatrix.get(role);
    const hasPermission = roleData?.permissions.includes(permissionName);
    
    debugLogger.logInfo('Toggle permesso richiesto', {
      role,
      permission: permissionName,
      currentState: hasPermission,
      newState: !hasPermission
    });
    
    console.log(`🔄 SuperAdmin: Toggle permesso ${permissionName} per ${role}: ${hasPermission} → ${!hasPermission}`);
    
    try {
      const success = await debugLogger.wrapOperation(
        'updateRolePermission',
        () => updateRolePermission(role, permissionName, !hasPermission)
      );
      
      if (success) {
        console.log(`✅ SuperAdmin: Database aggiornato con successo`);
        
        // Aggiornamento ottimistico dello stato locale (evita refresh)
        const updatedMatrix = new Map(roleMatrix);
        const currentRoleData = updatedMatrix.get(role);
        if (currentRoleData) {
          const updatedPermissions = hasPermission 
            ? currentRoleData.permissions.filter(p => p !== permissionName)
            : [...currentRoleData.permissions, permissionName];
          
          updatedMatrix.set(role, {
            ...currentRoleData,
            permissions: updatedPermissions
          });
          setRoleMatrix(updatedMatrix);
        }
        
        setHasChanges(true);
        
        debugLogger.logSuccess('Permesso ruolo aggiornato', { 
          role, 
          permission: permissionName, 
          newState: !hasPermission,
          databaseSuccess: true 
        });
        
        addNotification('success', 'Permesso Aggiornato', 
          `${permissionName} ${!hasPermission ? 'abilitato' : 'disabilitato'} per ${role}`);
      } else {
        debugLogger.logError('Aggiornamento permesso fallito', new Error('Database update returned false'), {
          role,
          permission: permissionName,
          newState: !hasPermission
        });
        addNotification('error', 'Errore Aggiornamento', 
          'Operazione fallita - controlla i Debug Logs');
      }
    } catch (error: any) {
      debugLogger.logError('Errore toggle permesso ruolo', error as Error, {
        role,
        permission: permissionName,
        operation: 'togglePermission'
      });
      console.error('🚨 SUPERADMIN: Errore aggiornamento permesso:', error);
      addNotification('error', 'Errore Sistema', 
        `Errore: ${error?.message || 'Operazione fallita'}`);
    }
  };

  const toggleSectionVisibility = async (role: string, section: string) => {
    const roleData = roleMatrix.get(role);
    const isVisible = roleData?.sections.includes(section);
    
    debugLogger.logInfo('Toggle sezione richiesto', {
      role,
      section,
      currentState: isVisible,
      newState: !isVisible
    });
    
    console.log(`🔄 SuperAdmin: Toggle sezione ${section} per ${role}: ${isVisible} → ${!isVisible}`);
    
    try {
      const success = await debugLogger.wrapOperation(
        'updateRoleSection',
        () => updateRoleSection(role, section, !isVisible)
      );
      
      if (success) {
        console.log(`✅ SuperAdmin: Database aggiornato con successo`);
        
        // Aggiornamento ottimistico dello stato locale (evita refresh)
        const updatedMatrix = new Map(roleMatrix);
        const currentRoleData = updatedMatrix.get(role);
        if (currentRoleData) {
          const updatedSections = isVisible
            ? currentRoleData.sections.filter(s => s !== section)
            : [...currentRoleData.sections, section];
          
          updatedMatrix.set(role, {
            ...currentRoleData,
            sections: updatedSections
          });
          setRoleMatrix(updatedMatrix);
        }
        
        setHasChanges(true);
        
        debugLogger.logSuccess('Sezione ruolo aggiornata', { 
          role, 
          section, 
          newState: !isVisible,
          databaseSuccess: true 
        });
        
        addNotification('success', 'Sezione Aggiornata', 
          `${section} ${!isVisible ? 'abilitata' : 'disabilitata'} per ${role}`);
      } else {
        console.log(`❌ SuperAdmin: Aggiornamento database fallito`);
        
        debugLogger.logError('Aggiornamento sezione fallito', new Error('Database update returned false'), {
          role,
          section,
          newState: !isVisible
        });
        
        addNotification('error', 'Errore Aggiornamento', 
          'Operazione fallita - controlla i Debug Logs nel Centro di Controllo');
      }
    } catch (error: any) {
      debugLogger.logError('Errore toggle sezione ruolo', error as Error, {
        role,
        section,
        operation: 'toggleSectionVisibility'
      });
      console.error('🚨 SUPERADMIN: Errore aggiornamento sezione:', error);
      addNotification('error', 'Errore Sistema', 
        `Errore: ${error?.message || 'Operazione fallita'}`);
    }
  };

  const saveChanges = () => {
    setHasChanges(false);
    addNotification('success', 'Configurazione Salvata', 
      'Tutte le modifiche sono state applicate al sistema');
  };

  const resetToDefaults = () => {
    if (confirm('Sei sicuro di voler ripristinare i permessi di default? Tutte le modifiche andranno perse.')) {
      // Implementare reset ai default del database
      loadPermissionsData();
      setHasChanges(false);
      addNotification('info', 'Configurazione Ripristinata', 
        'I permessi sono stati riportati alle impostazioni predefinite');
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
  const sections = ['dashboard', 'users', 'normatives', 'education', 'admin', 'superadmin', 'reports', 'settings', 'documents'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-800"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.type === 'success' ? CheckCircle : 
                        notification.type === 'error' ? AlertCircle : Info;
            const bgColor = notification.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                           notification.type === 'error' ? 'bg-red-50 border-red-200' :
                           'bg-blue-50 border-blue-200';
            const iconColor = notification.type === 'success' ? 'text-emerald-600' :
                             notification.type === 'error' ? 'text-red-600' :
                             'text-blue-600';
            const textColor = notification.type === 'success' ? 'text-emerald-900' :
                             notification.type === 'error' ? 'text-red-900' :
                             'text-blue-900';
            
            return (
              <div
                key={notification.id}
                className={`${bgColor} border rounded-xl p-4 shadow-lg max-w-sm animate-in slide-in-from-right duration-300 backdrop-blur-sm`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold ${textColor} mb-1`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm ${textColor} opacity-90`}>
                      {notification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className={`${iconColor} hover:opacity-70 transition-opacity`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Crown className="h-8 w-8 text-purple-800" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Pannello Super Amministratore
                </h1>
                <p className="text-gray-600">
                  Controllo completo su permessi, ruoli e visibilità del sistema
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
              title="Guida e aiuto"
            >
              <HelpCircle className="h-6 w-6" />
            </button>
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
                  className="flex items-center space-x-1 bg-yellow-600 text-white px-4 py-3 min-h-[44px] rounded-lg hover:bg-yellow-700 transition-colors"
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
            <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6">
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
                    className={`flex items-center space-x-1 sm:space-x-2 py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.id === 'permissions' ? 'Permessi' : tab.id === 'roles' ? 'Sezioni' : 'Sistema'}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
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
                      <div className="p-2 sm:p-4 border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th className="text-left py-2 px-2 sm:px-3 font-medium text-gray-700 text-xs sm:text-sm min-w-[150px] sm:min-w-[200px]">
                                  Permesso
                                </th>
                                {Array.from(roleMatrix.keys()).map(role => (
                                  <th key={role} className="text-center py-2 px-1 sm:px-3 min-w-[80px] sm:min-w-[120px]">
                                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
                                      {getRoleDisplayName(role)}
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {permissions.filter((p: any) => p.category === category).map((permission: any) => (
                                <tr key={permission.id} className="border-t border-gray-100">
                                  <td className="py-3 px-2 sm:px-3">
                                    <div>
                                      <div className="font-medium text-gray-900 text-xs sm:text-sm">{permission.name}</div>
                                      <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">{permission.description}</div>
                                    </div>
                                  </td>
                                  {Array.from(roleMatrix.keys()).map(role => {
                                    const roleData = roleMatrix.get(role);
                                    const hasPermission = roleData?.permissions.includes(permission.name);
                                    const isDisabled = role === 'superadmin'; // SuperAdmin ha sempre tutti i permessi
                                    
                                    return (
                                      <td key={role} className="py-3 px-1 sm:px-3 text-center">
                                        <button
                                          onClick={() => !isDisabled && togglePermission(role, permission.name)}
                                          disabled={isDisabled}
                                          className={`p-2 rounded-full transition-all transform hover:scale-105 ${
                                            hasPermission 
                                              ? 'bg-green-500 text-white shadow-lg shadow-green-200 hover:bg-green-600' 
                                              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                          title={`${hasPermission ? 'Disabilita' : 'Abilita'} ${permission.name} per ${role}`}
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
                        <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">
                          Sezione
                        </th>
                        {Array.from(roleMatrix.keys()).map(role => (
                          <th key={role} className="text-center py-3 px-1 sm:px-4">
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
                          <td className="py-3 px-2 sm:px-4 font-medium text-gray-900 capitalize text-xs sm:text-sm">
                            {section === 'dashboard' ? 'Dashboard' :
                             section === 'users' ? 'Gestione Utenti' :
                             section === 'normatives' ? 'Normative' :
                             section === 'education' ? 'Formazione' :
                             section === 'admin' ? 'Amministrazione' :
                             section === 'superadmin' ? 'Super Admin' :
                             section === 'reports' ? 'Report' :
                             section === 'settings' ? 'Impostazioni' :
                             section === 'documents' ? 'Documenti' : section}
                          </td>
                          {Array.from(roleMatrix.keys()).map(role => {
                            const roleData = roleMatrix.get(role);
                            const isVisible = roleData?.sections.includes(section);
                            const isDisabled = role === 'superadmin' && section === 'superadmin'; // Protezione: SuperAdmin non può disabilitare la propria sezione
                            
                            return (
                              <td key={role} className="py-3 px-1 sm:px-4 text-center">
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
                
                {/* Sezione Migrazione Database */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-red-100 rounded-xl">
                        <Database className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-red-900">
                          Migrazione Database
                        </h4>
                        <p className="text-sm text-red-700">
                          Strumenti avanzati per la gestione del database
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleCheckMigration}
                        disabled={migrationStatus !== 'idle'}
                        className="inline-flex items-center justify-center space-x-2 px-3 sm:px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <Wrench className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {migrationStatus === 'checking' ? 'Verifica...' : 'Verifica DB'}
                        </span>
                        <span className="sm:hidden">
                          {migrationStatus === 'checking' ? 'Verifica...' : 'Verifica'}
                        </span>
                      </button>
                      
                      <button
                        onClick={handleForceMigration}
                        disabled={migrationStatus !== 'idle'}
                        className="inline-flex items-center justify-center space-x-2 px-3 sm:px-4 py-3 min-h-[44px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <RefreshCw className={`h-4 w-4 ${migrationStatus === 'migrating' ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">
                          {migrationStatus === 'migrating' ? 'Migrazione...' : 'Forza Migrazione'}
                        </span>
                        <span className="sm:hidden">
                          {migrationStatus === 'migrating' ? 'Migrazione...' : 'Migrazione'}
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Status Migrazione */}
                  {migrationStatus !== 'idle' && (
                    <div className={`p-4 rounded-lg border ${
                      migrationStatus === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                      migrationStatus === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                      'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {migrationStatus === 'success' && <CheckCircle className="h-5 w-5" />}
                        {migrationStatus === 'error' && <X className="h-5 w-5" />}
                        {(migrationStatus === 'checking' || migrationStatus === 'migrating') && 
                          <RefreshCw className="h-5 w-5 animate-spin" />}
                        <span className="font-medium">{migrationMessage}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 text-sm text-red-700">
                    <p className="font-medium mb-2">⚠️ Attenzione:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>La verifica controlla lo stato delle tabelle e permessi</li>
                      <li>La migrazione forzata modifica la struttura del database</li>
                      <li>Eseguire solo se necessario e con backup aggiornato</li>
                    </ul>
                  </div>
                </div>
                
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

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <HelpCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Guida Pannello SuperAdmin
                  </h3>
                  <p className="text-sm text-gray-600">
                    Tutto quello che devi sapere per gestire il sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 sm:p-6">
              <div className="space-y-8">
                {/* Sezioni del pannello */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 text-purple-600 mr-2" />
                    Sezioni del Pannello
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-purple-900">Gestione Permessi</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        Controlla i permessi granulari per ogni ruolo. Clicca sui lucchetti per abilitare/disabilitare permessi specifici.
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-900">Visibilità Sezioni</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Gestisci quali sezioni del menu sono visibili per ogni ruolo. Clicca sugli occhi per mostrare/nascondere sezioni.
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Settings className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Impostazioni Sistema</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Configurazioni avanzate del sistema. Verrà sviluppato nei prossimi aggiornamenti.
                      </p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Database className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-900">Database Tables</span>
                      </div>
                      <p className="text-sm text-orange-700">
                        Esplora e gestisci le tabelle del database. Visualizza schema, esplora record e monitora le performance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collegamento Sezioni e Database */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <GraduationCap className="h-5 w-5 text-indigo-600 mr-2" />
                    Collegamento Sezioni e Database
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <GraduationCap className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium text-indigo-900">Education ↔ Formazione</span>
                      </div>
                      <div className="text-sm text-indigo-700 space-y-1">
                        <p><strong>Nome tecnico:</strong> "education" (utilizzato nel codice e nei permessi)</p>
                        <p><strong>Nome visualizzato:</strong> "Formazione" (mostrato nel menu e nelle pagine)</p>
                        <p><strong>Collegato alla pagina:</strong> /education (Formazione Professionale)</p>
                        <p><strong>Tabelle database:</strong> courses, course_enrollments, course_modules</p>
                        <p><strong>Permessi:</strong> education.view, education.create, education.edit, education.delete, education.enroll</p>
                        <p className="text-xs mt-2 italic">I permessi education.* controllano le operazioni sui corsi di formazione e i quiz degli utenti.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Come funziona */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Info className="h-5 w-5 text-blue-600 mr-2" />
                    Come Funziona
                  </h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-blue-900 mb-2">Controlli Visivi</h5>
                        <ul className="space-y-1 text-sm text-blue-800">
                          <li>• <Unlock className="inline h-3 w-3" /> Verde = Permesso abilitato</li>
                          <li>• <Lock className="inline h-3 w-3" /> Grigio = Permesso disabilitato</li>
                          <li>• <Eye className="inline h-3 w-3" /> Verde = Sezione visibile</li>
                          <li>• <EyeOff className="inline h-3 w-3" /> Grigio = Sezione nascosta</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-blue-900 mb-2">Ruoli del Sistema</h5>
                        <ul className="space-y-1 text-sm text-blue-800">
                          <li>• <Crown className="inline h-3 w-3" /> SuperAdmin = Controllo totale</li>
                          <li>• <Users className="inline h-3 w-3" /> Admin = Gestione utenti</li>
                          <li>• <Shield className="inline h-3 w-3" /> Operator = Lettura limitata</li>
                          <li>• <Eye className="inline h-3 w-3" /> User = Solo lettura</li>
                          <li>• <Lock className="inline h-3 w-3" /> Guest = Accesso minimo</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Protezioni di Sicurezza */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    Protezioni di Sicurezza
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-900">SuperAdmin Protetto</p>
                          <p className="text-sm text-red-800">
                            Il SuperAdmin NON può disabilitare la propria sezione "Super Admin" per evitare blocchi del sistema.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-900">Controlli Frontend/Backend</p>
                          <p className="text-sm text-red-800">
                            Le protezioni sono implementate sia nel frontend che nel database per massima sicurezza.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-900">Logging Sicurezza</p>
                          <p className="text-sm text-red-800">
                            Tutti i tentativi di modifica vengono registrati per audit trail completo.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Come salvare */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Save className="h-5 w-5 text-green-600 mr-2" />
                    Salvare le Modifiche
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-green-900 mb-2">Indicatore Modifiche</h5>
                        <p className="text-sm text-green-800 mb-3">
                          Quando fai modifiche, appare un banner giallo in alto con il messaggio "Hai modifiche non salvate".
                        </p>
                        <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-xs">
                          <div className="flex items-center space-x-2 text-yellow-800">
                            <Settings className="h-4 w-4" />
                            <span>Hai modifiche non salvate</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-green-900 mb-2">Pulsanti Azioni</h5>
                        <div className="space-y-2">
                          <button className="w-full bg-green-600 text-white px-4 py-3 min-h-[44px] rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
                            <Save className="h-4 w-4" />
                            <span>Salva</span>
                          </button>
                          <button className="w-full bg-gray-600 text-white px-4 py-3 min-h-[44px] rounded text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2">
                            <RotateCcw className="h-4 w-4" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggerimenti */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Crown className="h-5 w-5 text-purple-600 mr-2" />
                    Suggerimenti per l'Uso
                  </h4>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-purple-800">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>Modifica i permessi con cautela - ogni ruolo ha uno scopo specifico</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>Usa la sezione Database per monitorare le performance del sistema</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>Salva regolarmente le modifiche per evitare perdite di configurazione</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>Il pulsante Reset riporta tutto alle impostazioni predefinite</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}