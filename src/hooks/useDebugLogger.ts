import { useCallback } from 'react';
import { writeAuditLog, createSystemAlert } from '../lib/auditLogger';
import { writeActivityLog } from '../lib/neonDatabase';
import { useAuth } from '../contexts/AuthContext';

export type LogLevel = 'info' | 'warning' | 'error' | 'success';

export interface DebugContext {
  page: string;
  operation: string;
  userId?: string;
  userRole?: string;
}

export function useDebugLogger(context: DebugContext) {
  const { user } = useAuth();
  
  const logDebug = useCallback(async (
    level: LogLevel,
    message: string,
    details?: any,
    error?: Error
  ) => {
    const logData = {
      page: context.page,
      operation: context.operation,
      message,
      details,
      userId: context.userId,
      userRole: context.userRole,
      timestamp: new Date().toISOString(),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };

    // Log in console con emoji per visibilità immediata
    const emoji = {
      info: '📋',
      warning: '⚠️',
      error: '🚨',
      success: '✅'
    };
    
    console.log(`${emoji[level]} [${context.page}] ${context.operation}: ${message}`, details);

    // Scrivi audit log (localStorage)
    await writeAuditLog(
      `${context.page.toUpperCase()}_${context.operation.toUpperCase()}`,
      level === 'error' ? 'ERROR' : level === 'warning' ? 'WARNING' : 'SUCCESS',
      logData
    );

    // Scrivi nel database activity_logs se l'utente è autenticato
    if (user?.id) {
      try {
        await writeActivityLog(
          user.id,
          `${context.operation}_${level}`,
          context.page,
          undefined,
          logData
        );
      } catch (dbError) {
        console.error('🚨 Failed to write database activity log:', dbError);
      }
    }

    // Crea alert per errori critici
    if (level === 'error') {
      createSystemAlert('error', `Error in ${context.page}`, {
        operation: context.operation,
        message,
        details,
        error: error?.message
      });
    }

  }, [context, user]);

  const logError = useCallback((message: string, error: Error, details?: any) => {
    logDebug('error', message, details, error);
  }, [logDebug]);

  const logWarning = useCallback((message: string, details?: any) => {
    logDebug('warning', message, details);
  }, [logDebug]);

  const logInfo = useCallback((message: string, details?: any) => {
    logDebug('info', message, details);
  }, [logDebug]);

  const logSuccess = useCallback((message: string, details?: any) => {
    logDebug('success', message, details);
  }, [logDebug]);

  // Wrapper per operazioni async con logging automatico
  const wrapOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      logInfo(`Avvio ${operationName}...`);
      const result = await operation();
      logSuccess(successMessage || `${operationName} completato con successo`, { result });
      return result;
    } catch (error) {
      logError(`Errore in ${operationName}`, error as Error);
      return null;
    }
  }, [logInfo, logSuccess, logError]);

  return {
    logDebug,
    logError,
    logWarning,
    logInfo,
    logSuccess,
    wrapOperation
  };
}
