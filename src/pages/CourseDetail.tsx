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
  AlertCircle
} from 'lucide-react';
import { 
  getCourseById,
  getCourseModules,
  getUserProgress,
  updateModuleProgress,
  updateEnrollmentStatus,
  sql,
  type Course,
  type CourseModule,
  type ModuleProgress
} from '../lib/neonDatabase';
import QuizInterface from '../components/QuizInterface';

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
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

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
      console.error('📚 CourseDetail: Errore caricamento corso:', error);
      addNotification('error', 'Errore nel caricamento del corso');
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotifications(prev => [...prev, { type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.message !== message));
    }, 5000);
  };

  const handleCompleteModule = async (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;
    
    // Verifica se il modulo può essere completato
    if (!canCompleteModule(module)) {
      if (module.type === 'quiz') {
        addNotification('error', 'Devi superare il quiz per completare questo modulo');
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
      
      await updateModuleProgress(enrollment[0].id, moduleId, true);
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

  const handleStartQuiz = () => {
    setShowQuiz(true);
    setQuizResult(null);
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

  const canCompleteModule = (module: CourseModule) => {
    // Se è un quiz, deve essere superato per essere completato
    if (module.type === 'quiz') {
      return quizResult?.passed === true;
    }
    // Altri tipi di modulo possono essere completati direttamente
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
                    
                    return (
                      <button
                        key={module.id}
                        onClick={() => setSelectedModule(module)}
                        className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-200 bg-blue-50' 
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            completed ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {completed ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Icon className="h-5 w-5 text-gray-600" />
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
                            <button
                              onClick={() => handleCompleteModule(selectedModule.id)}
                              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Completa Modulo</span>
                            </button>
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
                    {selectedModule.type === 'video' && selectedModule.video_url && !showQuiz && (
                      <div className="mb-6">
                        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <Video className="h-12 w-12 mx-auto mb-3 opacity-75" />
                            <p className="text-sm opacity-75">Video Player</p>
                            <p className="text-xs opacity-50 mt-1">
                              URL: {selectedModule.video_url}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Text Content */}
                    {selectedModule.content && !showQuiz && (
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
