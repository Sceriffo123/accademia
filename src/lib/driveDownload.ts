/**
 * Utility per gestire il download di file da Google Drive
 */

/**
 * Converte un URL di condivisione Google Drive in URL di download diretto
 * @param shareUrl URL di condivisione Google Drive (es: https://drive.google.com/file/d/FILE_ID/view?usp=sharing)
 * @returns URL di download diretto
 */
export function convertGoogleDriveUrl(shareUrl: string): string {
  // Estrae l'ID del file dall'URL di condivisione
  const fileIdMatch = shareUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  
  if (!fileIdMatch) {
    console.error('URL Google Drive non valido:', shareUrl);
    return shareUrl; // Ritorna l'URL originale se non riesce a convertirlo
  }
  
  const fileId = fileIdMatch[1];
  
  // Converte in URL di download diretto
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Verifica se un URL è un link di Google Drive
 * @param url URL da verificare
 * @returns true se è un URL di Google Drive
 */
export function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

/**
 * Scarica un file da Google Drive
 * @param fileUrl URL del file (può essere sharing o diretto)
 * @param filename Nome del file per il download
 */
export async function downloadGoogleDriveFile(fileUrl: string, filename: string): Promise<void> {
  try {
    let downloadUrl = fileUrl;
    
    // Se è un URL di condivisione, convertilo in download diretto
    if (isGoogleDriveUrl(fileUrl) && fileUrl.includes('/view')) {
      downloadUrl = convertGoogleDriveUrl(fileUrl);
    }
    
    console.log('🔄 Avvio download da Google Drive:', filename);
    console.log('📎 URL originale:', fileUrl);
    console.log('📎 URL download:', downloadUrl);
    
    // Crea un link temporaneo per il download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Aggiungi il link al DOM temporaneamente
    document.body.appendChild(link);
    
    // Simula il click per avviare il download
    link.click();
    
    // Rimuovi il link dal DOM
    document.body.removeChild(link);
    
    console.log('✅ Download avviato con successo');
    
  } catch (error) {
    console.error('❌ Errore durante il download da Google Drive:', error);
    
    // Fallback: apri il link in una nuova finestra
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
    
    throw new Error('Impossibile scaricare il file. Il file verrà aperto in una nuova finestra.');
  }
}

/**
 * Ottiene informazioni sul file da un URL Google Drive
 * @param shareUrl URL di condivisione Google Drive
 * @returns Informazioni base sul file
 */
export function getGoogleDriveFileInfo(shareUrl: string): { fileId: string | null; isValid: boolean } {
  const fileIdMatch = shareUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  
  return {
    fileId: fileIdMatch ? fileIdMatch[1] : null,
    isValid: !!fileIdMatch && isGoogleDriveUrl(shareUrl)
  };
}

/**
 * Genera URL di anteprima per Google Drive
 * @param shareUrl URL di condivisione Google Drive
 * @returns URL di anteprima
 */
export function getGoogleDrivePreviewUrl(shareUrl: string): string {
  const fileInfo = getGoogleDriveFileInfo(shareUrl);
  
  if (!fileInfo.isValid || !fileInfo.fileId) {
    return shareUrl;
  }
  
  return `https://drive.google.com/file/d/${fileInfo.fileId}/preview`;
}
