import React, { useEffect, useState } from 'react';
import { checkDatabaseTables } from '../lib/neonDatabase';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';

export default function DatabaseCheck() {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkTables();
  }, []);

  async function checkTables() {
    try {
      const result = await checkDatabaseTables();
      if (result.error) {
        setError(result.error);
      } else {
        setTables(result.tables);
      }
    } catch (err) {
      setError('Errore durante la verifica delle tabelle');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Verifica database...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-red-200">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">Errore DB: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-green-200">
      <div className="flex items-center space-x-2 mb-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-600">Neon DB Connesso</span>
      </div>
      <div className="text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <Database className="h-3 w-3" />
          <span>{tables.length} tabelle trovate:</span>
        </div>
        <div className="mt-1 space-y-1">
          {tables.map(table => (
            <div key={table} className="text-xs text-gray-500">• {table}</div>
          ))}
        </div>
      </div>
    </div>
  );
}