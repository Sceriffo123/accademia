import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  getAllPermissionsFromDB, 
  getAllRolesFromDB,
  getAllSectionsFromDB,
  getRolePermissionsMatrix,
  getAllTables,
  getTableStructure,
  getTableRecords,
  updateRolePermission,
  updateRoleSection
} from '../lib/neonDatabase';
import { 
  Activity,
  Database,
  Users,
  Shield,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Network,
  Zap,
  RefreshCw,
  Monitor,
  Bug
} from 'lucide-react';

interface SystemMetrics {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalSections: number;
  activeConnections: number;
  lastUpdate: string;
}

interface DatabaseTable {
  name: string;
  records: number;
  structure: any[];
  lastModified: string;
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
  const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([]);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Map<string, { permissions: string[], sections: string[] }>>(new Map());
  
  // Stati debug
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      loadSystemData();
      startRealTimeMonitoring();
    }
  }, [profile]);

  // Verifica accesso SuperAdmin
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  const addDebugLog = (type: DebugLog['type'], operation: string, details: string) => {
    const newLog: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      operation,
      details,
      user: profile?.full_name
    };
    setDebugLogs(prev => [newLog, ...prev.slice(0, 99)]); // Mantieni solo 100 log
  };

  const loadSystemData = async () => {
    try {
      setIsLoading(true);
      addDebugLog('info', 'SYSTEM_LOAD', 'Caricamento dati sistema iniziato');

      // Carica metriche sistema
      const [roles, permissions, sections, matrix, tables] = await Promise.all([
        getAllRolesFromDB(),
        getAllPermissionsFromDB(),
        getAllSectionsFromDB(),
        getRolePermissionsMatrix(),
        getAllTables()
      ]);

      setSystemMetrics({
        totalUsers: 0, // Da implementare
        totalRoles: roles.length,
        totalPermissions: permissions.length,
        totalSections: sections.length,
        activeConnections: 1,
        lastUpdate: new Date().toLocaleTimeString()
      });

      setRoleMatrix(matrix);

      // Carica info tabelle database
      const tableInfo: DatabaseTable[] = [];
      for (const tableName of tables) {
        try {
          const records = await getTableRecords(tableName, 1);
          const structure = await getTableStructure(tableName);
          tableInfo.push({
            name: tableName,
            records: records.length,
            structure,
            lastModified: new Date().toISOString()
          });
        } catch (error) {
          addDebugLog('warning', 'TABLE_LOAD', `Errore caricamento tabella ${tableName}: ${error}`);
        }
      }
      setDatabaseTables(tableInfo);

      addDebugLog('success', 'SYSTEM_LOAD', 'Dati sistema caricati con successo');
    } catch (error) {
      addDebugLog('error', 'SYSTEM_LOAD', `Errore caricamento sistema: ${error}`);
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

  const loadTableData = async (tableName: string) => {
    try {
      addDebugLog('info', 'TABLE_INSPECT', `Caricamento dati tabella: ${tableName}`);
      const data = await getTableRecords(tableName, 50);
      setTableData(data);
      setSelectedTable(tableName);
      addDebugLog('success', 'TABLE_INSPECT', `Caricati ${data.length} record da ${tableName}`);
    } catch (error) {
      addDebugLog('error', 'TABLE_INSPECT', `Errore caricamento ${tableName}: ${error}`);
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

  const testPermissionOperation = async (role: string, permission: string, granted: boolean) => {
    addDebugLog('info', 'PERMISSION_TEST', `Test: ${role} -> ${permission} = ${granted}`);
    
    try {
      // Test diretto della funzione
      const success = await updateRolePermission(role, permission, granted);
      addDebugLog(success ? 'success' : 'error', 'PERMISSION_TEST', 
        `Risultato operazione: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      // Ricarica dati per verificare persistenza
      await loadSystemData();
      
      return success;
    } catch (error) {
      addDebugLog('error', 'PERMISSION_TEST', `Errore: ${error}`);
      return false;
    }
  };

  const testSectionOperation = async (role: string, section: string, visible: boolean) => {
    addDebugLog('info', 'SECTION_TEST', `Test: ${role} -> ${section} = ${visible}`);
    
    try {
      const success = await updateRoleSection(role, section, visible);
      addDebugLog(success ? 'success' : 'error', 'SECTION_TEST', 
        `Risultato operazione: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      await loadSystemData();
      return success;
    } catch (error) {
      addDebugLog('error', 'SECTION_TEST', `Errore: ${error}`);
      return false;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: Monitor },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'permissions', label: 'Permessi', icon: Shield },
    { id: 'test', label: 'Test CRUD', icon: Zap },
    { id: 'debug', label: 'Debug Logs', icon: Bug },
    { id: 'network', label: 'Connessioni', icon: Network }
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Centro di Controllo</h1>
                <p className="text-sm text-gray-600">Dashboard SuperAdmin - Sistema Accademia</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Aggiorna</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ruoli Sistema</p>
                    <p className="text-2xl font-bold text-gray-900">{systemMetrics?.totalRoles}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Permessi Totali</p>
                    <p className="text-2xl font-bold text-gray-900">{systemMetrics?.totalPermissions}</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sezioni Menu</p>
                    <p className="text-2xl font-bold text-gray-900">{systemMetrics?.totalSections}</p>
                  </div>
                  <Settings className="h-8 w-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tabelle DB</p>
                    <p className="text-2xl font-bold text-gray-900">{databaseTables.length}</p>
                  </div>
                  <Database className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Database Tab */}
          {activeTab === 'database' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Tabelle Database</h3>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {databaseTables.map((table) => (
                    <div
                      key={table.name}
                      onClick={() => loadTableData(table.name)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{table.name}</p>
                        <p className="text-sm text-gray-500">{table.records} record</p>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedTable && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Dati: {selectedTable}</h3>
                  </div>
                  <div className="p-4 max-h-96 overflow-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(tableData.slice(0, 5), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
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
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Test Matrice Permessi</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <select className="border rounded-lg px-3 py-2" id="test-role">
                      <option value="">Seleziona Ruolo</option>
                      {Array.from(roleMatrix.keys()).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Nome Permesso" 
                      className="border rounded-lg px-3 py-2"
                      id="test-permission"
                    />
                    <select className="border rounded-lg px-3 py-2" id="test-granted">
                      <option value="true">Abilitato</option>
                      <option value="false">Disabilitato</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const role = (document.getElementById('test-role') as HTMLSelectElement)?.value;
                      const permission = (document.getElementById('test-permission') as HTMLInputElement)?.value;
                      const granted = (document.getElementById('test-granted') as HTMLSelectElement)?.value === 'true';
                      if (role && permission) testPermissionOperation(role, permission, granted);
                    }}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Test Aggiornamento Permesso
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Test Visibilità Sezioni</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <select className="border rounded-lg px-3 py-2" id="test-section-role">
                      <option value="">Seleziona Ruolo</option>
                      {Array.from(roleMatrix.keys()).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Nome Sezione" 
                      className="border rounded-lg px-3 py-2"
                      id="test-section"
                    />
                    <select className="border rounded-lg px-3 py-2" id="test-visible">
                      <option value="true">Visibile</option>
                      <option value="false">Nascosta</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const role = (document.getElementById('test-section-role') as HTMLSelectElement)?.value;
                      const section = (document.getElementById('test-section') as HTMLInputElement)?.value;
                      const visible = (document.getElementById('test-visible') as HTMLSelectElement)?.value === 'true';
                      if (role && section) testSectionOperation(role, section, visible);
                    }}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    Test Aggiornamento Sezione
                  </button>
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
