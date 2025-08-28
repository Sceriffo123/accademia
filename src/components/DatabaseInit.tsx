import React, { useState, useEffect } from 'react';
import { initializeTables } from '../lib/neonDatabase';
import { Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function DatabaseInit() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleInitialization();
  }, []);

  async function handleInitialization() {
    setStatus('loading');
    setMessage('Inizializzazione database in corso...');

    try {
      console.log('🔄 INIT: Forzando inizializzazione database...');
      setMessage('Creazione tabelle e inserimento dati...');
      
      const result = await initializeTables();

      if (result) {
        setStatus('success');
        setMessage('Database inizializzato con successo!');
        
        // Nascondi il messaggio dopo 3 secondi
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        throw new Error('Inizializzazione fallita');
      }
    } catch (error) {
      console.error('Errore inizializzazione database:', error);
      setStatus('error');
      setMessage('Errore nell\'inizializzazione del database. Riprova.');
    }
  }

  if (status === 'idle') {
    return null; // Non mostrare nulla se tutto è andato bene
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <div className="p-4 bg-blue-100 rounded-full">
                <Loader className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'error' && (
              <div className="p-4 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
            {status === 'success' && (
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Verifica Database
          </h2>
          
          <p className="text-gray-600 mb-4">
            {message}
          </p>

          {status === 'error' && (
            <button
              onClick={handleInitialization}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Riprova
            </button>
          )}
        </div>
      </div>
    </div>
  );
}