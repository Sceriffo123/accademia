import { updateRoleSectionInDB, getRoleSectionsFromDB, getAllSectionsFromDB } from './src/lib/neonDatabase.ts';

async function configureDocumentsSection() {
  try {
    console.log('🔧 CONFIGURAZIONE SEZIONE DOCUMENTS:');

    // Verifica se la sezione esiste
    const sections = await getAllSectionsFromDB();
    const documentsSection = sections.find(s => s.name === 'documents');

    if (!documentsSection) {
      console.log('❌ Sezione documents non esiste nella tabella sections');
      return;
    }

    console.log('✅ Sezione documents trovata:', documentsSection);

    // Configura per superadmin
    const superResult = await updateRoleSectionInDB('superadmin', 'documents', true);
    console.log('👑 Superadmin documents:', superResult ? '✅ CONFIGURATO' : '❌ ERRORE');

    // Configura per admin
    const adminResult = await updateRoleSectionInDB('admin', 'documents', true);
    console.log('⚙️ Admin documents:', adminResult ? '✅ CONFIGURATO' : '❌ ERRORE');

    // Verifica configurazione finale
    const finalSuperSections = await getRoleSectionsFromDB('superadmin');
    const finalAdminSections = await getRoleSectionsFromDB('admin');

    console.log('\n🎯 CONFIGURAZIONE FINALE:');
    console.log('👑 Superadmin sezioni:', finalSuperSections);
    console.log('⚙️ Admin sezioni:', finalAdminSections);

    if (finalSuperSections.includes('documents') || finalAdminSections.includes('documents')) {
      console.log('\n🎉 SUCCESSO: Menu Documenti ora visibile per admin/superadmin!');
    } else {
      console.log('\n⚠️ ATTENZIONE: Configurazione non riuscita');
    }

  } catch (error) {
    console.error('❌ Errore configurazione:', error);
  }
}

// Esegui configurazione
configureDocumentsSection();
