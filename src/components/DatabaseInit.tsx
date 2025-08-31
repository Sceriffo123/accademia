import React, { useState, useEffect } from 'react';
import { initializeTables, getAllNormatives, insertDefaultRoleConfiguration } from '../lib/neonDatabase';
import { GraduationCap, CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';

export default function DatabaseInit() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleInitialization();
  }, []);

  async function handleInitialization() {
    setStatus('loading');
    setMessage('Verifica stato sistema Accademia...');

    try {
      console.log('🎓 ACCADEMIA: Verifica stato database...');
      
      // Verifica se il database è già inizializzato controllando le normative esistenti
      const existingNormatives = await getAllNormatives();
      
      if (existingNormatives.length > 0) {
        console.log('🎓 ACCADEMIA: Database già inizializzato, normative esistenti:', existingNormatives.length);
        setStatus('success');
        setMessage('Sistema Accademia già pronto per l\'utilizzo');
        
        // Nascondi il messaggio dopo 2 secondi
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
        return;
      }

      console.log('🎓 ACCADEMIA: Database non inizializzato, avvio procedura...');
      setMessage('Configurazione archivio normativo e utenti...');
      
      const result = await initializeTables();

      if (result) {
        console.log('🎓 ACCADEMIA: Tabelle create, ora configuro ruoli...');
        setMessage('Configurazione ruoli e autorizzazioni...');
        
        // Configura le autorizzazioni di default per i ruoli
        await insertDefaultRoleConfiguration();
        
        setStatus('success');
        setMessage('Sistema Accademia pronto per l\'utilizzo');
        
        // Nascondi il messaggio dopo 3 secondi
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        throw new Error('Errore durante l\'inizializzazione del sistema');
      }
    } catch (error) {
      console.error('🚨 ACCADEMIA: Errore inizializzazione sistema:', error);
      setStatus('error');
      setMessage('Impossibile inizializzare il sistema. Verificare la connessione.');
    }
  }

  if (status === 'idle') {
    return null; // Non mostrare nulla se tutto è andato bene
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/90 to-blue-700/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-blue-100">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <div className="relative">
                <div className="p-4 bg-blue-100 rounded-2xl">
                  <GraduationCap className="h-8 w-8 text-blue-800" />
                </div>
                <div className="absolute -top-1 -right-1 p-2 bg-white rounded-full shadow-lg">
                  <Loader className="h-4 w-4 text-blue-600 animate-spin" />
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
            {status === 'success' && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {status === 'loading' && 'Inizializzazione Sistema'}
            {status === 'error' && 'Errore di Sistema'}
            {status === 'success' && 'Sistema Pronto'}
          </h2>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            {message}
          </p>

          {status === 'error' && (
            <div className="space-y-4">
              <button
                onClick={handleInitialization}
                className="inline-flex items-center space-x-2 bg-blue-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-900 transition-all transform hover:scale-105 shadow-lg"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Riprova Inizializzazione</span>
              </button>
              <p className="text-sm text-gray-500">
                Verificare la configurazione del database nell'ambiente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}