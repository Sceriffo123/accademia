import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Users, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText,
  RefreshCw,
  Monitor,
  Clock,
  Zap,
  Bug
} from 'lucide-react';
import { 
  getAllTables, 
  getRolePermissionsMatrix,
  getUsersCount,
  getDocumentsCount,
  getAllRolesFromDB,
  getAllPermissionsFromDB,
  getAllSectionsFromDB,
  updateRoleSection
} from '../lib/neonDatabase';
import DatabaseExplorer from '../components/DatabaseExplorer';

interface SystemMetrics {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalSections: number;
  totalDocuments: number;
  activeConnections: number;
  lastUpdate: string;
}

interface DatabaseTable {
  name: string;
  records: number;
  structure: unknown[];
  lastModified: string;
}

interface Permission {
  name: string;
  level: number;
  category?: string;
}

interface Section {
  name: string;
  display_name: string;
  description?: string;
}

interface RoleData {
  permissions: string[];
  sections: string[];
}

interface DebugLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  operation: string;
  details: string;
  user?: string;
}

export default function ControlCenter() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // Dati sistema
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Map<string, RoleData>>(new Map());
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [sectionTestLoading, setSectionTestLoading] = useState(false);
  const [sectionTestResults, setSectionTestResults] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [verifyType, setVerifyType] = useState('permission');
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(false);

  // Funzione per aggiungere log di debug
  const addDebugLog = (type: DebugLog['type'], operation: string, details: string) => {
    const newLog: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      operation,
      details,
      user: user?.email || 'Sistema'
    };
    setDebugLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep only last 100 logs
  };

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      loadSystemData();
      startRealTimeMonitoring();
    }
    
    // Listener per system alerts
    const handleSystemAlert = (event: CustomEvent) => {
      const { type, message, details } = event.detail;
      addDebugLog(type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info', 
        'SYSTEM_ALERT', `${message} - ${JSON.stringify(details)}`);
    };
    
    // Listener per audit logs
    const handleAuditLog = (event: CustomEvent) => {
      const logEntry = event.detail;
      if (logEntry.status === 'ERROR' || logEntry.status === 'VERIFICATION_FAILED') {
        addDebugLog('error', 'AUDIT_ERROR', 
          `${logEntry.operation}: ${logEntry.data.error || 'Operation failed'}`);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('systemAlert', handleSystemAlert as EventListener);
      window.addEventListener('auditLog', handleAuditLog as EventListener);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('systemAlert', handleSystemAlert as EventListener);
        window.removeEventListener('auditLog', handleAuditLog as EventListener);
      }
    };
  }, [profile]);

  // Verifica accesso SuperAdmin
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  const loadSystemData = async () => {
    try {
      setIsLoading(true);
      addDebugLog('info', 'SYSTEM_LOAD', 'Caricamento dati sistema iniziato');

      // Carica metriche sistema
      const [roles, permissions, sections, matrix, tables, usersCount, documentsCount] = await Promise.all([
        getAllRolesFromDB(),
        getAllPermissionsFromDB(),
        getAllSectionsFromDB(),
        getRolePermissionsMatrix(),
        getAllTables(),
        getUsersCount(),
        getDocumentsCount()
      ]);

      setSystemMetrics({
        totalUsers: usersCount,
        totalRoles: roles.length,
        totalPermissions: permissions.length,
        totalSections: sections.length,
        totalDocuments: documentsCount,
        activeConnections: 1,
        lastUpdate: new Date().toLocaleTimeString()
      });

      setRoleMatrix(matrix);
      setAllPermissions(permissions);
      setAllSections(sections);

      // Info tabelle database (solo nomi per overview)
      setDatabaseTables(tables.map(name => ({ name, records: 0, structure: [], lastModified: '' })));

      addDebugLog('success', 'SYSTEM_LOAD', 'Dati sistema caricati con successo');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugLog('error', 'SYSTEM_LOAD', `Errore caricamento sistema: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startRealTimeMonitoring = () => {
    setRealTimeMonitoring(true);
    addDebugLog('info', 'MONITORING', 'Monitoraggio real-time attivato');
    
    // Aggiorna metriche ogni 30 secondi
    const interval = setInterval(() => {
      if (systemMetrics) {
        setSystemMetrics(prev => prev ? {
          ...prev,
          lastUpdate: new Date().toLocaleTimeString()
        } : null);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      setRealTimeMonitoring(false);
    };
  };

  const runIntegrityCheck = async () => {
    try {
      addDebugLog('info', 'INTEGRITY_CHECK', 'Avvio verifica integrità database...');
      const { verifyDatabaseIntegrity } = await import('../lib/auditLogger');
      const { sql } = await import('../lib/neonDatabase');
      
      const result = await verifyDatabaseIntegrity(sql);
      
      if (result.isValid) {
        addDebugLog('success', 'INTEGRITY_CHECK', 'Database integro - Nessun problema rilevato');
      } else {
        addDebugLog('error', 'INTEGRITY_CHECK', `Problemi rilevati: ${result.errors.join(', ')}`);
        if (result.warnings.length > 0) {
          addDebugLog('warning', 'INTEGRITY_CHECK', `Avvisi: ${result.warnings.join(', ')}`);
        }
      }
      
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugLog('error', 'INTEGRITY_CHECK', `Errore verifica integrità: ${errorMessage}`);
      return { isValid: false, errors: [errorMessage], warnings: [] };
    }
  };

  const getLogIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const verifyPermissionState = async (role: string, permission: string): Promise<{
    currentValue: boolean;
    isConfigured: boolean;
    source: 'database' | 'cache' | 'error';
    message: string;
    dbValue?: boolean;
    cacheValue?: boolean;
  }> => {
    try {
      const { sql } = await import('../lib/neonDatabase');
      const dbResult = await sql`
        SELECT rp.granted 
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = ${role} AND p.name = ${permission}
      `;
      
      const cacheValue = roleMatrix.get(role)?.[permission] || false;
      const dbValue = dbResult.length > 0 ? dbResult[0].granted : false;
      const isConfigured = dbResult.length > 0;
      const isConsistent = dbValue === cacheValue;
      
      return {
        currentValue: dbValue,
        dbValue,
        cacheValue,
        isConfigured,
        source: isConsistent ? 'database' : 'cache',
        message: isConfigured 
          ? `✅ ${permission} per ${role}: ${dbValue ? 'ABILITATO' : 'DISABILITATO'} (DB: ${dbValue}, Cache: ${cacheValue})`
          : `❌ ${permission} per ${role}: NON CONFIGURATO nel database`
      };
      
    } catch (error: any) {
      return {
        currentValue: false,
        isConfigured: false,
        source: 'error',
        message: `🚨 Errore verifica: ${error?.message}`
      };
    }
  };

  const verifySectionState = async (role: string, section: string): Promise<{
    currentValue: boolean;
    isConfigured: boolean;
    source: 'database' | 'cache' | 'error'; 
    message: string;
    dbValue?: boolean;
    cacheValue?: boolean;
  }> => {
    try {
      const { sql } = await import('../lib/neonDatabase');
      const dbResult = await sql`
        SELECT rs.visible 
        FROM role_sections rs
        JOIN roles r ON r.id = rs.role_id
        JOIN sections s ON s.id = rs.section_id
        WHERE r.name = ${role} AND s.name = ${section}
      `;
      
      const cacheValue = roleMatrix.get(role)?.sections?.includes(section) || false;
      const dbValue = dbResult.length > 0 ? dbResult[0].visible : false;
      const isConfigured = dbResult.length > 0;
      const isConsistent = dbValue === cacheValue;
      
      return {
        currentValue: dbValue,
        dbValue,
        cacheValue,
        isConfigured,
        source: isConsistent ? 'database' : 'cache',
        message: isConfigured 
          ? `✅ ${section} per ${role}: ${dbValue ? 'VISIBILE' : 'NASCOSTA'} (DB: ${dbValue}, Cache: ${cacheValue})`
          : `❌ ${section} per ${role}: NON CONFIGURATA nel database`
      };
      
    } catch (error: any) {
      return {
        currentValue: false,
        isConfigured: false,
        source: 'error',
        message: `🚨 Errore verifica: ${error?.message}`
      };
    }
  };

  const testPermissionOperation = async (role: string, permission: string, granted: boolean) => {
    setTestLoading(true);
    setTestResults(null);
    addDebugLog('info', 'PERMISSION_VERIFY', `Verifica: ${role} -> ${permission}`);
    
    try {
      const result = await verifyPermissionState(role, permission);
      
      addDebugLog('info', 'PERMISSION_VERIFY', result.message);
      
      if (result.source === 'error') {
        setTestResults({
          type: 'error',
          message: result.message
        });
      } else if (!result.isConfigured) {
        setTestResults({
          type: 'warning',
          message: `⚠️ ${result.message} - Permesso non trovato nel database`
        });
      } else {
        const consistent = result.dbValue === result.cacheValue;
        setTestResults({
          type: consistent ? 'success' : 'warning',
          message: consistent 
            ? `✅ ${result.message} - Sincronizzato correttamente`
            : `⚠️ ${result.message} - INCONSISTENZA rilevata!`
        });
      }
      
      addDebugLog('success', 'PERMISSION_VERIFY', 'Verifica completata (sola lettura)');
      
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? (error.stack || errorMessage) : String(error);
      addDebugLog('error', 'PERMISSION_TEST', `ERRORE CATTURATO: ${errorDetails}`);
      console.error('🚨 CONTROL CENTER: Errore test permessi:', error);
      
      setTestResults({
        type: 'error',
        message: `🚨 Errore test: ${errorMessage}`
      });
      
      return false;
    } finally {
      setTestLoading(false);
    }
  };

  const testSectionOperation = async (role: string, section: string, visible: boolean) => {
    setSectionTestLoading(true);
    setSectionTestResults(null);
    addDebugLog('info', 'SECTION_TEST', `Test: ${role} -> ${section} = ${visible}`);
    
    try {
      const success = await updateRoleSection(role, section, visible);
      addDebugLog(success ? 'success' : 'error', 'SECTION_TEST', 
        `Risultato operazione: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      if (success) {
        setSectionTestResults({
          type: 'success',
          message: `✅ Sezione '${section}' ${visible ? 'mostrata' : 'nascosta'} per ruolo '${role}'`
        });
      } else {
        setSectionTestResults({
          type: 'error',
          message: `❌ Errore aggiornamento sezione '${section}' per ruolo '${role}'`
        });
      }
      
      await loadSystemData();
      
      return success;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? (error.stack || errorMessage) : String(error);
      addDebugLog('error', 'SECTION_TEST', `ERRORE CATTURATO: ${errorDetails}`);
      console.error('🚨 CONTROL CENTER: Errore test sezioni:', error);
      
      setSectionTestResults({
        type: 'error',
        message: `🚨 Errore test: ${errorMessage}`
      });
      
      return false;
    } finally {
      setSectionTestLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Panoramica', shortLabel: 'Home', icon: Monitor },
    { id: 'database', label: 'Database', shortLabel: 'DB', icon: Database },
    { id: 'permissions', label: 'Permessi', shortLabel: 'Permessi', icon: Shield },
    { id: 'integrity', label: 'Integrità DB', shortLabel: 'Integrità', icon: Shield },
    { id: 'test', label: 'Test CRUD', shortLabel: 'Test', icon: Zap },
    { id: 'debug', label: 'Debug Logs', shortLabel: 'Debug', icon: Bug }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento Centro di Controllo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Monitor className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Centro di Controllo</h1>
                <p className="text-xs sm:text-sm text-gray-600">Dashboard SuperAdmin - Sistema Accademia</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                realTimeMonitoring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${realTimeMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs font-medium">
                  {realTimeMonitoring ? 'Live' : 'Offline'}
                </span>
              </div>
              <button
                onClick={loadSystemData}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">
                  <span className="sm:hidden">↻</span>
                  <span className="hidden sm:inline">Aggiorna</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 min-h-[44px] rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium text-xs sm:text-sm">
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Utenti Totali</p>
                    <p className="text-2xl font-bold text-gray-900">{systemMetrics?.totalUsers}</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ruoli Sistema</p>
                    <p className="text-2xl font-bold text-gray-900">{systemMetrics?.totalRoles}</p>
                  </div>
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500" />
                </div>
              </div>
              
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Permessi Totali</p>
                    <p className="text-2xl font-bold text-gray-900">{systemMetrics?.totalPermissions}</p>
                  </div>
                  <Monitor className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Documenti</p>
                    <p className="text-2xl font-bold text-gray-900">{systemMetrics?.totalDocuments}</p>
                  </div>
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-500" />
                </div>
              </div>
              
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tabelle DB</p>
                    <p className="text-2xl font-bold text-gray-900">{databaseTables.length}</p>
                  </div>
                  <Database className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Database Tab */}
          {activeTab === 'database' && (
            <DatabaseExplorer />
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Matrice Permessi Gerarchici</h3>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {Array.from(roleMatrix.entries()).map(([role, data]) => (
                    <div key={role} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{role.toUpperCase()}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Permessi ({data.permissions.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {data.permissions.slice(0, 10).map((perm) => (
                              <span key={perm} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                {perm}
                              </span>
                            ))}
                            {data.permissions.length > 10 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{data.permissions.length - 10} altri
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Sezioni ({data.sections.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {data.sections.map((section) => (
                              <span key={section} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {section}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Test CRUD Tab */}
          {activeTab === 'test' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Verifica Singola */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">🔍 Verifica Singola (Solo Lettura)</h3>
                  <p className="text-sm text-gray-600 mt-1">Controlla stato DB vs Cache senza modificare nulla</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select className="w-full border rounded-lg px-3 py-3 min-h-[44px]" id="verify-role" title="Seleziona ruolo">
                      <option value="">Seleziona Ruolo</option>
                      {Array.from(roleMatrix.keys()).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <select 
                      className="w-full border rounded-lg px-3 py-3 min-h-[44px]" 
                      id="verify-type" 
                      title="Tipo verifica"
                      value={verifyType}
                      onChange={(e) => setVerifyType(e.target.value)}
                    >
                      <option value="permission">Permesso</option>
                      <option value="section">Sezione</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {verifyType === 'permission' && (
                      <select className="w-full border rounded-lg px-3 py-3 min-h-[44px]" id="verify-permission" title="Seleziona permesso">
                        <option value="">Seleziona Permesso</option>
                        {allPermissions.map(permission => (
                          <option key={permission.id} value={permission.name}>
                            {permission.name} ({permission.category})
                          </option>
                        ))}
                      </select>
                    )}
                    {verifyType === 'section' && (
                      <select className="w-full border rounded-lg px-3 py-3 min-h-[44px]" id="verify-section" title="Seleziona sezione">
                        <option value="">Seleziona Sezione</option>
                        {allSections.map(section => (
                          <option key={section.id} value={section.name}>
                            {section.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      const role = (document.getElementById('verify-role') as HTMLSelectElement)?.value;
                      const type = (document.getElementById('verify-type') as HTMLSelectElement)?.value;
                      const permission = (document.getElementById('verify-permission') as HTMLSelectElement)?.value;
                      const section = (document.getElementById('verify-section') as HTMLSelectElement)?.value;
                      
                      if (role && type === 'permission' && permission) {
                        testPermissionOperation(role, permission, true); // parametro granted ignorato nella nuova versione
                      } else if (role && type === 'section' && section) {
                        setTestLoading(true);
                        setTestResults(null);
                        try {
                          const result = await verifySectionState(role, section);
                          setTestResults({
                            type: result.source === 'error' ? 'error' : result.isConfigured ? 'success' : 'warning',
                            message: result.message
                          });
                        } catch (error: unknown) {
                          const errorMessage = error instanceof Error ? error.message : String(error);
                          setTestResults({
                            type: 'error',
                            message: `🚨 Errore verifica sezione: ${errorMessage}`
                          });
                        } finally {
                          setTestLoading(false);
                        }
                      }
                    }}
                    disabled={testLoading}
                    className={`w-full py-3 min-h-[44px] rounded-lg transition-colors ${
                      testLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {testLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verificando...
                      </div>
                    ) : (
                      '🔍 Verifica Stato (Solo Lettura)'
                    )}
                  </button>
                  
                  {/* Risultati Test Permessi */}
                  {testResults && (
                    <div className={`p-3 rounded-lg border ${
                      testResults.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : testResults.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="font-medium">{testResults.message}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Test Visibilità Sezioni (Lettura e Modifica)</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <select className="border rounded-lg px-3 py-2" id="test-section-role" title="Seleziona ruolo">
                      <option value="">Seleziona Ruolo</option>
                      {Array.from(roleMatrix.keys()).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <select className="border rounded-lg px-3 py-2" id="test-section" title="Seleziona sezione">
                      <option value="">Seleziona Sezione</option>
                      {allSections.map(section => (
                        <option key={section.id} value={section.name}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                    <select className="border rounded-lg px-3 py-2" id="test-visible" title="Visibilità sezione">
                      <option value="true">Visibile</option>
                      <option value="false">Nascosta</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Pulsante Verifica Stato */}
                    <button
                      onClick={async () => {
                        const role = (document.getElementById('test-section-role') as HTMLSelectElement)?.value;
                        const section = (document.getElementById('test-section') as HTMLSelectElement)?.value;
                        
                        if (role && section) {
                          setSectionTestLoading(true);
                          setSectionTestResults(null);
                          try {
                            const result = await verifySectionState(role, section);
                            setSectionTestResults({
                              type: result.source === 'error' ? 'error' : result.isConfigured ? 'success' : 'warning',
                              message: result.message
                            });
                          } catch (error: any) {
                            setSectionTestResults({
                              type: 'error',
                              message: `🚨 Errore verifica: ${error?.message}`
                            });
                          } finally {
                            setSectionTestLoading(false);
                          }
                        }
                      }}
                      disabled={sectionTestLoading}
                      className={`py-2 rounded-lg transition-colors ${
                        sectionTestLoading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      🔍 Verifica Stato
                    </button>
                    
                    {/* Pulsante Modifica */}
                    <button
                      onClick={() => {
                        const role = (document.getElementById('test-section-role') as HTMLSelectElement)?.value;
                        const section = (document.getElementById('test-section') as HTMLSelectElement)?.value;
                        const visible = (document.getElementById('test-visible') as HTMLSelectElement)?.value === 'true';
                        if (role && section) testSectionOperation(role, section, visible);
                      }}
                      disabled={sectionTestLoading}
                      className={`py-2 rounded-lg transition-colors ${
                        sectionTestLoading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                    >
                      {sectionTestLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Testing...
                        </div>
                      ) : (
                        '✏️ Test Modifica'
                      )}
                    </button>
                  </div>
                  
                  {/* Risultati Test Sezioni */}
                  {sectionTestResults && (
                    <div className={`p-3 rounded-lg border ${
                      sectionTestResults.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="font-medium">{sectionTestResults.message}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Database Integrity Tab */}
          {activeTab === 'integrity' && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Verifica Integrità Database</h3>
                <p className="text-sm text-gray-600 mt-1">Controlli automatici di integrità e coerenza del database</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Controllo Manuale</h4>
                    <p className="text-sm text-gray-600">Esegui una verifica completa dell'integrità del database</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={runIntegrityCheck}
                      className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-medium">
                        <span className="sm:hidden">Verifica</span>
                        <span className="hidden sm:inline">Verifica Integrità</span>
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { exportTableSchema } = await import('../lib/neonDatabase');
                          const schema = await exportTableSchema();
                          addDebugLog('info', 'SCHEMA_EXPORT', `Schema esportato: ${schema.length} colonne`);
                          console.table(schema);
                        } catch (error: unknown) {
                          const errorMessage = error instanceof Error ? error.message : String(error);
                          addDebugLog('error', 'SCHEMA_EXPORT', `Errore export schema: ${errorMessage}`);
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-3 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Database className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-medium">
                        <span className="sm:hidden">Schema</span>
                        <span className="hidden sm:inline">Export Schema</span>
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { exportAuditLogs } = await import('../lib/auditLogger');
                          exportAuditLogs();
                          addDebugLog('success', 'AUDIT_EXPORT', 'Log di audit esportati come file markdown');
                        } catch (error: unknown) {
                          const errorMessage = error instanceof Error ? error.message : String(error);
                          addDebugLog('error', 'AUDIT_EXPORT', `Errore export audit logs: ${errorMessage}`);
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-medium">
                        <span className="sm:hidden">Audit</span>
                        <span className="hidden sm:inline">Export Audit</span>
                      </span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="font-medium text-green-900 mb-2">Controlli Automatici</h5>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Esistenza tabelle critiche</li>
                      <li>• Integrità referenziale</li>
                      <li>• Ruolo SuperAdmin presente</li>
                      <li>• Permessi critici configurati</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h5 className="font-medium text-red-900 mb-2">🚨 Errori Real-time</h5>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Cattura errori NeonDbError automatica</li>
                      <li>• Alert immediati per errori schema</li>
                      <li>• Intercettazione errori console</li>
                      <li>• Notifiche errori operazioni CRUD</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h5 className="font-medium text-yellow-900 mb-2">⚠️ Errori Attivi</h5>
                  <div className="text-sm text-yellow-700">
                    {debugLogs.filter(log => log.type === 'error').length > 0 ? (
                      <div className="space-y-2">
                        {debugLogs.filter(log => log.type === 'error').slice(-5).map(log => (
                          <div key={log.id} className="p-2 bg-white rounded border border-yellow-300">
                            <div className="font-medium">{log.operation}</div>
                            <div className="text-xs text-gray-600">{log.timestamp}</div>
                            <div className="text-xs mt-1">{log.details}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-2">Nessun errore attivo rilevato</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Logs Tab */}
          {activeTab === 'debug' && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Debug Logs Real-time</h3>
                <button
                  onClick={() => setDebugLogs([])}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                >
                  Pulisci Log
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nessun log disponibile</p>
                ) : (
                  <div className="space-y-2">
                    {debugLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        {getLogIcon(log.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{log.operation}</span>
                            <span className="text-xs text-gray-500">{log.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
