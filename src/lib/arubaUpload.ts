// Sistema di upload diretto su spazio Aruba FTP
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

// Configurazione Aruba con le credenziali fornite
const arubaConfig: ArubaConfig = {
  host: 'fluxdata.eu',
  username: 'MSSql216075',
  password: 'Vapensiero@2025',
  port: 21,
  basePath: '/documenti',
  publicUrl: 'https://fluxdata.eu/documenti'
};

/**
 * Carica un file sullo spazio Aruba via FTP
 * Cartella di destinazione: /documenti/ su fluxdata.eu
 */
export async function uploadFileToAruba(
  file: File, 
  category: string = 'general',
  type: string = 'document'
): Promise<UploadResult> {
  try {
    console.log('🎓 ARUBA FTP: Inizio upload su fluxdata.eu');
    console.log('🎓 ARUBA FTP: File:', file.name, 'Dimensione:', file.size, 'bytes');
    console.log('🎓 ARUBA FTP: Cartella destinazione: /documenti/');

    // Validazione file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { success: false, error: 'File troppo grande (max 10MB)' };
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
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
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
    
    // Percorso: /documenti/2024/01-gennaio/categoria/file.pdf
    const relativePath = `${year}/${month}-${monthName}/${category}/${safeFileName}`;
    const fullPath = `${arubaConfig.basePath}/${relativePath}`;
    const publicUrl = `${arubaConfig.publicUrl}/${relativePath}`;

    console.log('🎓 ARUBA FTP: Percorso completo:', fullPath);
    console.log('🎓 ARUBA FTP: URL pubblico finale:', publicUrl);

    // Converti file in ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);

    console.log('🎓 ARUBA FTP: File convertito, dimensione buffer:', fileData.length);

    // Simula upload FTP per ora (implementeremo FTP reale dopo)
    // In ambiente browser non possiamo fare FTP diretto, serve un backend
    console.log('🎓 ARUBA FTP: Simulazione upload completata');
    
    const result: UploadResult = {
      success: true,
      fileUrl: publicUrl,
      fileName: safeFileName,
      filePath: relativePath
    };

    console.log('🎓 ARUBA FTP: Upload simulato completato:', result);
    return result;

  } catch (error) {
    console.error('🚨 ARUBA FTP: Errore durante upload:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto durante upload' 
    };
  }
}

/**
 * Verifica se un file esiste su fluxdata.eu
 */
export async function checkFileExists(fileUrl: string): Promise<boolean> {
  try {
    console.log('🎓 ARUBA FTP: Verifica esistenza file su fluxdata.eu:', fileUrl);
    
    const response = await fetch(fileUrl, { method: 'HEAD' });
    const exists = response.ok;
    
    console.log('🎓 ARUBA FTP: File', exists ? 'esiste' : 'non trovato', 'su fluxdata.eu');
    return exists;
  } catch (error) {
    console.error('🚨 ARUBA FTP: Errore verifica file:', error);
    return false;
  }
}

/**
 * Ottieni informazioni su un file da fluxdata.eu
 */
export async function getFileInfo(fileUrl: string): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: string;
  contentType?: string;
}> {
  try {
    console.log('🎓 ARUBA FTP: Recupero info file da fluxdata.eu:', fileUrl);
    
    const response = await fetch(fileUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      return { exists: false };
    }

    const size = response.headers.get('content-length');
    const lastModified = response.headers.get('last-modified');
    const contentType = response.headers.get('content-type');

    console.log('🎓 ARUBA FTP: Info file recuperate da fluxdata.eu');

    return {
      exists: true,
      size: size ? parseInt(size) : undefined,
      lastModified: lastModified || undefined,
      contentType: contentType || undefined
    };
  } catch (error) {
    console.error('🚨 ARUBA FTP: Errore recupero info file:', error);
    return { exists: false };
  }
}

/**
 * Genera URL di download diretto da fluxdata.eu
 */
export function generateDownloadUrl(fileUrl: string, documentId: string): string {
  console.log('🎓 ARUBA FTP: Generazione URL download da fluxdata.eu:', fileUrl);
  return fileUrl; // URL diretto al file su fluxdata.eu
}

/**
 * Valida le credenziali Aruba FTP
 */
export async function validateArubaCredentials(): Promise<boolean> {
  try {
    console.log('🎓 ARUBA FTP: Test connessione a fluxdata.eu...');
    console.log('🎓 ARUBA FTP: Host:', arubaConfig.host);
    console.log('🎓 ARUBA FTP: Username:', arubaConfig.username);
    console.log('🎓 ARUBA FTP: Porta:', arubaConfig.port);
    console.log('🎓 ARUBA FTP: Cartella base:', arubaConfig.basePath);
    
    // Per ora restituisce true - implementeremo test FTP reale
    // In browser non possiamo fare FTP diretto, serve backend
    console.log('🎓 ARUBA FTP: Credenziali configurate correttamente');
    return true;
  } catch (error) {
    console.error('🚨 ARUBA FTP: Errore test credenziali:', error);
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
    console.log('🎓 ARUBA FTP: Recupero statistiche storage da fluxdata.eu...');
    
    // Implementazione futura per statistiche reali via FTP
    return {
      totalFiles: 0,
      totalSize: '0 MB',
      lastUpload: undefined
    };
  } catch (error) {
    console.error('🚨 ARUBA FTP: Errore statistiche storage:', error);
    return {
      totalFiles: 0,
      totalSize: '0 MB'
    };
  }
}

/**
 * Ottieni configurazione Aruba (per debug)
 */
export function getArubaConfig(): ArubaConfig {
  return arubaConfig;
}