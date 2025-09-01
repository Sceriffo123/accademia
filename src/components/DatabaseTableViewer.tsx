import React, { useState, useEffect } from 'react';
import { getAllTables, getTableStructure, getTableRecords } from '../lib/neonDatabase';
import { neon } from '@neondatabase/serverless';
import { 
  Database, 
  Eye, 
  RefreshCw, 
  Table, 
  Info, 
  CheckCircle, 
  AlertCircle,
  X,
  Search,
  Edit3,
  Save,
  Plus,
  Trash2
} from 'lucide-react';

const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
export default function DatabaseTableViewer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableStructure, setTableStructure] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState<any>({});

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    try {
      setLoading(true);
      console.log('🎓 DATABASE: Caricamento lista tabelle...');
      const tablesData = await getAllTables();
      console.log('🎓 DATABASE: Tabelle trovate:', tablesData);
      setTables(tablesData);
      setError('');
    } catch (error) {
      console.error('🚨 DATABASE: Errore caricamento tabelle:', error);
      setError('Errore durante il caricamento delle tabelle');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewTable(tableName: string) {
    try {
      setLoadingTable(true);
      setSelectedTable(tableName);
      console.log('🎓 DATABASE: Caricamento dati tabella:', tableName);
      
      const [structure, data] = await Promise.all([
        getTableStructure(tableName),
        getTableRecords(tableName, 1000)
      ]);
      
      console.log('🎓 DATABASE: Struttura tabella:', structure);
      console.log('🎓 DATABASE: Dati tabella:', data.length, 'record');
      
      setTableStructure(structure);
      setTableData(data);
      setShowModal(true);
    } catch (error) {
      console.error('🚨 DATABASE: Errore caricamento tabella:', error);
      setError(`Errore durante il caricamento della tabella ${tableName}`);
    } finally {
      setLoadingTable(false);
    }
  }

  function handleEditRecord(record: any) {
    setEditingRecord(record);
    setEditFormData({ ...record });
    setShowEditModal(true);
  }

  function handleAddRecord() {
    const newRecord: any = {};
    tableStructure.forEach(column => {
      if (column.column_name !== 'id' && column.column_name !== 'created_at' && column.column_name !== 'updated_at') {
        newRecord[column.column_name] = column.column_default || '';
      }
    });
    setAddFormData(newRecord);
    setShowAddModal(true);
  }

  async function handleSaveEdit() {
    if (!editingRecord || !selectedTable) return;
    
    try {
      console.log('🎓 DATABASE: Salvataggio modifiche record...');
      
      // Costruisci query UPDATE dinamica
      const updates = [];
      const values = [];
      
      Object.keys(editFormData).forEach(key => {
        if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = $${values.length + 1}`);
          values.push(editFormData[key]);
        }
      });
      
      if (updates.length === 0) return;
      
      // Aggiungi updated_at se la colonna esiste
      const hasUpdatedAt = tableStructure.some(col => col.column_name === 'updated_at');
      if (hasUpdatedAt) {
        updates.push('updated_at = NOW()');
      }
      
      values.push(editingRecord.id);
      
      await sql`
        UPDATE ${sql.unsafe(selectedTable)}
        SET ${sql.unsafe(updates.join(', '))}
        WHERE id = ${editingRecord.id}
      `;
      
      // Ricarica dati tabella
      const newData = await getTableRecords(selectedTable, 1000);
      setTableData(newData);
      setShowEditModal(false);
      setEditingRecord(null);
      
      console.log('✅ DATABASE: Record aggiornato con successo');
      
    } catch (error) {
      console.error('❌ DATABASE: Errore salvataggio:', error);
      setError('Errore durante il salvataggio delle modifiche');
    }
  }

  async function handleSaveAdd() {
    if (!selectedTable) return;
    
    try {
      console.log('🎓 DATABASE: Aggiunta nuovo record...');
      
      const columns = Object.keys(addFormData).filter(key => addFormData[key] !== '');
      const values = columns.map(key => addFormData[key]);
      
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      await sql(
        `INSERT INTO ${selectedTable} (${columns.join(', ')}) VALUES (${placeholders})`,
        ...values
      );
      
      // Ricarica dati tabella
      const newData = await getTableRecords(selectedTable, 1000);
      setTableData(newData);
      setShowAddModal(false);
      setAddFormData({});
      
      console.log('✅ DATABASE: Nuovo record aggiunto con successo');
      
    } catch (error) {
      console.error('❌ DATABASE: Errore aggiunta record:', error);
      setError('Errore durante l\'aggiunta del nuovo record');
    }
  }

  async function handleDeleteRecord(record: any) {
    if (!selectedTable || !confirm('Sei sicuro di voler eliminare questo record?')) return;
    
    try {
      console.log('🎓 DATABASE: Eliminazione record...');
      
      await sql`
        DELETE FROM ${sql.unsafe(selectedTable)}
        WHERE id = ${record.id}
      `;
      
      // Ricarica dati tabella
      const newData = await getTableRecords(selectedTable, 1000);
      setTableData(newData);
      
      console.log('✅ DATABASE: Record eliminato con successo');
      
    } catch (error) {
      console.error('❌ DATABASE: Errore eliminazione:', error);
      setError('Errore durante l\'eliminazione del record');
    }
  }

  function renderFormField(columnName: string, value: any, onChange: (value: any) => void) {
    const column = tableStructure.find(col => col.column_name === columnName);
    if (!column) return null;
    
    // Campi non modificabili
    if (['id', 'created_at', 'updated_at'].includes(columnName)) {
      return (
        <input
          type="text"
          value={value || ''}
          disabled
          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
        />
      );
    }
    
    // Campo ruolo con select
    if (columnName === 'role') {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Seleziona ruolo</option>
          <option value="superadmin">Super Amministratore</option>
          <option value="admin">Amministratore</option>
          <option value="operator">Operatore</option>
          <option value="user">Utente</option>
          <option value="guest">Ospite</option>
        </select>
      );
    }
    
    // Campo status con select
    if (columnName === 'status') {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Seleziona stato</option>
          <option value="active">Attivo</option>
          <option value="draft">Bozza</option>
          <option value="archived">Archiviato</option>
        </select>
      );
    }
    
    // Campo type per documenti
    if (columnName === 'type' && selectedTable === 'documents') {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Seleziona tipo</option>
          <option value="template">Template</option>
          <option value="form">Modulo</option>
          <option value="guide">Guida</option>
          <option value="report">Report</option>
        </select>
      );
    }
    
    // Campo type per normative
    if (columnName === 'type' && selectedTable === 'normatives') {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Seleziona tipo</option>
          <option value="law">Legge</option>
          <option value="regulation">Regolamento</option>
          <option value="ruling">Sentenza</option>
        </select>
      );
    }
    
    // Campo booleano
    if (column.data_type === 'boolean') {
      return (
        <select
          value={value?.toString() || 'false'}
          onChange={(e) => onChange(e.target.value === 'true')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="false">False</option>
          <option value="true">True</option>
        </select>
      );
    }
    
    // Campo numerico
    if (column.data_type.includes('int') || column.data_type.includes('numeric')) {
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      );
    }
    
    // Campo data
    if (column.data_type.includes('date') || column.data_type.includes('timestamp')) {
      return (
        <input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      );
    }
    
    // Campo testo lungo
    if (column.data_type === 'text' || (column.character_maximum_length && column.character_maximum_length > 255)) {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      );
    }
    
    // Campo testo normale
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      />
    );
  }
  const filteredTables = tables.filter(table => 
    table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTableIcon = (tableName: string) => {
    if (tableName.includes('user')) return '👥';
    if (tableName.includes('normative')) return '📋';
    if (tableName.includes('document')) return '📄';
    if (tableName.includes('course')) return '🎓';
    if (tableName.includes('permission')) return '🔐';
    if (tableName.includes('role')) return '👑';
    if (tableName.includes('log')) return '📊';
    return '🗃️';
  };

  const getTableDescription = (tableName: string) => {
    switch (tableName) {
      case 'users': return 'Utenti del sistema';
      case 'normatives': return 'Normative e regolamenti';
      case 'documents': return 'Documenti e template';
      case 'courses': return 'Corsi di formazione';
      case 'course_modules': return 'Moduli dei corsi';
      case 'course_enrollments': return 'Iscrizioni ai corsi';
      case 'activity_logs': return 'Log delle attività';
      case 'role_permissions': return 'Permessi per ruolo';
      case 'user_permissions': return 'Permessi utente';
      default: return 'Tabella del database';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Tabelle Database ({tables.length})
        </h3>
        <button 
          onClick={loadTables}
          className="flex items-center space-x-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Aggiorna</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Cerca tabelle..."
        />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTables.map((table) => (
          <div
            key={table}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => handleViewTable(table)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">{getTableIcon(table)}</div>
              <Eye className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
              {table}
            </h4>
            
            <p className="text-sm text-gray-600">
              {getTableDescription(table)}
            </p>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Clicca per visualizzare</span>
                <Database className="h-3 w-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && searchTerm && (
        <div className="text-center py-12 text-gray-500">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Nessuna tabella trovata</p>
          <p className="text-sm">Prova con un termine di ricerca diverso</p>
        </div>
      )}

      {/* Table Modal */}
      {showModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getTableIcon(selectedTable)}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Tabella: {selectedTable}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getTableDescription(selectedTable)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedTable('');
                  setTableData([]);
                  setTableStructure([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingTable ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="p-6 space-y-8">
                  {/* Table Structure */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Info className="h-5 w-5 text-blue-600 mr-2" />
                      Struttura Tabella
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Colonna</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nullable</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Default</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Lunghezza</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {tableStructure.map((column, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="px-4 py-3 font-medium text-gray-900">{column.column_name}</td>
                              <td className="px-4 py-3 text-gray-600">{column.data_type}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  column.is_nullable === 'YES' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {column.is_nullable === 'YES' ? 'Nullable' : 'Not Null'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-sm">
                                {column.column_default || '-'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-sm">
                                {column.character_maximum_length || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table Data */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Table className="h-5 w-5 text-green-600 mr-2" />
                      Dati Tabella ({tableData.length} record)
                    </h4>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleAddRecord}
                          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Aggiungi Record</span>
                        </button>
                        <button
                          onClick={() => handleViewTable(selectedTable)}
                          className="flex items-center space-x-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Aggiorna</span>
                        </button>
                      </div>
                    </div>
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
                              <th className="px-3 py-2 text-center font-medium text-gray-700">Azioni</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {tableData.map((row, index) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                {Object.entries(row).map(([key, value], cellIndex) => (
                                  <td key={cellIndex} className="px-3 py-2 text-gray-600 max-w-xs">
                                    <div className="truncate" title={value?.toString()}>
                                      {value?.toString() || '-'}
                                    </div>
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => handleEditRecord(row)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Modifica record"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(row)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Elimina record"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <Database className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>Nessun dato nella tabella</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Modifica Record - {selectedTable}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-160px)] p-6">
              <div className="space-y-4">
                {Object.keys(editFormData).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {key}
                    </label>
                    {renderFormField(key, editFormData[key], (value) => 
                      setEditFormData({ ...editFormData, [key]: value })
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Salva Modifiche</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Aggiungi Record - {selectedTable}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-160px)] p-6">
              <div className="space-y-4">
                {Object.keys(addFormData).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {key}
                    </label>
                    {renderFormField(key, addFormData[key], (value) => 
                      setAddFormData({ ...addFormData, [key]: value })
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveAdd}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Aggiungi Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}