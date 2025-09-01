import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  X, 
  Eye, 
  EyeOff,
  RefreshCw,
  Database,
  Shield,
  Bug,
  Clock
} from 'lucide-react';

interface SystemAlert {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  details?: any;
  source: string;
  acknowledged: boolean;
}

interface AuditLogEntry {
  timestamp: string;
  operation: string;
  status: 'SUCCESS' | 'ERROR' | 'VERIFICATION_FAILED' | 'WARNING';
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'audit'>('alerts');

  // Solo per admin e superadmin
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return null;
  }

  // Solo per admin e superadmin
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return null;
  }

  useEffect(() => {
    // Listener per system alerts
    const handleSystemAlert = (event: CustomEvent) => {
      const { type, message, details } = event.detail;
      const newAlert: SystemAlert = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
        title: getAlertTitle(type, message),
        message,
        details,
        source: 'SYSTEM',
        acknowledged: false
      };
      
      setAlerts(prev => [newAlert, ...prev.slice(0, 49)]); // Max 50 alerts
      
      // Auto-expand per errori critici
      if (type === 'error') {
        setIsExpanded(true);
        setIsVisible(true);
      }
    };
    
    // Listener per audit logs
    const handleAuditLog = (event: CustomEvent) => {
      const logEntry = event.detail;
      setAuditLogs(prev => [logEntry, ...prev.slice(0, 99)]); // Max 100 logs
      
      // Crea alert per errori audit
      if (logEntry.status === 'ERROR' || logEntry.status === 'VERIFICATION_FAILED') {
        const newAlert: SystemAlert = {
          id: Date.now().toString() + '_audit',
          timestamp: logEntry.timestamp,
          type: 'error',
          title: 'Database Operation Failed',
          message: `${logEntry.operation}: ${logEntry.data?.error || 'Operation failed'}`,
          details: logEntry.data,
          source: 'AUDIT',
          acknowledged: false
        };
        
        setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
        setIsExpanded(true);
        setIsVisible(true);
      }
    };
    
    // Listener per errori console
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorText = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      
      // Cattura errori critici
      if (errorText.includes('🚨') || errorText.includes('NeonDbError') || 
          errorText.includes('Failed to load') || errorText.includes('bind message')) {
        
        const newAlert: SystemAlert = {
          id: Date.now().toString() + '_console',
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          title: 'Console Error Detected',
          message: errorText.substring(0, 200) + (errorText.length > 200 ? '...' : ''),
          details: { fullError: errorText, args },
          source: 'CONSOLE',
          acknowledged: false
        };
        
        setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
        setIsExpanded(true);
        setIsVisible(true);
      }
      
      originalConsoleError.apply(console, args);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('systemAlert', handleSystemAlert as EventListener);
      window.addEventListener('auditLog', handleAuditLog as EventListener);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('systemAlert', handleSystemAlert as EventListener);
        window.removeEventListener('auditLog', handleAuditLog as EventListener);
      }
      console.error = originalConsoleError;
    };
  }, []);

  const getAlertTitle = (type: string, message: string): string => {
    if (message.includes('Database')) return 'Database Error';
    if (message.includes('Permission')) return 'Permission Error';
    if (message.includes('User')) return 'User Management Error';
    if (message.includes('Schema')) return 'Database Schema Error';
    return type === 'error' ? 'System Error' : type === 'warning' ? 'System Warning' : 'System Info';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const clearAllAuditLogs = () => {
    setAuditLogs([]);
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const errorCount = unacknowledgedAlerts.filter(alert => alert.type === 'error').length;
  const warningCount = unacknowledgedAlerts.filter(alert => alert.type === 'warning').length;

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className={`p-3 rounded-full shadow-lg transition-all ${
            errorCount > 0 
              ? 'bg-red-500 text-white animate-pulse' 
              : warningCount > 0 
                ? 'bg-yellow-500 text-white' 
                : 'bg-blue-500 text-white'
          }`}
        >
          <Shield className="h-5 w-5" />
          {(errorCount + warningCount) > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {errorCount + warningCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className={`p-4 flex items-center justify-between ${
          errorCount > 0 ? 'bg-red-50 border-b border-red-200' :
          warningCount > 0 ? 'bg-yellow-50 border-b border-yellow-200' :
          'bg-blue-50 border-b border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Shield className={`h-5 w-5 ${
              errorCount > 0 ? 'text-red-600' :
              warningCount > 0 ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
            <h3 className="font-semibold text-gray-900">System Monitor</h3>
            {(errorCount + warningCount) > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                errorCount > 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {errorCount + warningCount} issues
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="max-h-96 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'alerts'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Alerts ({unacknowledgedAlerts.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'audit'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Audit ({auditLogs.length})</span>
                </div>
              </button>
            </div>

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">System Alerts</span>
                    <button
                      onClick={clearAllAlerts}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  {alerts.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      All systems operational
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.slice(0, 10).map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-lg border text-sm ${
                            alert.acknowledged 
                              ? 'bg-gray-50 border-gray-200 opacity-60' 
                              : alert.type === 'error'
                                ? 'bg-red-50 border-red-200'
                                : alert.type === 'warning'
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2 flex-1">
                              {getAlertIcon(alert.type)}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {alert.title}
                                </div>
                                <div className="text-gray-600 text-xs mt-1 line-clamp-2">
                                  {alert.message}
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">
                                    {alert.timestamp} • {alert.source}
                                  </span>
                                  {!alert.acknowledged && (
                                    <button
                                      onClick={() => acknowledgeAlert(alert.id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                      Acknowledge
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audit Tab */}
            {activeTab === 'audit' && (
              <div className="max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Audit Logs</span>
                    <button
                      onClick={clearAllAuditLogs}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      No audit logs
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {auditLogs.slice(0, 15).map((log, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded text-xs ${
                            log.status === 'ERROR' || log.status === 'VERIFICATION_FAILED'
                              ? 'bg-red-50 text-red-700'
                              : log.status === 'WARNING'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-green-50 text-green-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.operation}</span>
                            <span className="text-gray-500">{log.timestamp}</span>
                          </div>
                          {log.data?.error && (
                            <div className="mt-1 text-gray-600 truncate">
                              {log.data.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Status */}
        {!isExpanded && (
          <div className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                {errorCount > 0 && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <XCircle className="h-3 w-3" />
                    <span>{errorCount} errors</span>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{warningCount} warnings</span>
                  </div>
                )}
                {errorCount === 0 && warningCount === 0 && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>All OK</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsExpanded(true)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}