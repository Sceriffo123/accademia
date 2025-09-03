import { createModuleProgressTable, checkModuleProgressTable } from './src/lib/createModuleProgressTable';

async function main() {
  console.log('🎓 Inizializzazione tabella module_progress...');
  
  // Verifica se la tabella esiste già
  const exists = await checkModuleProgressTable();
  
  if (exists) {
    console.log('✅ La tabella module_progress esiste già');
    return;
  }
  
  // Crea la tabella
  const success = await createModuleProgressTable();
  
  if (success) {
    console.log('🎉 Tabella module_progress creata con successo!');
  } else {
    console.error('❌ Errore nella creazione della tabella module_progress');
  }
}

main().catch(console.error);
