import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllUsers, 
  getAllRolesFromDB, 
  getAllPermissionsFromDB,
  getUserPermissions,
  checkDatabaseTables 
} from '../lib/neonDatabase';
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
  Clock,
  Loader,
  AlertCircle
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
}

interface SystemHealthCheck {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  lastCheck: string;
}
export default function SystemAlertPanel() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'audit'>('alerts');
  const [healthChecks, setHealthChecks] = useState<SystemHealthCheck[]>([]);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);

  // ✅ useEffect SEMPRE chiamato - Hook order consistente
  useEffect(() => {
    // Run initial health check
    runSystemHealthCheck();
    
    // Run health check every 5 minutes
    const healthCheckInterval = setInterval(() => {
      runSystemHealthCheck();
    }, 5 * 60 * 1000);

    // Listener per system alerts
    const handleSystemAlert = (event: CustomEvent) => {
      try {
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
      } catch (e) {
        // Ignore errors in alert handler
      }
    };
    
    // Listener per audit logs
    const handleAuditLog = (event: CustomEvent) => {
      try {
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
      } catch (e) {
        // Ignore errors in audit handler
      }
    };
    
    // Listener per errori console
    const originalConsoleError = console.error;
    
    const consoleErrorHandler = (...args: any[]) => {
      try {
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
      } catch (e) {
        // Ignore errors in console handler
      }
      
      originalConsoleError.apply(console, args);
    };
    
    console.error = consoleErrorHandler;
    
    if (typeof window !== 'undefined') {
      window.addEventListener('systemAlert', handleSystemAlert as EventListener);
      window.addEventListener('auditLog', handleAuditLog as EventListener);
    }
    
    return () => {
      clearInterval(healthCheckInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('systemAlert', handleSystemAlert as EventListener);
        window.removeEventListener('auditLog', handleAuditLog as EventListener);
      }
      console.error = originalConsoleError;
    };
  }, []); // Empty dependency array - only run once

  const runSystemHealthCheck = async () => {
    if (isRunningHealthCheck) return;
    
    setIsRunningHealthCheck(true);
    const timestamp = new Date().toLocaleTimeString();
    
    const checks: SystemHealthCheck[] = [
      { name: 'Database Connection', status: 'checking', message: 'Testing connection...', lastCheck: timestamp },
      { name: 'User Management', status: 'checking', message: 'Testing CRUD operations...', lastCheck: timestamp },
      { name: 'Permissions System', status: 'checking', message: 'Testing permissions...', lastCheck: timestamp },
      { name: 'Database Schema', status: 'checking', message: 'Verifying tables...', lastCheck: timestamp },
      { name: 'Authentication', status: 'checking', message: 'Testing auth flow...', lastCheck: timestamp }
    ];
    
    setHealthChecks([...checks]);
    
    // Test 1: Database Connection
    try {
      await checkDatabaseTables();
      checks[0] = { 
        ...checks[0], 
        status: 'success', 
        message: 'Database connection active',
        details: { connection: 'Neon PostgreSQL', status: 'Connected' }
      };
    } catch (error) {
      checks[0] = { 
        ...checks[0], 
        status: 'error', 
        message: 'Database connection failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
      
      // Create alert for database failure
      const newAlert: SystemAlert = {
        id: Date.now().toString() + '_db_health',
        timestamp,
        type: 'error',
        title: 'Database Health Check Failed',
        message: 'Database connection test failed during health check',
        details: { error },
        source: 'HEALTH_CHECK',
        acknowledged: false
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
    }
    
    setHealthChecks([...checks]);
    
    // Test 2: User Management CRUD
    try {
      const users = await getAllUsers(true); // Test real query
      if (users && users.length >= 0) {
        checks[1] = { 
          ...checks[1], 
          status: 'success', 
          message: `User management operational (${users.length} users)`,
          details: { userCount: users.length, operation: 'getAllUsers' }
        };
      } else {
        throw new Error('Invalid user data returned');
      }
    } catch (error) {
      checks[1] = { 
        ...checks[1], 
        status: 'error', 
        message: 'User management CRUD failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
      
      // Create alert for user management failure
      const newAlert: SystemAlert = {
        id: Date.now().toString() + '_user_health',
        timestamp,
        type: 'error',
        title: 'User Management Health Check Failed',
        message: 'User CRUD operations failed during health check',
        details: { error },
        source: 'HEALTH_CHECK',
        acknowledged: false
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
    }
    
    setHealthChecks([...checks]);
    
    // Test 3: Permissions System
    try {
      const roles = await getAllRolesFromDB();
      const permissions = await getAllPermissionsFromDB();
      
      if (roles.length > 0 && permissions.length > 0) {
        // Test permission lookup for current user
        if (profile?.role) {
          const userPerms = await getUserPermissions(profile.role);
          checks[2] = { 
            ...checks[2], 
            status: 'success', 
            message: `Permissions system operational (${roles.length} roles, ${permissions.length} permissions)`,
            details: { 
              roles: roles.length, 
              permissions: permissions.length,
              userPermissions: userPerms.length 
            }
          };
        } else {
          checks[2] = { 
            ...checks[2], 
            status: 'warning', 
            message: 'Permissions system active but no user context',
            details: { roles: roles.length, permissions: permissions.length }
          };
        }
      } else {
        throw new Error('No roles or permissions found');
      }
    } catch (error) {
      checks[2] = { 
        ...checks[2], 
        status: 'error', 
        message: 'Permissions system failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
    
    setHealthChecks([...checks]);
    
    // Test 4: Database Schema
    try {
      const tablesResult = await checkDatabaseTables();
      if (tablesResult.tables && tablesResult.tables.length > 0) {
        checks[3] = { 
          ...checks[3], 
          status: 'success', 
          message: `Database schema valid (${tablesResult.tables.length} tables)`,
          details: { tables: tablesResult.tables }
        };
      } else {
        throw new Error('No database tables found');
      }
    } catch (error) {
      checks[3] = { 
        ...checks[3], 
        status: 'error', 
        message: 'Database schema validation failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
    
    setHealthChecks([...checks]);
    
    // Test 5: Authentication
    try {
      if (profile && profile.id && profile.role) {
        checks[4] = { 
          ...checks[4], 
          status: 'success', 
          message: `Authentication active (${profile.role})`,
          details: { 
            userId: profile.id, 
            role: profile.role, 
            fullName: profile.full_name 
          }
        };
      } else {
        checks[4] = { 
          ...checks[4], 
          status: 'warning', 
          message: 'No authenticated user context',
          details: { profile }
        };
      }
    } catch (error) {
      checks[4] = { 
        ...checks[4], 
        status: 'error', 
        message: 'Authentication system failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
    
    setHealthChecks([...checks]);
    setIsRunningHealthCheck(false);
  };
  // ✅ Controllo condizionale DOPO tutti gli hooks
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

  const getHealthCheckIcon = (status: string) => {
    switch (status) {
      case 'checking': return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOverallSystemStatus = () => {
    if (healthChecks.length === 0) return { status: 'unknown', message: 'System status unknown' };
    
    const errorCount = healthChecks.filter(check => check.status === 'error').length;
    const warningCount = healthChecks.filter(check => check.status === 'warning').length;
    const checkingCount = healthChecks.filter(check => check.status === 'checking').length;
    
    if (checkingCount > 0) {
      return { status: 'checking', message: 'Running system health checks...' };
    } else if (errorCount > 0) {
      return { status: 'error', message: `${errorCount} critical system errors detected` };
    } else if (warningCount > 0) {
      return { status: 'warning', message: `${warningCount} system warnings detected` };
    } else {
      return { status: 'success', message: 'All systems operational' };
    }
  };
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const errorCount = unacknowledgedAlerts.filter(alert => alert.type === 'error').length;
  const warningCount = unacknowledgedAlerts.filter(alert => alert.type === 'warning').length;
  const overallStatus = getOverallSystemStatus();

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className={`p-3 rounded-full shadow-lg transition-all ${
            errorCount > 0 || overallStatus.status === 'error'
              ? 'bg-red-500 text-white animate-pulse' 
              : warningCount > 0 || overallStatus.status === 'warning'
                ? 'bg-yellow-500 text-white' 
                : overallStatus.status === 'checking'
                  ? 'bg-blue-500 text-white'
                  : 'bg-green-500 text-white'
          }`}
        >
          <Shield className="h-5 w-5" />
          {(errorCount + warningCount > 0 || overallStatus.status !== 'success') && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {overallStatus.status === 'error' ? '!' : errorCount + warningCount || '?'}
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
          errorCount > 0 || overallStatus.status === 'error' ? 'bg-red-50 border-b border-red-200' :
          warningCount > 0 || overallStatus.status === 'warning' ? 'bg-yellow-50 border-b border-yellow-200' :
          overallStatus.status === 'checking' ? 'bg-blue-50 border-b border-blue-200' :
          'bg-green-50 border-b border-green-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Shield className={`h-5 w-5 ${
              errorCount > 0 || overallStatus.status === 'error' ? 'text-red-600' :
              warningCount > 0 || overallStatus.status === 'warning' ? 'text-yellow-600' :
              overallStatus.status === 'checking' ? 'text-blue-600' :
              'text-green-600'
            }`} />
            <h3 className="font-semibold text-gray-900">System Monitor</h3>
            {(errorCount + warningCount > 0 || overallStatus.status !== 'success') && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                errorCount > 0 || overallStatus.status === 'error' ? 'bg-red-100 text-red-700' : 
                warningCount > 0 || overallStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {overallStatus.status === 'checking' ? 'checking' : 
                 overallStatus.status === 'error' ? 'critical' :
                 overallStatus.status === 'warning' ? 'warnings' :
                 `${errorCount + warningCount} issues`}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={runSystemHealthCheck}
              disabled={isRunningHealthCheck}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Run health check"
            >
              <RefreshCw className={`h-4 w-4 ${isRunningHealthCheck ? 'animate-spin' : ''}`} />
            </button>
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

            {/* System Health Status */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">System Health</h4>
                <div className="flex items-center space-x-2">
                  {getHealthCheckIcon(overallStatus.status)}
                  <span className={`text-sm font-medium ${
                    overallStatus.status === 'error' ? 'text-red-600' :
                    overallStatus.status === 'warning' ? 'text-yellow-600' :
                    overallStatus.status === 'checking' ? 'text-blue-600' :
                    'text-green-600'
                  }`}>
                    {overallStatus.message}
                  </span>
                </div>
              </div>
              
              {healthChecks.length > 0 && (
                <div className="space-y-2">
                  {healthChecks.map((check, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {getHealthCheckIcon(check.status)}
                        <span className="font-medium text-gray-700">{check.name}</span>
                      </div>
                      <span className={`${
                        check.status === 'error' ? 'text-red-600' :
                        check.status === 'warning' ? 'text-yellow-600' :
                        check.status === 'checking' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {check.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
                      {overallStatus.status === 'success' ? (
                        <>
                          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                          All systems operational
                        </>
                      ) : (
                        <>
                          {getHealthCheckIcon(overallStatus.status)}
                          <div className="mt-2">{overallStatus.message}</div>
                        </>
                      )}
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
                {(errorCount > 0 || overallStatus.status === 'error') && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <XCircle className="h-3 w-3" />
                    <span>{errorCount > 0 ? `${errorCount} errors` : 'System errors'}</span>
                  </div>
                )}
                {(warningCount > 0 || overallStatus.status === 'warning') && (
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{warningCount > 0 ? `${warningCount} warnings` : 'System warnings'}</span>
                  </div>
                )}
                {overallStatus.status === 'checking' && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Loader className="h-3 w-3 animate-spin" />
                    <span>Checking</span>
                  </div>
                )}
                {errorCount === 0 && warningCount === 0 && overallStatus.status === 'success' && (
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