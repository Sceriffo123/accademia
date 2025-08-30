// Sistema di upload diretto su spazio Aruba
interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  filePath?: string;
  error?: string;
}

interface ArubaConfig {
  host: string;
  username: string;
  password: string;
  port: number;
  basePath: string;
  publicUrl: string;
}

// Configurazione Aruba dalle variabili d'ambiente
const arubaConfig: ArubaConfig = {
  host: 'fluxdata.eu',
  username: import.meta.env.VITE_ARUBA_FTP_USERNAME || 'MSSql216075',
  password: import.meta.env.VITE_ARUBA_FTP_PASSWORD || 'Vapensiero@2025',
  port: parseInt(import.meta.env.VITE_ARUBA_FTP_PORT || '21'),
  basePath: '/documenti',
  publicUrl: 'https://fluxdata.eu/documenti'
};

/**
 * Carica un file sullo spazio Aruba via FTP
 */
export async function uploadFileToAruba(
  file: File, 
  category: string = 'general',
  type: string = 'document'
): Promise<UploadResult> {
  try {
    console.log('🎓 ARUBA: Inizio upload file:', file.name);
    console.log('🎓 ARUBA: Dimensione file:', file.size, 'bytes');
    console.log('🎓 ARUBA: Tipo MIME:', file.type);

    // Validazione file
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return { success: false, error: 'File troppo grande (max 50MB)' };
    }

    // Tipi MIME consentiti
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Tipo file non supportato' };
    }

    // Genera nome file sicuro e univoco
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeFileName = `${type}_${timestamp}_${randomId}_${originalName}`;

    // Crea struttura cartelle per organizzazione
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthNames = [
      'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    const monthName = monthNames[now.getMonth()];
    
    // Percorso relativo: /2024/01-gennaio/categoria/
    const relativePath = `${year}/${month}-${monthName}/${category}/${safeFileName}`;
    const fullPath = `${arubaConfig.basePath}/${relativePath}`;
    const publicUrl = `${arubaConfig.publicUrl}/${relativePath}`;

    console.log('🎓 ARUBA: Percorso file:', fullPath);
    console.log('🎓 ARUBA: URL pubblico:', publicUrl);

    // Converti file in ArrayBuffer per upload
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);

    console.log('🎓 ARUBA: File convertito, inizio connessione FTP...');

    // Simula upload FTP (in realtà useremo fetch verso un endpoint backend)
    // Per ora restituiamo un URL simulato per testare l'interfaccia
    const simulatedResult: UploadResult = {
      success: true,
      fileUrl: publicUrl,
      fileName: safeFileName,
      filePath: relativePath
    };

    console.log('🎓 ARUBA: Upload simulato completato con successo');
    console.log('🎓 ARUBA: URL finale:', publicUrl);

    return simulatedResult;

  } catch (error) {
    console.error('🚨 ARUBA: Errore durante upload:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto durante upload' 
    };
  }
}

/**
 * Verifica se un file esiste su Aruba
 */
export async function checkFileExists(fileUrl: string): Promise<boolean> {
  try {
    console.log('🎓 ARUBA: Verifica esistenza file:', fileUrl);
    
    const response = await fetch(fileUrl, { method: 'HEAD' });
    const exists = response.ok;
    
    console.log('🎓 ARUBA: File', exists ? 'esiste' : 'non trovato');
    return exists;
  } catch (error) {
    console.error('🚨 ARUBA: Errore verifica file:', error);
    return false;
  }
}

/**
 * Ottieni informazioni su un file da Aruba
 */
export async function getFileInfo(fileUrl: string): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: string;
  contentType?: string;
}> {
  try {
    console.log('🎓 ARUBA: Recupero info file:', fileUrl);
    
    const response = await fetch(fileUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      return { exists: false };
    }

    const size = response.headers.get('content-length');
    const lastModified = response.headers.get('last-modified');
    const contentType = response.headers.get('content-type');

    return {
      exists: true,
      size: size ? parseInt(size) : undefined,
      lastModified: lastModified || undefined,
      contentType: contentType || undefined
    };
  } catch (error) {
    console.error('🚨 ARUBA: Errore recupero info file:', error);
    return { exists: false };
  }
}

/**
 * Genera URL di download con tracking
 */
export function generateDownloadUrl(fileUrl: string, documentId: string): string {
  // Per ora restituisce l'URL diretto
  // In futuro potremmo aggiungere un endpoint di tracking
  return fileUrl;
}

/**
 * Valida le credenziali Aruba
 */
export async function validateArubaCredentials(): Promise<boolean> {
  try {
    console.log('🎓 ARUBA: Test connessione FTP...');
    console.log('🎓 ARUBA: Host:', arubaConfig.host);
    console.log('🎓 ARUBA: Username:', arubaConfig.username);
    console.log('🎓 ARUBA: Porta:', arubaConfig.port);
    
    // Per ora restituisce true, implementeremo il test reale dopo
    return true;
  } catch (error) {
    console.error('🚨 ARUBA: Errore test credenziali:', error);
    return false;
  }
}

/**
 * Ottieni statistiche spazio Aruba
 */
export async function getArubaStorageStats(): Promise<{
  totalFiles: number;
  totalSize: string;
  lastUpload?: string;
}> {
  try {
    // Implementazione futura per statistiche reali
    return {
      totalFiles: 0,
      totalSize: '0 MB',
      lastUpload: undefined
    };
  } catch (error) {
    console.error('🚨 ARUBA: Errore statistiche storage:', error);
    return {
      totalFiles: 0,
      totalSize: '0 MB'
    };
  }
}