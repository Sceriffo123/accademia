import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Bug, 
  CheckCircle, 
  X, 
  ChevronDown, 
  ChevronRight,
  Code,
  Database,
  Shield,
  Zap,
  FileText,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';

interface Problem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'database' | 'syntax' | 'runtime' | 'security' | 'performance';
  title: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  solution?: {
    title: string;
    steps: string[];
    code?: string;
  };
  timestamp: string;
  resolved: boolean;
}

export default function ProblemDetector() {
  // Rimuovi useAuth per evitare errore Context
  // const { profile } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection useEffect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ useEffect SEMPRE chiamato - Hook order consistente
  useEffect(() => {
    // Intercetta errori console
    const originalConsoleError = console.error;
    
    const consoleErrorHandler = (...args: any[]) => {
      try {
        const errorText = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        analyzeProblem(errorText, args);
      } catch (e) {
        // Ignore errors in error handler
      }
      originalConsoleError.apply(console, args);
    };
    
    console.error = consoleErrorHandler;

    // Intercetta errori JavaScript
    const handleError = (event: ErrorEvent) => {
      try {
        const problem: Problem = {
          id: Date.now().toString(),
          severity: 'error',
          category: 'runtime',
          title: 'JavaScript Runtime Error',
          description: event.message,
          file: event.filename,
          line: event.lineno,
          column: event.colno,
          code: event.error?.stack,
          solution: {
            title: 'Fix Runtime Error',
            steps: [
              'Check the browser console for detailed error information',
              'Verify all variables are properly declared',
              'Ensure all imports are correct',
              'Check for typos in function/variable names'
            ]
          },
          timestamp: new Date().toLocaleTimeString(),
          resolved: false
        };
        
        addProblem(problem);
      } catch (e) {
        // Ignore errors in error handler
      }
    };

    // Intercetta promise rejections
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      try {
        const problem: Problem = {
          id: Date.now().toString() + '_promise',
          severity: 'error',
          category: 'runtime',
          title: 'Unhandled Promise Rejection',
          description: String(event.reason),
          solution: {
            title: 'Fix Promise Rejection',
            steps: [
              'Add proper .catch() handlers to your promises',
              'Use try-catch blocks in async functions',
              'Check network requests for proper error handling',
              'Verify API endpoints are accessible'
            ]
          },
          timestamp: new Date().toLocaleTimeString(),
          resolved: false
        };
        
        addProblem(problem);
      } catch (e) {
        // Ignore errors in error handler
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []); // Empty dependency array - only run once

  const analyzeProblem = (errorText: string, args: any[]) => {
    let problem: Problem | null = null;

    // Database Errors
    if (errorText.includes('NeonDbError') || errorText.includes('bind message')) {
      problem = {
        id: Date.now().toString(),
        severity: 'error',
        category: 'database',
        title: 'Database Query Error',
        description: errorText,
        solution: {
          title: 'Fix Database Query',
          steps: [
            'Check SQL query syntax and parameter binding',
            'Verify the number of parameters matches placeholders',
            'Ensure database connection is active',
            'Check table schema matches query expectations'
          ],
          code: `// Example fix for parameter binding:
const result = await sql\`
  UPDATE users 
  SET email = \${email}, full_name = \${fullName}
  WHERE id = \${id}
\`;`
        },
        timestamp: new Date().toLocaleTimeString(),
        resolved: false
      };
    }
    
    // Syntax Errors
    else if (errorText.includes('SyntaxError') || errorText.includes('Unexpected token')) {
      problem = {
        id: Date.now().toString(),
        severity: 'error',
        category: 'syntax',
        title: 'Syntax Error Detected',
        description: errorText,
        solution: {
          title: 'Fix Syntax Error',
          steps: [
            'Check for missing brackets, parentheses, or quotes',
            'Verify proper JSX syntax in React components',
            'Ensure all imports have correct syntax',
            'Check for trailing commas in objects/arrays'
          ]
        },
        timestamp: new Date().toLocaleTimeString(),
        resolved: false
      };
    }
    
    // Variable Declaration Errors
    else if (errorText.includes('already been declared') || errorText.includes('duplicate')) {
      const match = errorText.match(/symbol "(\w+)" has already been declared/);
      const variableName = match ? match[1] : 'variable';
      
      problem = {
        id: Date.now().toString(),
        severity: 'error',
        category: 'syntax',
        title: 'Duplicate Variable Declaration',
        description: `Variable "${variableName}" is declared multiple times in the same scope`,
        solution: {
          title: 'Fix Duplicate Declaration',
          steps: [
            `Remove duplicate declaration of "${variableName}"`,
            'Use different variable names for different purposes',
            'Check for copy-paste errors in code',
            'Consider using block scope with let/const'
          ],
          code: `// Instead of:
const ${variableName} = [];
const ${variableName} = []; // ❌ Error

// Use:
const ${variableName} = [];
// ... use ${variableName} here`
        },
        timestamp: new Date().toLocaleTimeString(),
        resolved: false
      };
    }
    
    // Network/API Errors
    else if (errorText.includes('Failed to fetch') || errorText.includes('Network Error')) {
      problem = {
        id: Date.now().toString(),
        severity: 'warning',
        category: 'runtime',
        title: 'Network/API Error',
        description: errorText,
        solution: {
          title: 'Fix Network Issue',
          steps: [
            'Check internet connection',
            'Verify API endpoint URLs are correct',
            'Check CORS settings if calling external APIs',
            'Add proper error handling for network requests'
          ]
        },
        timestamp: new Date().toLocaleTimeString(),
        resolved: false
      };
    }

    if (problem) {
      addProblem(problem);
    }
  };

  const addProblem = (problem: Problem) => {
    setProblems(prev => {
      // Evita duplicati basati su descrizione simile
      const isDuplicate = prev.some(p => 
        p.description === problem.description && 
        Date.now() - new Date(p.timestamp).getTime() < 5000 // 5 secondi
      );
      
      if (isDuplicate) return prev;
      
      const newProblems = [problem, ...prev.slice(0, 19)]; // Max 20 problemi
      
      // Auto-show per errori critici
      if (problem.severity === 'error') {
        setIsVisible(true);
        // Auto-expand solo su desktop, non su mobile
        if (!isMobile) {
          setIsMinimized(false);
        }
      }
      
      return newProblems;
    });
  };

  const markAsResolved = (problemId: string) => {
    setProblems(prev => prev.map(p => 
      p.id === problemId ? { ...p, resolved: true } : p
    ));
  };

  const clearAllProblems = () => {
    setProblems([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'syntax': return <Code className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const activeProblems = problems.filter(p => !p.resolved);
  const errorCount = activeProblems.filter(p => p.severity === 'error').length;
  const warningCount = activeProblems.filter(p => p.severity === 'warning').length;

  if (!isVisible) {
    // Mostra pulsante floating solo se ci sono problemi attivi
    if (activeProblems.length === 0) {
      return null;
    }
    
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg transition-all ${
            errorCount > 0 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-yellow-500 text-white'
          }`}
        >
          <Bug className="h-4 w-4" />
          <span className="font-medium">
            {errorCount > 0 ? `${errorCount} Errors` : `${warningCount} Warnings`}
          </span>
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
            {activeProblems.length}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-[90vw] sm:w-96 max-h-[80vh] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`${isMobile ? 'p-2' : 'p-4'} border-b flex items-center justify-between ${
        errorCount > 0 ? 'bg-red-50 border-red-200' :
        warningCount > 0 ? 'bg-yellow-50 border-yellow-200' :
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center space-x-2">
          <Bug className={`h-5 w-5 ${
            errorCount > 0 ? 'text-red-600' :
            warningCount > 0 ? 'text-yellow-600' :
            'text-green-600'
          }`} />
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>Problems</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            errorCount > 0 ? 'bg-red-100 text-red-700' :
            warningCount > 0 ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {activeProblems.length} active
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <button
            onClick={clearAllProblems}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear all problems"
          >
            <RefreshCw className="h-4 w-4" />
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
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {activeProblems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">No problems detected</p>
              <p className="text-sm">Your code is running smoothly!</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {activeProblems.map((problem) => (
                <div
                  key={problem.id}
                  className={`border rounded-lg p-3 ${getSeverityColor(problem.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      {getSeverityIcon(problem.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(problem.category)}
                          <h4 className="font-medium text-gray-900 text-sm">
                            {problem.title}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {problem.description}
                        </p>
                        {problem.file && (
                          <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                            <FileText className="h-3 w-3" />
                            <span>{problem.file}:{problem.line}:{problem.column}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => setExpandedProblem(
                          expandedProblem === problem.id ? null : problem.id
                        )}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandedProblem === problem.id ? 
                          <ChevronDown className="h-3 w-3" /> : 
                          <ChevronRight className="h-3 w-3" />
                        }
                      </button>
                      <button
                        onClick={() => markAsResolved(problem.id)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Mark as resolved"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedProblem === problem.id && problem.solution && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="font-medium text-gray-900 text-sm mb-2">
                        💡 {problem.solution.title}
                      </h5>
                      <ol className="text-xs text-gray-600 space-y-1 mb-3">
                        {problem.solution.steps.map((step, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="font-medium text-blue-600 mt-0.5">
                              {index + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                      
                      {problem.solution.code && (
                        <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono relative">
                          <button
                            onClick={() => copyToClipboard(problem.solution!.code!)}
                            className="absolute top-1 right-1 p-1 text-gray-400 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <pre className="whitespace-pre-wrap pr-8">
                            {problem.solution.code}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {isMinimized && activeProblems.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              {errorCount > 0 && (
                <span className="text-red-600 font-medium">
                  {errorCount} errors
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-yellow-600 font-medium">
                  {warningCount} warnings
                </span>
              )}
            </div>
            <span className="text-gray-500 text-xs">
              {problems[0]?.timestamp}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}