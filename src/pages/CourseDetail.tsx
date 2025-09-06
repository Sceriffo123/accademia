import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft,
  Clock, 
  Users, 
  Star,
  CheckCircle,
  BookOpen,
  Download,
  FileText,
  Video,
  Award,
  BarChart3,
  AlertCircle,
  Play
} from 'lucide-react';
import { 
  getCourseById,
  getCourseModules,
  getUserProgress,
  updateModuleProgress,
  updateEnrollmentStatus,
  getQuizByModuleId,
  getQuizAttempts,
  sql,
  type Course,
  type CourseModule,
  type ModuleProgress
} from '../lib/neonDatabase';
import QuizInterface from '../components/QuizInterface';
import PDFViewer from '../components/PDFViewer';
import VideoPlayer from '../components/VideoPlayer';
import RichContentViewer from '../components/RichContentViewer';

export default function CourseDetail() {
  console.log('📚 CourseDetail: Componente caricato!');
  console.log('📚 CourseDetail: URL corrente:', window.location.pathname);
  
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  console.log('📚 CourseDetail: courseId da useParams:', courseId);
  console.log('📚 CourseDetail: profile:', profile);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [progress, setProgress] = useState<ModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [notifications, setNotifications] = useState<{type: 'success' | 'error' | 'info', message: string}[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<{passed: boolean, score: number} | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [moduleTimers, setModuleTimers] = useState<Record<string, { startTime: number, isActive: boolean }>>({});
  const [moduleTimeSpent, setModuleTimeSpent] = useState<Record<string, number>>({});
  const [documentProgress, setDocumentProgress] = useState<Record<string, { scrollPercent: number, readingComplete: boolean }>>({});

  useEffect(() => {
    console.log('📚 CourseDetail: useEffect chiamato con:', { courseId, profileId: profile?.id });
    if (courseId && profile?.id) {
      console.log('📚 CourseDetail: Condizioni soddisfatte, chiamando loadCourseData');
      loadCourseData();
    } else {
      console.log('📚 CourseDetail: Condizioni NON soddisfatte:', { 
        hasCourseId: !!courseId, 
        hasProfileId: !!profile?.id 
      });
    }
  }, [courseId, profile?.id]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      console.log('📚 CourseDetail: Caricamento corso:', courseId);
      console.log('📚 CourseDetail: User ID:', profile?.id);
      console.log('📚 CourseDetail: URL params:', { courseId });
      console.log('📚 CourseDetail: Current location:', window.location.pathname);
      
      const [courseData, modulesData, progressData] = await Promise.all([
        getCourseById(courseId!),
        getCourseModules(courseId!),
        getUserProgress(profile!.id, courseId!)
      ]);
      
      // Carica stato quiz completati per ogni modulo quiz
      const quizModules = modulesData.filter(m => m.type === 'quiz');
      const allQuizAttempts: any[] = [];
      
      for (const module of quizModules) {
        try {
          const quiz = await getQuizByModuleId(module.id);
          if (quiz) {
            const attempts = await getQuizAttempts(profile!.id, quiz.id);
            allQuizAttempts.push(...attempts.map(a => ({...a, moduleId: module.id, quizId: quiz.id})));
          }
        } catch (error) {
          console.error('Errore caricamento tentativi quiz per modulo:', module.id, error);
        }
      }
      
      setQuizAttempts(allQuizAttempts);

      console.log('📚 CourseDetail: Risultati caricamento:', {
        course: courseData,
        modules: modulesData,
        progress: progressData
      });

      setCourse(courseData);
      setModules(modulesData);
      setProgress(Array.isArray(progressData) ? progressData : []);
      
      // Seleziona il primo modulo non completato o il primo modulo
      const progressArray = Array.isArray(progressData) ? progressData : [];
      const firstIncomplete = modulesData.find(m => 
        !progressArray.some(p => p.module_id === m.id && p.completed)
      );
      setSelectedModule(firstIncomplete || modulesData[0]);
      
      console.log('📚 CourseDetail: Dati caricati:', {
        course: courseData?.title,
        modules: modulesData.length,
        progress: (progressData || []).length
      });
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      addNotification('error', 'Errore nel caricamento del corso');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setModuleTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(moduleId => {
          if (updated[moduleId].isActive) {
            const timeSpent = Math.floor((Date.now() - updated[moduleId].startTime) / 1000);
            setModuleTimeSpent(prev => ({
              ...prev,
              [moduleId]: (prev[moduleId] || 0) + timeSpent
            }));
            updated[moduleId].startTime = Date.now(); // Reset per evitare accumulo
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotifications(prev => [...prev, { type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.message !== message));
    }, 5000);
  };

  const handleCompleteModule = async (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;
    
    // Ferma il timer se attivo
    stopModuleTimer(moduleId);
    
    // Verifica se il modulo può essere completato
    if (!canCompleteModule(module)) {
      if (module.type === 'quiz') {
        addNotification('error', 'Devi superare il quiz per completare questo modulo');
      } else {
        const timeSpent = getModuleTimeSpent(moduleId);
        const minTime = getMinTimeRequired(module.type);
        addNotification('error', `Devi studiare almeno ${minTime} secondi per completare questo modulo. Tempo attuale: ${timeSpent}s`);
      }
      return;
    }
    
    try {
      // Trova l'enrollment ID per questo utente e corso
      const enrollment = await sql`
        SELECT id FROM enrollments 
        WHERE user_id = ${profile!.id} AND course_id = ${courseId}
      `;
      
      if (enrollment.length === 0) {
        addNotification('error', 'Iscrizione al corso non trovata');
        return;
      }
      
      const timeSpent = getModuleTimeSpent(moduleId);
      await updateModuleProgress(enrollment[0].id, moduleId, true, 100, timeSpent);
      await loadCourseData(); // Refresh data
      addNotification('success', 'Modulo completato!');
      
      // Controlla se il corso può essere completato
      setTimeout(() => {
        if (canCompleteCourse()) {
          addNotification('info', 'Hai completato tutti i moduli! Puoi ora completare il corso.');
        }
      }, 1000);
    } catch (error) {
      console.error('Errore completamento modulo:', error);
      addNotification('error', 'Errore nel completamento del modulo');
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedModule) return;
    
    try {
      const quiz = await getQuizByModuleId(selectedModule.id);
      if (!quiz) {
        addNotification('error', 'Quiz non trovato per questo modulo');
        return;
      }
      
      // Controlla tentativi precedenti
      const attempts = await getQuizAttempts(profile!.id, quiz.id);
      const passedAttempt = attempts.find(a => a.passed);
      
      if (passedAttempt) {
        addNotification('info', 'Hai già superato questo quiz!');
        setQuizResult({ passed: true, score: passedAttempt.score });
        return;
      }
      
      // Controlla limite tentativi
      if (quiz.max_attempts && attempts.length >= quiz.max_attempts) {
        addNotification('error', `Hai raggiunto il limite di ${quiz.max_attempts} tentativi per questo quiz`);
        return;
      }
      
      setShowQuiz(true);
      setQuizResult(null);
    } catch (error) {
      console.error('Errore avvio quiz:', error);
      addNotification('error', 'Errore nel caricamento del quiz');
    }
  };

  const handleQuizComplete = async (passed: boolean, score: number) => {
    setQuizResult({ passed, score });
    setShowQuiz(false);
    
    if (passed) {
      // Completa automaticamente il modulo se il quiz è superato
      await handleCompleteModule(selectedModule!.id);
      addNotification('success', `Quiz superato! Punteggio: ${score}%`);
    } else {
      addNotification('error', `Quiz non superato. Punteggio: ${score}%. Riprova!`);
    }
  };

  const handleQuizCancel = () => {
    setShowQuiz(false);
    setQuizResult(null);
  };

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'document': return FileText;
      case 'quiz': return BarChart3;
      default: return BookOpen;
    }
  };

  const getProgressPercentage = () => {
    if (modules.length === 0) return 0;
    const progressArray = Array.isArray(progress) ? progress : [];
    const completedModules = progressArray.filter(p => p.completed).length;
    return Math.round((completedModules / modules.length) * 100);
  };

  // Avvia timer per un modulo
  const startModuleTimer = (moduleId: string) => {
    setModuleTimers(prev => ({
      ...prev,
      [moduleId]: { startTime: Date.now(), isActive: true }
    }));
  };

  const stopModuleTimer = (moduleId: string) => {
    setModuleTimers(prev => {
      const timer = prev[moduleId];
      if (timer && timer.isActive) {
        const timeSpent = Math.floor((Date.now() - timer.startTime) / 1000);
        setModuleTimeSpent(prevTime => ({
          ...prevTime,
          [moduleId]: (prevTime[moduleId] || 0) + timeSpent
        }));
        return {
          ...prev,
          [moduleId]: { ...timer, isActive: false }
        };
      }
      return prev;
    });
  };

  const getModuleTimeSpent = (moduleId: string): number => {
    const baseTime = moduleTimeSpent[moduleId] || 0;
    const timer = moduleTimers[moduleId];
    if (timer && timer.isActive) {
      const currentTime = Math.floor((Date.now() - timer.startTime) / 1000);
      return baseTime + currentTime;
    }
    return baseTime;
  };

  const getMinTimeRequired = (moduleType: string): number => {
    switch (moduleType) {
      case 'lesson': return 30;
      case 'video': return 60;
      case 'document': return 45;
      case 'quiz': return 0;
      default: return 30;
    }
  };

  // Document reading functions
  const handleDocumentScroll = (moduleId: string, scrollPercent: number) => {
    setDocumentProgress(prev => ({
      ...prev,
      [moduleId]: {
        scrollPercent: Math.max(prev[moduleId]?.scrollPercent || 0, scrollPercent),
        readingComplete: scrollPercent >= 90 // Consider complete at 90% scroll
      }
    }));
  };

  const getDocumentProgress = (moduleId: string): number => {
    return documentProgress[moduleId]?.scrollPercent || 0;
  };

  const isDocumentReadingComplete = (moduleId: string): boolean => {
    return documentProgress[moduleId]?.readingComplete || false;
  };

  // Module prerequisite functions
  const isModuleUnlocked = (module: CourseModule, moduleIndex: number): boolean => {
    // Il primo modulo è sempre sbloccato
    if (moduleIndex === 0) return true;
    
    // Controlla se tutti i moduli precedenti sono completati
    const progressArray = Array.isArray(progress) ? progress : [];
    const previousModules = modules.slice(0, moduleIndex);
    
    return previousModules.every(prevModule => 
      progressArray.some(p => p.module_id === prevModule.id && p.completed)
    );
  };

  const getNextUnlockedModule = (): CourseModule | null => {
    const progressArray = Array.isArray(progress) ? progress : [];
    return modules.find(module => 
      !progressArray.some(p => p.module_id === module.id && p.completed)
    ) || null;
  };

  const canCompleteModule = (module: CourseModule) => {
    // Se è un quiz, controlla se è già stato superato
    if (module.type === 'quiz') {
      const moduleAttempts = quizAttempts.filter(a => a.moduleId === module.id);
      const passedAttempt = moduleAttempts.find(a => a.passed);
      return passedAttempt || quizResult?.passed === true;
    }
    
    // Per moduli document, controlla anche il progresso di lettura
    if (module.type === 'document') {
      const timeSpent = getModuleTimeSpent(module.id);
      const minTimeRequired = getMinTimeRequired(module.type);
      const readingComplete = isDocumentReadingComplete(module.id);
      
      if (timeSpent < minTimeRequired || !readingComplete) {
        console.log(`📄 Documento ${module.id} richiede tempo: ${timeSpent}/${minTimeRequired}s e lettura completa: ${readingComplete}`);
        return false;
      }
      return true;
    }
    
    // Per altri tipi di modulo, controlla tempo minimo di studio
    const timeSpent = getModuleTimeSpent(module.id);
    const minTimeRequired = getMinTimeRequired(module.type);
    
    if (timeSpent < minTimeRequired) {
      console.log(`⏱️ Modulo ${module.id} richiede almeno ${minTimeRequired}s, attuale: ${timeSpent}s`);
      return false;
    }
    
    return true;
  };

  const canCompleteCourse = () => {
    if (modules.length === 0) return false;
    
    const progressArray = Array.isArray(progress) ? progress : [];
    const completedModules = progressArray.filter(p => p.completed).length;
    
    // Tutti i moduli devono essere completati
    const allModulesCompleted = completedModules === modules.length;
    
    // Verifica che tutti i quiz siano stati superati
    const quizModules = modules.filter(m => m.type === 'quiz');
    const allQuizzesPassed = quizModules.every(quiz => 
      progressArray.some(p => p.module_id === quiz.id && p.completed)
    );
    
    return allModulesCompleted && allQuizzesPassed;
  };

  const handleCompleteCourse = async () => {
    try {
      // Trova l'enrollment ID per questo utente e corso
      const enrollment = await sql`
        SELECT id FROM enrollments 
        WHERE user_id = ${profile!.id} AND course_id = ${courseId}
      `;
      
      if (enrollment.length === 0) {
        addNotification('error', 'Iscrizione al corso non trovata');
        return;
      }
      
      await updateEnrollmentStatus(enrollment[0].id, 'completed');
      setCourseCompleted(true);
      setShowCompletionModal(true);
      addNotification('success', 'Congratulazioni! Hai completato il corso!');
    } catch (error) {
      console.error('Errore completamento corso:', error);
      addNotification('error', 'Errore nel completamento del corso');
    }
  };

  const isModuleCompleted = (moduleId: string) => {
    const progressArray = Array.isArray(progress) ? progress : [];
    return progressArray.some(p => p.module_id === moduleId && p.completed);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Corso non trovato</h3>
          <button 
            onClick={() => navigate('/education')}
            className="text-blue-600 hover:text-blue-700"
          >
            Torna ai corsi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right duration-300 ${
              notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
              notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/education')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Torna ai corsi</span>
            </button>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                    {course.title}
                  </h1>
                  <p className="text-gray-600 mb-4 max-w-3xl">
                    {course.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{course.enrollment_count} iscritti</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-current text-yellow-400" />
                      <span className="font-medium">{course.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{modules.length} moduli</span>
                    </div>
                  </div>
                </div>

                <div className="lg:ml-6">
                  <div className="bg-gray-50 rounded-lg p-4 min-w-[200px]">
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {getProgressPercentage()}%
                      </div>
                      <div className="text-sm text-gray-600">Completato</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage()}%` }}
                      ></div>
                    </div>
                    
                    {canCompleteCourse() && !courseCompleted && (
                      <button
                        onClick={handleCompleteCourse}
                        className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <Award className="h-4 w-4" />
                        <span>Completa Corso</span>
                      </button>
                    )}
                    
                    {courseCompleted && (
                      <div className="w-full flex items-center justify-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                        <Award className="h-4 w-4" />
                        <span>Corso Completato!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Modules List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Moduli del Corso
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {modules.map((module, index) => {
                    const Icon = getModuleIcon(module.type);
                    const completed = isModuleCompleted(module.id);
                    const isSelected = selectedModule?.id === module.id;
                    const unlocked = isModuleUnlocked(module, index);
                    
                    return (
                      <button
                        key={module.id}
                        onClick={() => unlocked ? setSelectedModule(module) : null}
                        disabled={!unlocked}
                        className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                          !unlocked
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            : isSelected 
                              ? 'border-blue-200 bg-blue-50' 
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            completed 
                              ? 'bg-green-100' 
                              : unlocked 
                                ? 'bg-gray-100' 
                                : 'bg-red-100'
                          }`}>
                            {completed ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : unlocked ? (
                              <Icon className="h-5 w-5 text-gray-600" />
                            ) : (
                              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-9a2 2 0 00-2-2M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-6 4h.01" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-500">
                                Modulo {index + 1}
                              </span>
                              {completed && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {!unlocked && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                                  🔒 Bloccato
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                              {module.title}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {module.duration_minutes ? `${module.duration_minutes} min` : '30 min'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Module Content */}
            <div className="lg:col-span-2">
              {selectedModule ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                          {selectedModule.title}
                        </h2>
                        <p className="text-gray-600 mb-4">
                          {selectedModule.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{selectedModule.duration_minutes ? `${selectedModule.duration_minutes} min` : '30 min'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {React.createElement(getModuleIcon(selectedModule.type), { className: "h-4 w-4" })}
                            <span className="capitalize">{selectedModule.type}</span>
                          </div>
                        </div>
                      </div>
                      
                      {!isModuleCompleted(selectedModule.id) && (
                        <div className="flex items-center space-x-2">
                          {selectedModule.type === 'quiz' ? (
                            <div className="flex flex-col items-end space-y-2">
                              <button
                                onClick={handleStartQuiz}
                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <BarChart3 className="h-4 w-4" />
                                <span>Inizia Quiz</span>
                              </button>
                              {quizResult?.passed && (
                                <button
                                  onClick={() => handleCompleteModule(selectedModule.id)}
                                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Completa Modulo</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Timer Display */}
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                      Tempo di studio: {getModuleTimeSpent(selectedModule.id)}s / {getMinTimeRequired(selectedModule.type)}s minimo
                                    </span>
                                  </div>
                                  {moduleTimers[selectedModule.id]?.isActive ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs text-green-600 font-medium">In corso...</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => startModuleTimer(selectedModule.id)}
                                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    >
                                      Avvia Studio
                                    </button>
                                  )}
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${Math.min(100, (getModuleTimeSpent(selectedModule.id) / getMinTimeRequired(selectedModule.type)) * 100)}%` 
                                    }}
                                  ></div>
                                </div>
                                
                                {getModuleTimeSpent(selectedModule.id) < getMinTimeRequired(selectedModule.type) && (
                                  <div className="text-xs text-blue-600">
                                    ⚠️ Devi studiare almeno {getMinTimeRequired(selectedModule.type)} secondi per completare questo modulo
                                  </div>
                                )}
                              </div>

                              {/* Document Content Interface */}
                              {selectedModule.type === 'document' ? (
                                <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                      📄 Documento di Studio
                                    </h3>
                                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                                      <Clock className="h-4 w-4" />
                                      <span>{selectedModule.duration_minutes || 15} min</span>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-white p-4 rounded border mb-4">
                                    <h4 className="font-medium text-gray-800 mb-2">{selectedModule.title}</h4>
                                    <p className="text-gray-600 text-sm mb-3">
                                      Leggi attentamente il documento per completare questo modulo. 
                                      Il sistema traccia il tempo di lettura per garantire un apprendimento efficace.
                                    </p>
                                    
                                    {/* Document Content Area */}
                                    {selectedModule.document_url ? (
                                      <PDFViewer
                                        file={selectedModule.document_url}
                                        onScrollProgress={(progress) => handleDocumentScroll(selectedModule.id, progress)}
                                        className="mb-4"
                                      />
                                    ) : (
                                      <div 
                                        className="bg-gray-50 p-4 rounded border-2 border-dashed border-gray-300 min-h-[300px] overflow-y-auto"
                                        onScroll={(e) => {
                                          const element = e.target as HTMLDivElement;
                                          const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
                                          handleDocumentScroll(selectedModule.id, scrollPercent);
                                        }}
                                      >
                                        <div className="text-center text-gray-500 py-8">
                                          <div className="text-4xl mb-2">📖</div>
                                          <p className="text-sm">
                                            Contenuto del documento sarà visualizzato qui
                                          </p>
                                          <p className="text-xs text-gray-400 mt-1">
                                            (In sviluppo: integrazione con sistema documenti)
                                          </p>
                                          <div className="mt-4 p-4 bg-white rounded border text-left">
                                            <h4 className="font-medium text-gray-800 mb-2">Esempio di Contenuto Documento</h4>
                                            <p className="text-sm text-gray-600 mb-2">
                                              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                                              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                            </p>
                                            <p className="text-sm text-gray-600 mb-2">
                                              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
                                              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                                            </p>
                                            <p className="text-sm text-gray-600 mb-2">
                                              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, 
                                              totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                                            </p>
                                            <p className="text-sm text-gray-600">
                                              <strong>Scorri fino alla fine per completare la lettura del documento.</strong>
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Document Actions */}
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                      <div className="flex items-center space-x-4">
                                        <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm">
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <span>Scarica PDF</span>
                                        </button>
                                        <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 text-sm">
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                          <span>Prendi Note</span>
                                        </button>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        📊 Progresso lettura: {Math.round(getDocumentProgress(selectedModule.id))}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-50 p-6 rounded-lg">
                                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                    Contenuto del Modulo
                                  </h3>
                                  <p className="text-gray-600 mb-4">
                                    Questo modulo contiene informazioni importanti per il tuo percorso di apprendimento.
                                  </p>
                                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <Clock className="h-4 w-4" />
                                    <span>{selectedModule.duration_minutes || 15} min</span>
                                  </div>
                                </div>
                              )}
                              
                              <button
                                onClick={() => handleCompleteModule(selectedModule.id)}
                                disabled={!canCompleteModule(selectedModule)}
                                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                                  canCompleteModule(selectedModule)
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>Completa Modulo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Quiz Interface */}
                    {showQuiz && selectedModule.type === 'quiz' && (
                      <QuizInterface
                        moduleId={selectedModule.id}
                        userId={profile!.id}
                        onComplete={handleQuizComplete}
                        onCancel={handleQuizCancel}
                      />
                    )}

                    {/* Quiz Result */}
                    {quizResult && !showQuiz && (
                      <div className={`mb-6 p-6 rounded-lg border-2 ${
                        quizResult.passed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center space-x-3">
                          {quizResult.passed ? (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          ) : (
                            <AlertCircle className="h-8 w-8 text-red-600" />
                          )}
                          <div>
                            <h3 className={`text-lg font-semibold ${
                              quizResult.passed ? 'text-green-800' : 'text-red-800'
                            }`}>
                              {quizResult.passed ? 'Quiz Superato!' : 'Quiz Non Superato'}
                            </h3>
                            <p className={`text-sm ${
                              quizResult.passed ? 'text-green-600' : 'text-red-600'
                            }`}>
                              Punteggio: {quizResult.score}%
                              {quizResult.passed 
                                ? ' - Ottimo lavoro! Modulo completato.' 
                                : ' - Riprova per superare il quiz.'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Content */}
                    {selectedModule.type === 'video' && !showQuiz && (
                      <div className="mb-6">
                        {selectedModule.video_url ? (
                          <VideoPlayer
                            videoUrl={selectedModule.video_url}
                            onTimeUpdate={(currentTime, duration) => {
                              // Track video watching time
                              const watchPercent = (currentTime / duration) * 100;
                              if (watchPercent >= 80) {
                                handleDocumentScroll(selectedModule.id, 100);
                              }
                            }}
                            onEnded={() => {
                              // Mark as fully watched when video ends
                              handleDocumentScroll(selectedModule.id, 100);
                            }}
                            className="w-full"
                          />
                        ) : (
                          <div className="aspect-video bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center">
                            <div className="text-center text-yellow-800">
                              <Video className="h-12 w-12 mx-auto mb-3" />
                              <p className="text-sm font-medium">Nessun video configurato</p>
                              <p className="text-xs mt-1">
                                Contatta l'amministratore per aggiungere il contenuto video.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Content */}
                    {selectedModule.content && !showQuiz && selectedModule.type === 'lesson' && (
                      <RichContentViewer
                        content={selectedModule.content}
                        onScrollProgress={(progress) => handleDocumentScroll(selectedModule.id, progress)}
                        className="mb-6"
                      />
                    )}

                    {/* Fallback for other content types */}
                    {selectedModule.content && !showQuiz && selectedModule.type !== 'lesson' && (
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700">
                          {selectedModule.content}
                        </div>
                      </div>
                    )}

                    {/* Document Download */}
                    {selectedModule.document_url && !showQuiz && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">Materiale del Modulo</p>
                              <p className="text-sm text-gray-600">File allegato</p>
                            </div>
                          </div>
                          <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
                            <Download className="h-4 w-4" />
                            <span>Scarica</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Module Completed */}
                    {isModuleCompleted(selectedModule.id) && !showQuiz && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">Modulo Completato</p>
                            <p className="text-sm text-green-600">Ottimo lavoro! Puoi procedere al prossimo modulo.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Seleziona un Modulo
                  </h3>
                  <p className="text-gray-600">
                    Scegli un modulo dalla lista per iniziare il tuo percorso di apprendimento.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Congratulazioni!
              </h2>
              <p className="text-gray-600">
                Hai completato con successo il corso <strong>{course?.title}</strong>.
                Ottimo lavoro!
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700">Moduli completati:</span>
                <span className="font-semibold text-green-800">{modules.length}/{modules.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-green-700">Progresso:</span>
                <span className="font-semibold text-green-800">100%</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Continua
              </button>
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  navigate('/education');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Vai ai Corsi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
