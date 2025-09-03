import { useState, useEffect } from 'react';
import { 
  Database, 
  Table, 
  Download, 
  Eye, 
  Search, 
  Link, 
  Hash,
  RefreshCw
} from 'lucide-react';
import {
  getAllTables,
  getTableStructure,
  getTableRecords,
  getUsersCount,
  getAllTableRelations
} from '../lib/neonDatabase';
import { 
  createModuleProgressTable, 
  checkModuleProgressTable 
} from '../lib/createModuleProgressTable';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  recordCount: number;
  relations: RelationInfo[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
  lastModified?: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table?: string;
  foreign_column?: string;
}

interface RelationInfo {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
}

interface IndexInfo {
  index_name: string;
  column_name: string;
  is_unique: boolean;
}

interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  column_name: string;
  details: string;
}

export default function DatabaseExplorer() {
  const [allTablesInfo, setAllTablesInfo] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableDetails, setTableDetails] = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [educationTablesStatus, setEducationTablesStatus] = useState<{
    module_progress: boolean;
    courses: boolean;
    course_modules: boolean;
    enrollments: boolean;
  }>({
    module_progress: false,
    courses: false,
    course_modules: false,
    enrollments: false
  });
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'overview' | 'structure' | 'data' | 'relations'>('overview');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const tableNames = await getAllTables();
      setTables(tableNames);
      
      // Carica info base per tutte le tabelle
      const tablesInfo: TableInfo[] = [];
      for (const tableName of tableNames) {
        try {
          const structure = await getTableStructure(tableName);
          const records = await getTableRecords(tableName, 1);
          const recordCount = records.length > 0 ? await getRecordCount(tableName) : 0;
          
          tablesInfo.push({
            name: tableName,
            columns: structure,
            recordCount,
            relations: [],
            indexes: [],
            constraints: [],
            lastModified: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Errore caricamento tabella ${tableName}:`, error);
        }
      }
      setAllTablesInfo(tablesInfo);
    } catch (error) {
      console.error('Errore caricamento tabelle:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecordCount = async (tableName: string): Promise<number> => {
    try {
      // Implementa conteggio record specifico per tabella
      if (tableName === 'users') {
        return await getUsersCount();
      }
      // Per altre tabelle, usa una query generica
      const records = await getTableRecords(tableName, 1000);
      return records.length;
    } catch (error) {
      return 0;
    }
  };

  const loadTableDetails = async (tableName: string) => {
    try {
      setLoading(true);
      setSelectedTable(tableName);
      
      console.log(`🔄 DatabaseExplorer: Caricando dettagli per tabella ${tableName}...`);
      
      // Carica struttura e record prima, relazioni dopo per evitare blocchi
      const [structure, records] = await Promise.all([
        getTableStructure(tableName),
        getTableRecords(tableName, 50)
      ]);

      console.log(`✅ DatabaseExplorer: Struttura e record caricati per ${tableName}`, {
        columns: structure.length,
        records: records.length
      });

      const recordCount = await getRecordCount(tableName);
      
      // Carica relazioni separatamente per evitare errori
      let tableRelations: any[] = [];
      try {
        const relations = await getAllTableRelations();
        tableRelations = relations.filter(
          (rel: any) => rel.table_name === tableName || rel.foreign_table_name === tableName
        );
      } catch (relationError) {
        console.warn('⚠️ DatabaseExplorer: Errore caricamento relazioni (continuando senza):', relationError);
      }

      setTableInfo({
        name: tableName,
        columns: structure,
        recordCount,
        relations: tableRelations,
        indexes: [],
        constraints: [],
        lastModified: new Date().toISOString()
      });

      setTableData(records);
      console.log(`✅ DatabaseExplorer: Dettagli tabella ${tableName} caricati con successo`);
    } catch (error) {
      console.error('❌ DatabaseExplorer: Errore caricamento dettagli tabella:', error);
      // Anche in caso di errore, mostra almeno la tabella selezionata
      setSelectedTable(tableName);
      setTableInfo(null);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportTableData = async (tableName: string, format: 'csv' | 'json' | 'sql') => {
    try {
      const records = await getTableRecords(tableName, 10000);
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (format) {
        case 'csv':
          if (records.length > 0) {
            const headers = Object.keys(records[0]).join(',');
            const rows = records.map(record => 
              Object.values(record).map(val => 
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
              ).join(',')
            );
            content = [headers, ...rows].join('\n');
          }
          filename = `${tableName}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'json':
          content = JSON.stringify(records, null, 2);
          filename = `${tableName}.json`;
          mimeType = 'application/json';
          break;
          
        case 'sql':
          if (records.length > 0) {
            const columns = Object.keys(records[0]);
            const insertStatements = records.map(record => {
              const values = Object.values(record).map(val => 
                val === null ? 'NULL' : 
                typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : 
                val
              ).join(', ');
              return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
            });
            content = insertStatements.join('\n');
          }
          filename = `${tableName}.sql`;
          mimeType = 'text/sql';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore export dati:', error);
    }
  };

  const exportAllTables = async (format: 'json' | 'sql') => {
    try {
      setLoading(true);
      const allData: any = {};
      
      for (const tableName of tables) {
        const records = await getTableRecords(tableName, 10000);
        allData[tableName] = records;
      }

      let content = '';
      let filename = '';
      let mimeType = '';

      if (format === 'json') {
        content = JSON.stringify(allData, null, 2);
        filename = 'database_complete.json';
        mimeType = 'application/json';
      } else {
        const sqlStatements = [];
        for (const [tableName, records] of Object.entries(allData)) {
          if (Array.isArray(records) && records.length > 0) {
            const columns = Object.keys(records[0]);
            const insertStatements = records.map((record: any) => {
              const values = Object.values(record).map(val => 
                val === null ? 'NULL' : 
                typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : 
                val
              ).join(', ');
              return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
            });
            sqlStatements.push(`-- Tabella: ${tableName}`);
            sqlStatements.push(...insertStatements);
            sqlStatements.push('');
          }
        }
        content = sqlStatements.join('\n');
        filename = 'database_complete.sql';
        mimeType = 'text/sql';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore export completo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funzioni per gestione tabelle formazione
  const checkEducationTables = async () => {
    try {
      setMigrationLoading(true);
      setVerificationResult('🔄 Verifica in corso...');
      
      const moduleProgressExists = await checkModuleProgressTable();
      
      // Verifica esistenza altre tabelle formazione
      const coursesExists = allTablesInfo.some(table => table.name === 'courses');
      const courseModulesExists = allTablesInfo.some(table => table.name === 'course_modules');
      const enrollmentsExists = allTablesInfo.some(table => table.name === 'enrollments');
      
      setEducationTablesStatus({
        module_progress: moduleProgressExists,
        courses: coursesExists,
        course_modules: courseModulesExists,
        enrollments: enrollmentsExists
      });
      
      // Crea messaggio di risultato
      const missingTables = [];
      if (!moduleProgressExists) missingTables.push('module_progress');
      if (!coursesExists) missingTables.push('courses');
      if (!courseModulesExists) missingTables.push('course_modules');
      if (!enrollmentsExists) missingTables.push('enrollments');
      
      if (missingTables.length === 0) {
        setVerificationResult('✅ Tutte le tabelle formazione sono presenti!');
      } else {
        setVerificationResult(`⚠️ Tabelle mancanti: ${missingTables.join(', ')}`);
      }
      
      console.log('✅ Verifica tabelle formazione completata:', {
        module_progress: moduleProgressExists,
        courses: coursesExists,
        course_modules: courseModulesExists,
        enrollments: enrollmentsExists
      });
      
    } catch (error) {
      console.error('🚨 Errore verifica tabelle formazione:', error);
      setVerificationResult('❌ Errore durante la verifica');
    } finally {
      setMigrationLoading(false);
    }
  };

  const createMissingEducationTables = async () => {
    try {
      setMigrationLoading(true);
      
      if (!educationTablesStatus.module_progress) {
        console.log('🎓 Creazione tabella module_progress...');
        const success = await createModuleProgressTable();
        if (success) {
          console.log('✅ Tabella module_progress creata');
          // Aggiorna solo lo stato locale senza ricaricare tutto
          setEducationTablesStatus(prev => ({
            ...prev,
            module_progress: true
          }));
          // Ricarica solo la lista tabelle senza chiamare checkEducationTables
          await loadTables();
        } else {
          console.error('❌ Errore creazione tabella module_progress');
        }
      } else {
        console.log('✅ Tabella module_progress già esistente');
      }
      
    } catch (error) {
      console.error('🚨 Errore creazione tabelle formazione:', error);
    } finally {
      setMigrationLoading(false);
    }
  };

  const filteredTables = allTablesInfo.filter(table => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Database Explorer</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={checkEducationTables}
              disabled={migrationLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${migrationLoading ? 'animate-spin' : ''}`} />
              <span>Verifica Formazione</span>
            </button>
            <button
              onClick={createMissingEducationTables}
              disabled={migrationLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${migrationLoading ? 'animate-spin' : ''}`} />
              <span>Crea Tabelle</span>
            </button>
            <button
              onClick={loadTables}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Aggiorna</span>
            </button>
            <button
              onClick={() => exportAllTables('json')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => exportAllTables('sql')}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Download className="h-4 w-4" />
              <span>Export SQL</span>
            </button>
          </div>
        </div>

        {/* Barra di ricerca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca tabelle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Risultato verifica formazione */}
        {verificationResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            verificationResult.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
            verificationResult.includes('⚠️') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <p className="text-sm font-medium">{verificationResult}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista tabelle */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Tabelle Database ({filteredTables.length})
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredTables.map((table) => {
              return (
                <div
                  key={table.name}
                  onClick={() => loadTableDetails(table.name)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedTable === table.name ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Table className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">{table.name}</p>
                        <p className="text-sm text-gray-500">
                          {table.columns.length || 0} colonne • {table.recordCount || 0} record
                        </p>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dettagli tabella */}
        <div className="lg:col-span-2">
          {selectedTable && tableInfo ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tabella: {selectedTable}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => exportTableData(selectedTable, 'csv')}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => exportTableData(selectedTable, 'json')}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => exportTableData(selectedTable, 'sql')}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      SQL
                    </button>
                  </div>
                </div>

                {/* Tab navigation */}
                <div className="flex space-x-4 mt-4">
                  {['overview', 'structure', 'data', 'relations'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode as any)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        viewMode === mode
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {mode === 'overview' && 'Panoramica'}
                      {mode === 'structure' && 'Struttura'}
                      {mode === 'data' && 'Dati'}
                      {mode === 'relations' && 'Relazioni'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {viewMode === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Record Totali</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{tableInfo.recordCount}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Table className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Colonne</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{tableInfo.columns.length}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Link className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Relazioni</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{tableInfo.relations.length}</p>
                    </div>
                  </div>
                )}

                {viewMode === 'structure' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Colonna
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nullable
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Default
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Chiavi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tableInfo.columns.map((column, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {column.column_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {column.data_type}
                              {column.character_maximum_length && `(${column.character_maximum_length})`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {column.is_nullable === 'YES' ? 'Sì' : 'No'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {column.column_default || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-1">
                                {column.is_primary_key && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">PK</span>
                                )}
                                {column.is_foreign_key && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">FK</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {viewMode === 'data' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {tableInfo.columns.slice(0, 6).map((column) => (
                            <th key={column.column_name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {column.column_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.slice(0, 20).map((row, index) => (
                          <tr key={index}>
                            {tableInfo.columns.slice(0, 6).map((column) => (
                              <td key={column.column_name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row[column.column_name]?.toString().slice(0, 50) || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      Mostrando prime 20 righe e 6 colonne. Usa Export per dati completi.
                    </p>
                  </div>
                )}

                {viewMode === 'relations' && (
                  <div className="space-y-4">
                    {tableInfo.relations.length > 0 ? (
                      tableInfo.relations.map((relation, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Link className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-gray-900">{relation.constraint_name}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">{relation.table_name}.{relation.column_name}</span>
                            {' → '}
                            <span className="font-medium">{relation.foreign_table_name}.{relation.foreign_column_name}</span>
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">Nessuna relazione trovata per questa tabella</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Seleziona una tabella per visualizzare i dettagli</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
