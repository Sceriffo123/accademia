import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  getAllPermissionsFromDB, 
  getAllRolesFromDB, 
  getAllSectionsFromDB,
  getRolePermissionsMatrix,
  updateRolePermission,
  updateRoleSection,
  getAllTables,
  getTableStructure,
  getTableRecords,
  getTableConstraints,
  getTableIndexes,
  getTableStats,
  getAllTableRelations,
  getCompleteTableInfo
} from '../lib/neonDatabase';
import { 
  Monitor, Database, Shield, Zap, Bug, 
  Users, FileText, Settings, 
  AlertTriangle, CheckCircle, XCircle, 
  Info, RefreshCw, Search, Eye, 
  Clock, Server, Cpu
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
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [databaseTables, setDatabaseTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableRecords, setTableRecords] = useState<any[]>([]);
  const [tableStructure, setTableStructure] = useState<any[]>([]);
  const [systemData, setSystemData] = useState<any>(null);
  const [roleMatrix, setRoleMatrix] = useState<Map<string, any>>(new Map());
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [allSections, setAllSections] = useState<any[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [sectionTestLoading, setSectionTestLoading] = useState(false);
  const [sectionTestResults, setSectionTestResults] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  
  // Database Explorer state
  const [selectedTableExplorer, setSelectedTableExplorer] = useState<string>('');
  const [tableSchemaData, setTableSchemaData] = useState<any[]>([]);
  const [tableConstraintsData, setTableConstraintsData] = useState<any[]>([]);
  const [tableIndexesData, setTableIndexesData] = useState<any[]>([]);
  const [tableStatsData, setTableStatsData] = useState<any[]>([]);
  const [tableRelations, setTableRelations] = useState<any[]>([]);
  const [completeTableInfo, setCompleteTableInfo] = useState<any[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPerPage] = useState(50);

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
      const [roles, permissions, sections, matrix, tables, relations, completeInfo] = await Promise.all([
        getAllRolesFromDB(),
        getAllPermissionsFromDB(),
        getAllSectionsFromDB(),
        getRolePermissionsMatrix(),
        getAllTables(),
        getAllTableRelations(),
        getCompleteTableInfo()
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
      setAllPermissions(permissions);
      setAllSections(sections);
      setTableRelations(relations);
      setCompleteTableInfo(completeInfo);

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

  const loadCompleteTableExplorer = async (tableName: string) => {
    try {
      setExplorerLoading(true);
      setSelectedTableExplorer(tableName);
      addDebugLog('info', 'EXPLORER_LOAD', `Caricamento completo tabella: ${tableName}`);

      // Carica tutti i dati della tabella in parallelo
      const [schema, constraints, indexes, stats, records] = await Promise.all([
        getTableStructure(tableName),
        getTableConstraints(tableName),
        getTableIndexes(tableName),
        getTableStats(tableName),
        getTableRecords(tableName, recordsPerPage * recordsPage)
      ]);

      setTableSchemaData(schema);
      setTableConstraintsData(constraints);
      setTableIndexesData(indexes);
      setTableStatsData(stats);
      setTableData(records);

      addDebugLog('success', 'EXPLORER_LOAD', `Caricamento completo ${tableName}: ${schema.length} colonne, ${constraints.length} constraints, ${indexes.length} indici, ${records.length} record`);
    } catch (error) {
      addDebugLog('error', 'EXPLORER_LOAD', `Errore caricamento completo ${tableName}: ${error}`);
    } finally {
      setExplorerLoading(false);
    }
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
    } catch (error) {
      addDebugLog('error', 'INTEGRITY_CHECK', `Errore verifica integrità: ${error}`);
      return { isValid: false, errors: [String(error)], warnings: [] };
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

  const testPermissionOperation = async (role: string, permission: string, expectedGranted: boolean) => {
    setTestLoading(true);
    setTestResults(null);
    addDebugLog('info', 'PERMISSION_TEST', `Test verifica: ${role} -> ${permission} (aspettato: ${expectedGranted})`);
    
    try {
      // Solo verifica lo stato attuale (NON modifica)
      const roleData = roleMatrix.get(role);
      const hasPermission = roleData?.permissions?.includes(permission) || false;
      
      const isCorrect = hasPermission === expectedGranted;
      
      addDebugLog(isCorrect ? 'success' : 'warning', 'PERMISSION_TEST', 
        `Verifica: ${role} ha '${permission}' = ${hasPermission}, aspettato = ${expectedGranted}`);
      
      if (isCorrect) {
        setTestResults({
          type: 'success',
          message: `✅ VERIFICA OK: Ruolo '${role}' ${hasPermission ? 'ha' : 'non ha'} il permesso '${permission}' come previsto`
        });
      } else {
        setTestResults({
          type: 'error',
          message: `❌ VERIFICA FALLITA: Ruolo '${role}' ${hasPermission ? 'ha' : 'non ha'} '${permission}', ma dovrebbe ${expectedGranted ? 'averlo' : 'non averlo'}`
        });
      }
      
      return isCorrect;
    } catch (error: any) {
      const errorDetails = error?.message || error?.stack || JSON.stringify(error);
      addDebugLog('error', 'PERMISSION_TEST', `ERRORE VERIFICA: ${errorDetails}`);
      console.error('🚨 CONTROL CENTER: Errore verifica permessi:', error);
      
      setTestResults({
        type: 'error',
        message: `🚨 Errore verifica: ${error?.message || 'Errore sconosciuto'}`
      });
      
      return false;
    } finally {
      setTestLoading(false);
    }
  };

  const testSectionOperation = async (role: string, section: string, expectedVisible: boolean) => {
    setSectionTestLoading(true);
    setSectionTestResults(null);
    addDebugLog('info', 'SECTION_TEST', `Test verifica: ${role} -> ${section} (aspettata: ${expectedVisible})`);
    
    try {
      // Solo verifica lo stato attuale (NON modifica)
      const roleData = roleMatrix.get(role);
      const hasSection = roleData?.sections?.includes(section) || false;
      
      const isCorrect = hasSection === expectedVisible;
      
      addDebugLog(isCorrect ? 'success' : 'warning', 'SECTION_TEST', 
        `Verifica: ${role} ha sezione '${section}' = ${hasSection}, aspettata = ${expectedVisible}`);
      
      if (isCorrect) {
        setSectionTestResults({
          type: 'success',
          message: `✅ VERIFICA OK: Ruolo '${role}' ${hasSection ? 'vede' : 'non vede'} la sezione '${section}' come previsto`
        });
      } else {
        setSectionTestResults({
          type: 'error',
          message: `❌ VERIFICA FALLITA: Ruolo '${role}' ${hasSection ? 'vede' : 'non vede'} '${section}', ma dovrebbe ${expectedVisible ? 'vederla' : 'non vederla'}`
        });
      }
      
      return isCorrect;
    } catch (error: any) {
      const errorDetails = error?.message || error?.stack || JSON.stringify(error);
      addDebugLog('error', 'SECTION_TEST', `ERRORE VERIFICA: ${errorDetails}`);
      console.error('🚨 CONTROL CENTER: Errore verifica sezioni:', error);
      
      setSectionTestResults({
        type: 'error',
        message: `🚨 Errore verifica: ${error?.message || 'Errore sconosciuto'}`
      });
      
      return false;
    } finally {
      setSectionTestLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: Monitor },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'explorer', label: 'DB Explorer', icon: Search },
    { id: 'permissions', label: 'Permessi', icon: Shield },
    { id: 'integrity', label: 'Integrità DB', icon: Shield },
    { id: 'test', label: 'Test CRUD', icon: Zap },
    { id: 'debug', label: 'Debug Logs', icon: Bug }
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

          {/* Database Explorer Tab */}
          {activeTab === 'explorer' && (
            <div className="space-y-6">
              {/* Header Explorer */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">🔍 Database Explorer Completo</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {completeTableInfo.length} tabelle • {tableRelations.length} relazioni
                      </span>
                      <button
                        onClick={loadSystemData}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Stats Overview */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  {completeTableInfo.slice(0,4).map((table) => (
                    <div key={table.table_name} className="text-center p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">{table.table_name}</h4>
                      <p className="text-sm text-gray-600">{table.live_tuples} record</p>
                      <p className="text-xs text-gray-500">{table.table_size}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista Tabelle */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold text-gray-900">📋 Tabelle Database</h3>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto">
                      {completeTableInfo.map((table) => (
                        <div
                          key={table.table_name}
                          onClick={() => loadCompleteTableExplorer(table.table_name)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedTableExplorer === table.table_name
                              ? 'bg-blue-100 border-blue-300'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{table.table_name}</p>
                              <p className="text-sm text-gray-500">{table.live_tuples} record</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">{table.table_size}</p>
                              <div className="flex space-x-1 mt-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full" title="Attiva"></span>
                                {table.total_updates > 0 && <span className="w-2 h-2 bg-yellow-400 rounded-full" title="Modificata"></span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relazioni Tabelle */}
                  <div className="bg-white rounded-lg shadow-sm border mt-4">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold text-gray-900">🔗 Relazioni Database</h3>
                    </div>
                    <div className="p-4 max-h-64 overflow-y-auto">
                      {tableRelations.map((relation, index) => (
                        <div key={index} className="p-2 border-l-4 border-blue-200 bg-blue-50 rounded mb-2">
                          <p className="text-sm font-medium text-blue-900">
                            {relation.table_name}.{relation.column_name}
                          </p>
                          <p className="text-xs text-blue-600">
                            → {relation.foreign_table_name}.{relation.foreign_column_name}
                          </p>
                        </div>
                      ))}
                      {tableRelations.length === 0 && (
                        <p className="text-gray-500 text-center py-4">Nessuna relazione configurata</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dettagli Tabella Selezionata */}
                <div className="lg:col-span-2">
                  {selectedTableExplorer ? (
                    <div className="space-y-4">
                      {explorerLoading ? (
                        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                          <p className="text-gray-600">Caricamento dettagli {selectedTableExplorer}...</p>
                        </div>
                      ) : (
                        <>
                          {/* Schema Tabella */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-4 border-b">
                              <h3 className="text-lg font-semibold text-gray-900">
                                🔧 Schema: {selectedTableExplorer}
                              </h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left">#</th>
                                    <th className="px-4 py-2 text-left">Colonna</th>
                                    <th className="px-4 py-2 text-left">Tipo</th>
                                    <th className="px-4 py-2 text-left">Nullable</th>
                                    <th className="px-4 py-2 text-left">Default</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tableSchemaData.map((column, index) => (
                                    <tr key={index} className="border-t">
                                      <td className="px-4 py-2 text-gray-500">{column.ordinal_position}</td>
                                      <td className="px-4 py-2 font-medium">{column.column_name}</td>
                                      <td className="px-4 py-2">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                          {column.data_type}
                                          {column.character_maximum_length && `(${column.character_maximum_length})`}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          column.is_nullable === 'YES' 
                                            ? 'bg-yellow-100 text-yellow-800' 
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {column.is_nullable}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-gray-600 text-xs">
                                        {column.column_default || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Constraints e Indici */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg shadow-sm border">
                              <div className="p-4 border-b">
                                <h3 className="text-lg font-semibold text-gray-900">🔒 Constraints</h3>
                              </div>
                              <div className="p-4 max-h-48 overflow-y-auto">
                                {tableConstraintsData.map((constraint, index) => (
                                  <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
                                    <p className="font-medium text-sm">{constraint.constraint_name}</p>
                                    <p className="text-xs text-gray-600">
                                      {constraint.constraint_type} • {constraint.column_name}
                                      {constraint.foreign_table_name && (
                                        <span className="text-blue-600">
                                          → {constraint.foreign_table_name}.{constraint.foreign_column_name}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                ))}
                                {tableConstraintsData.length === 0 && (
                                  <p className="text-gray-500 text-center py-4">Nessun constraint</p>
                                )}
                              </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border">
                              <div className="p-4 border-b">
                                <h3 className="text-lg font-semibold text-gray-900">📊 Indici</h3>
                              </div>
                              <div className="p-4 max-h-48 overflow-y-auto">
                                {tableIndexesData.map((index, idx) => (
                                  <div key={idx} className="mb-2 p-2 bg-gray-50 rounded">
                                    <p className="font-medium text-sm">{index.indexname}</p>
                                    <p className="text-xs text-gray-600 truncate" title={index.indexdef}>
                                      {index.indexdef}
                                    </p>
                                  </div>
                                ))}
                                {tableIndexesData.length === 0 && (
                                  <p className="text-gray-500 text-center py-4">Nessun indice personalizzato</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Record Browser */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-4 border-b">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  📄 Record ({tableData.length} mostrati)
                                </h3>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setRecordsPage(Math.max(1, recordsPage - 1))}
                                    disabled={recordsPage === 1}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded disabled:opacity-50"
                                  >
                                    ←
                                  </button>
                                  <span className="text-sm text-gray-600">Pagina {recordsPage}</span>
                                  <button
                                    onClick={() => setRecordsPage(recordsPage + 1)}
                                    disabled={tableData.length < recordsPerPage}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded disabled:opacity-50"
                                  >
                                    →
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 max-h-96 overflow-auto">
                              {tableData.length > 0 ? (
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                  {JSON.stringify(tableData.slice(0, 10), null, 2)}
                                </pre>
                              ) : (
                                <p className="text-gray-500 text-center py-8">
                                  Nessun record trovato in {selectedTableExplorer}
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                      <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Seleziona una Tabella</h3>
                      <p className="text-gray-600">
                        Clicca su una tabella nella lista a sinistra per visualizzare schema, constraints, 
                        indici e record completi.
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
              {/* Test Permessi */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Test Verifica Permessi</h3>
                  <p className="text-sm text-gray-600 mt-1">Verifica lo stato attuale dei permessi senza modificarli</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select className="border rounded-lg px-3 py-2" id="test-role" title="Seleziona ruolo">
                      <option value="">Seleziona Ruolo</option>
                      {Array.from(roleMatrix.keys()).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <select className="border rounded-lg px-3 py-2" id="test-permission" title="Seleziona permesso">
                      <option value="">Seleziona Permesso</option>
                      {allPermissions.map(permission => (
                        <option key={permission.id} value={permission.name}>
                          {permission.name}
                        </option>
                      ))}
                    </select>
                    <select className="border rounded-lg px-3 py-2" id="test-granted" title="Stato atteso">
                      <option value="true">Dovrebbe essere concesso</option>
                      <option value="false">Dovrebbe essere negato</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const role = (document.getElementById('test-role') as HTMLSelectElement)?.value;
                      const permission = (document.getElementById('test-permission') as HTMLSelectElement)?.value;
                      const granted = (document.getElementById('test-granted') as HTMLSelectElement)?.value === 'true';
                      if (role && permission) testPermissionOperation(role, permission, granted);
                    }}
                    disabled={testLoading}
                    className={`w-full py-2 rounded-lg transition-colors ${
                      testLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {testLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verificando...
                      </div>
                    ) : (
                      'Verifica Stato Permesso'
                    )}
                  </button>
                  
                  {/* Risultati Test Permessi */}
                  {testResults && (
                    <div className={`p-3 rounded-lg border ${
                      testResults.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="font-medium">{testResults.message}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Sezioni */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Test Verifica Sezioni</h3>
                  <p className="text-sm text-gray-600 mt-1">Verifica la visibilità delle sezioni senza modificarle</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <select className="border rounded-lg px-3 py-2" id="test-visible" title="Visibilità attesa">
                      <option value="true">Dovrebbe essere visibile</option>
                      <option value="false">Dovrebbe essere nascosta</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const role = (document.getElementById('test-section-role') as HTMLSelectElement)?.value;
                      const section = (document.getElementById('test-section') as HTMLSelectElement)?.value;
                      const visible = (document.getElementById('test-visible') as HTMLSelectElement)?.value === 'true';
                      if (role && section) testSectionOperation(role, section, visible);
                    }}
                    disabled={sectionTestLoading}
                    className={`w-full py-2 rounded-lg transition-colors ${
                      sectionTestLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {sectionTestLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verificando...
                      </div>
                    ) : (
                      'Verifica Stato Sezione'
                    )}
                  </button>
                  
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
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Verifica Integrità</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { exportTableSchema } = await import('../lib/neonDatabase');
                          const schema = await exportTableSchema();
                          addDebugLog('info', 'SCHEMA_EXPORT', `Schema esportato: ${schema.length} colonne`);
                          console.table(schema);
                        } catch (error) {
                          addDebugLog('error', 'SCHEMA_EXPORT', `Errore export schema: ${error}`);
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Database className="h-4 w-4" />
                      <span>Export Schema</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { exportAuditLogs } = await import('../lib/auditLogger');
                          exportAuditLogs();
                          addDebugLog('success', 'AUDIT_EXPORT', 'Log di audit esportati come file markdown');
                        } catch (error) {
                          addDebugLog('error', 'AUDIT_EXPORT', `Errore export audit logs: ${error}`);
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Export Audit</span>
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
