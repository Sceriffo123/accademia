import { writeAuditLog, createSystemAlert } from './auditLogger';

// Wrapper globale per cattura errori non gestiti
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isInitialized = false;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    // Cattura errori JavaScript non gestiti
    window.addEventListener('error', this.handleError.bind(this));
    
    // Cattura promise rejections non gestite
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // Cattura errori React (se disponibile)
    if (typeof window !== 'undefined') {
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        this.handleConsoleError(args);
        originalConsoleError.apply(console, args);
      };
    }

    this.isInitialized = true;
    console.log('🛡️ Global Error Handler inizializzato');
  }

  private async handleError(event: ErrorEvent): Promise<void> {
    const errorInfo = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString()
    };

    console.error('🚨 GLOBAL ERROR:', errorInfo);
    
    await writeAuditLog('GLOBAL_ERROR', 'ERROR', errorInfo);
    
    createSystemAlert('error', 'Unhandled JavaScript Error', {
      message: event.message,
      location: `${event.filename}:${event.lineno}:${event.colno}`
    });
  }

  private async handlePromiseRejection(event: PromiseRejectionEvent): Promise<void> {
    const errorInfo = {
      reason: event.reason,
      stack: event.reason?.stack,
      timestamp: new Date().toISOString()
    };

    console.error('🚨 UNHANDLED PROMISE REJECTION:', errorInfo);
    
    await writeAuditLog('PROMISE_REJECTION', 'ERROR', errorInfo);
    
    createSystemAlert('error', 'Unhandled Promise Rejection', {
      reason: String(event.reason)
    });
  }

  private async handleConsoleError(args: any[]): Promise<void> {
    const errorInfo = {
      args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)),
      timestamp: new Date().toISOString()
    };

    // Solo logga errori che sembrano critici
    const errorText = errorInfo.args.join(' ');
    if (errorText.includes('🚨') || errorText.includes('ERROR') || errorText.includes('Failed')) {
      await writeAuditLog('CONSOLE_ERROR', 'WARNING', errorInfo);
    }
  }

  // Wrapper per funzioni async con gestione errori automatica
  static async wrapAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.error(`🚨 WRAPPED ERROR [${operation}]:`, error);
      
      await writeAuditLog('WRAPPED_ERROR', 'ERROR', {
        operation,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      createSystemAlert('error', `Operation Failed: ${operation}`, {
        error: String(error)
      });
      
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }
}

// Inizializza automaticamente
if (typeof window !== 'undefined') {
  GlobalErrorHandler.getInstance().initialize();
}

export default GlobalErrorHandler;
