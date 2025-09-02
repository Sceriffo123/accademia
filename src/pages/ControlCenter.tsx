import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  getTableStats,
  getUsersData,
  getRolesData,
  getPermissionsData,
  updateRolePermission,
  updateRoleSection,
  getCompleteDatabaseInfo,
  loadTableDataPaginated,
  getTableRelations,
  getCompleteTableInfo,
  generateDatabaseDocumentation,
  generateSingleTableDocumentation,
  downloadDatabaseDocumentation,
  analyzeActivityLogs,
  getActivityLogsStructure,
  getActivityLogsSample,
  clearActivityLogs,
  writeActivityLog
} from '../lib/neonDatabase';
import { 
  RefreshCw, 
  Shield, 
  Users, 
  Settings, 
  Database, 
  Download, 
  FileText, 
  Activity, 
  Search, 
  Monitor, 
  Bug, 
  Zap, 
  Clock, 
  Trash2,
  AlertTriangle 
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
  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsPerPage] = useState(50);

  const [activityLogsAnalysis, setActivityLogsAnalysis] = useState<any>(null);
  const [activityLogsStructure, setActivityLogsStructure] = useState<any[]>([]);
  const [activityLogsSample, setActivityLogsSample] = useState<any[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmed, setClearConfirmed] = useState(false);
  const [recordsToDelete, setRecordsToDelete] = useState(0);

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

  const exportDatabaseDocumentation = async () => {
    try {
      addDebugLog('info', 'EXPORT_DOC', 'Generazione documentazione database...');
      const documentation = await generateDatabaseDocumentation();
      downloadDatabaseDocumentation(documentation);
      addDebugLog('success', 'EXPORT_DOC', 'Documentazione database esportata e scaricata');
    } catch (error) {
      addDebugLog('error', 'EXPORT_DOC', `Errore export documentazione: ${error}`);
    }
  };

  const exportSingleTableDocumentation = async (tableName: string) => {
    try {
      addDebugLog('info', 'EXPORT_TABLE', `Generazione documentazione tabella ${tableName}...`);
      const documentation = await generateSingleTableDocumentation(tableName);
      const fileName = `table-${tableName}-documentation-${new Date().toISOString().split('T')[0]}.md`;
      downloadDatabaseDocumentation(documentation, fileName);
      addDebugLog('success', 'EXPORT_TABLE', `Documentazione tabella ${tableName} esportata`);
    } catch (error) {
      addDebugLog('error', 'EXPORT_TABLE', `Errore export tabella ${tableName}: ${error}`);
    }
  };

  const loadActivityLogsAnalysis = async () => {
    try {
      setActivityLogsLoading(true);
      addDebugLog('info', 'ACTIVITY_LOGS', 'Caricamento analisi activity_logs...');
      
      const [analysis, structure, sample] = await Promise.all([
        analyzeActivityLogs(),
        getActivityLogsStructure(),
        getActivityLogsSample(20)
      ]);
      
      setActivityLogsAnalysis(analysis);
      setActivityLogsStructure(structure);
      setActivityLogsSample(sample);
      
      addDebugLog('success', 'ACTIVITY_LOGS', `Analisi completata: ${analysis?.total_records || 0} record totali`);
    } catch (error) {
      addDebugLog('error', 'ACTIVITY_LOGS', `Errore analisi activity_logs: ${error}`);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  const handleClearActivityLogs = async () => {
    try {
      setActivityLogsLoading(true);
      addDebugLog('info', 'ACTIVITY_LOGS', 'Conteggio record prima della cancellazione...');
      
      // Prima conta i record attuali
      const analysis = await analyzeActivityLogs();
      const recordCount = analysis?.total_records || 0;
      
      if (recordCount === 0) {
        addDebugLog('info', 'ACTIVITY_LOGS', 'La tabella activity_logs è già vuota');
        setActivityLogsLoading(false);
        return;
      }
      
      // Mostra la modale di conferma
      setRecordsToDelete(recordCount);
      setShowClearModal(true);
      setActivityLogsLoading(false);
    } catch (error) {
      addDebugLog('error', 'ACTIVITY_LOGS', `Errore conteggio record: ${error}`);
      setActivityLogsLoading(false);
    }
  };

  const confirmClearActivityLogs = async () => {
    try {
      setActivityLogsLoading(true);
      setShowClearModal(false);
      setClearConfirmed(false);
      addDebugLog('warning', 'ACTIVITY_LOGS', `Avvio svuotamento di ${recordsToDelete.toLocaleString()} record...`);
      
      const result = await clearActivityLogs();
      
      if (result.success) {
        addDebugLog('success', 'ACTIVITY_LOGS', result.message);
        // Ricarica l'analisi dopo lo svuotamento
        await loadActivityLogsAnalysis();
      } else {
        addDebugLog('error', 'ACTIVITY_LOGS', result.message);
      }
    } catch (error) {
      addDebugLog('error', 'ACTIVITY_LOGS', `Errore svuotamento: ${error}`);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  const handleTestActivityLogging = async () => {
    if (!user?.id) {
      addDebugLog('error', 'ACTIVITY_LOGS', 'Utente non autenticato per il test');
      return;
    }

    try {
      setActivityLogsLoading(true);
      addDebugLog('info', 'ACTIVITY_LOGS', ' Avvio test logging attività...');
      
      // Test diretto della funzione writeActivityLog
      const testResult = await writeActivityLog(
        user.id,
        'test_logging',
        'control_center',
        undefined,
        {
          test: true,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          action_type: 'manual_test'
        },
        undefined
      );
      
      if (testResult.success) {
        addDebugLog('success', 'ACTIVITY_LOGS', ` Test completato! Log ID: ${testResult.logId}`);
        // Ricarica l'analisi per vedere il nuovo record
        await loadActivityLogsAnalysis();
      } else {
        addDebugLog('error', 'ACTIVITY_LOGS', ` Test fallito: ${testResult.message}`);
      }
    } catch (error) {
      addDebugLog('error', 'ACTIVITY_LOGS', ` Errore durante test: ${error}`);
    } finally {
      setActivityLogsLoading(false);
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
    { id: 'users', label: 'Utenti', icon: Users },
    { id: 'permissions', label: 'Permessi', icon: Shield },
    { id: 'test-crud', label: 'Test CRUD', icon: Zap },
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'explorer', label: 'DB Explorer', icon: Database },
    { id: 'activity-logs', label: 'Activity Logs', icon: Activity }
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
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {completeTableInfo.length} tabelle • {tableRelations.length} relazioni
                      </span>
                      <button
                        onClick={exportDatabaseDocumentation}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Download className="mr-2" size={16} />
                        Export Documentazione
                      </button>
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
                      {completeTableInfo.map((table, index) => (
                        <div 
                          key={index} 
                          className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                            selectedTableExplorer === table.table_name 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex items-center space-x-3 flex-1 cursor-pointer"
                              onClick={() => loadCompleteTableExplorer(table.table_name)}
                            >
                              <Database className="h-5 w-5 text-blue-600" />
                              <div>
                                <h4 className="font-semibold text-gray-900">{table.table_name}</h4>
                                <p className="text-sm text-gray-600">{table.live_tuples} record • {table.table_size}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                {table.total_inserts > 0 && <span className="w-2 h-2 bg-green-400 rounded-full" title="Popolata"></span>}
                                {table.total_updates > 0 && <span className="w-2 h-2 bg-yellow-400 rounded-full" title="Modificata"></span>}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportSingleTableDocumentation(table.table_name);
                                }}
                                className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                title={`Export documentazione ${table.table_name}`}
                              >
                                <Download className="mr-1" size={12} />
                                Export
                              </button>
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

          {/* Activity Logs Tab */}
          {activeTab === 'activity-logs' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Activity className="mr-2" size={20} />
                      Gestione Activity Logs
                    </h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={loadActivityLogsAnalysis}
                        disabled={activityLogsLoading}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`mr-2 ${activityLogsLoading ? 'animate-spin' : ''}`} size={16} />
                        Analizza
                      </button>
                      <button
                        onClick={handleClearActivityLogs}
                        disabled={activityLogsLoading || !activityLogsAnalysis?.total_records}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="mr-2" size={16} />
                        Svuota Tabella
                      </button>
                    </div>
                  </div>
                </div>

                {activityLogsLoading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Caricamento analisi activity_logs...</p>
                  </div>
                ) : activityLogsAnalysis ? (
                  <div className="p-6">
                    {/* Statistiche Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center">
                          <Database className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-blue-900">{activityLogsAnalysis.total_records?.toLocaleString()}</p>
                            <p className="text-sm text-blue-600">Record Totali</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <Users className="h-8 w-8 text-green-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-green-900">{activityLogsAnalysis.unique_users}</p>
                            <p className="text-sm text-green-600">Utenti Unici</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center">
                          <Clock className="h-8 w-8 text-yellow-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-yellow-900">{activityLogsAnalysis.last_24h}</p>
                            <p className="text-sm text-yellow-600">Ultime 24h</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="flex items-center">
                          <Activity className="h-8 w-8 text-purple-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-purple-900">{activityLogsAnalysis.last_7_days}</p>
                            <p className="text-sm text-purple-600">Ultimi 7 giorni</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Range temporale */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">📅 Range Temporale</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Record più vecchio:</span>
                          <span className="ml-2 text-gray-600">
                            {activityLogsAnalysis.oldest_record ? new Date(activityLogsAnalysis.oldest_record).toLocaleString('it-IT') : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Record più recente:</span>
                          <span className="ml-2 text-gray-600">
                            {activityLogsAnalysis.newest_record ? new Date(activityLogsAnalysis.newest_record).toLocaleString('it-IT') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Struttura Tabella */}
                      <div className="bg-white rounded-lg border">
                        <div className="p-4 border-b">
                          <h4 className="font-semibold text-gray-900">🔧 Struttura Tabella</h4>
                        </div>
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Colonna</th>
                                  <th className="text-left py-2">Tipo</th>
                                  <th className="text-left py-2">Nullable</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activityLogsStructure.map((column, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="py-2 font-medium">{column.column_name}</td>
                                    <td className="py-2 text-gray-600">{column.data_type}</td>
                                    <td className="py-2">
                                      {column.is_nullable === 'YES' ? '✅' : '❌'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Campione Record */}
                      <div className="bg-white rounded-lg border">
                        <div className="p-4 border-b">
                          <h4 className="font-semibold text-gray-900">📋 Ultimi Record</h4>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                          {activityLogsSample.length > 0 ? (
                            <div className="space-y-3">
                              {activityLogsSample.map((log, index) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      {log.action || log.operation || 'Attività'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {log.created_at ? new Date(log.created_at).toLocaleString('it-IT') : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <div><strong>User:</strong> {log.user_id || 'N/A'}</div>
                                    {log.details && <div><strong>Dettagli:</strong> {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</div>}
                                    {log.ip_address && <div><strong>IP:</strong> {typeof log.ip_address === 'object' ? (log.ip_address.ip || JSON.stringify(log.ip_address)) : log.ip_address}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">Nessun record trovato</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Azioni disponibili */}
                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Azioni Manutenzione</h4>
                      <p className="text-yellow-700 text-sm mb-3">
                        La tabella activity_logs contiene <strong>{activityLogsAnalysis.total_records?.toLocaleString()}</strong> record. 
                        Un numero elevato può impattare le performance del database.
                      </p>
                      <div className="flex items-center space-x-3 mb-3">
                        <button
                          onClick={handleClearActivityLogs}
                          disabled={activityLogsLoading}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="mr-2" size={16} />
                          Svuota Completamente
                        </button>
                        <span className="text-sm text-yellow-600">
                          ⚠️ Questa operazione è irreversibile
                        </span>
                      </div>
                      
                      {/* Test Logging Functionality */}
                      <div className="border-t border-yellow-300 pt-3">
                        <button
                          onClick={handleTestActivityLogging}
                          disabled={activityLogsLoading}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Activity className="mr-2" size={16} />
                          🧪 Test Logging
                        </button>
                        <p className="text-xs text-yellow-600 mt-1">
                          Testa se il sistema di logging delle attività funziona correttamente
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Analisi Activity Logs</h3>
                    <p className="text-gray-600 mb-4">Clicca "Analizza" per visualizzare statistiche dettagliate sulla tabella activity_logs</p>
                    <button
                      onClick={loadActivityLogsAnalysis}
                      className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="mr-2" size={16} />
                      Inizia Analisi
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modale Conferma Cancellazione Activity Logs */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Conferma Cancellazione
                  </h3>
                  <p className="text-sm text-gray-500">
                    Questa operazione è irreversibile
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Stai per cancellare <strong className="text-red-600">{recordsToDelete.toLocaleString()}</strong> record 
                  dalla tabella <code className="bg-gray-100 px-2 py-1 rounded">activity_logs</code>.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Questa operazione <strong>non può essere annullata</strong>. Tutti i log delle attività verranno eliminati permanentemente.
                </p>

                <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <input
                    type="checkbox"
                    id="confirmClear"
                    checked={clearConfirmed}
                    onChange={(e) => setClearConfirmed(e.target.checked)}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                  />
                  <label htmlFor="confirmClear" className="text-sm font-medium text-red-800">
                    Confermo di voler cancellare tutti i {recordsToDelete.toLocaleString()} record
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={cancelClearActivityLogs}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmClearActivityLogs}
                  disabled={!clearConfirmed || activityLogsLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {activityLogsLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Cancellazione...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Conferma Cancellazione
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
