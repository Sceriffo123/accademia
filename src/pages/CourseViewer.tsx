import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle, 
  Award, 
  ArrowLeft,
  FileText,
  Video,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { 
  getAllCourses, 
  checkUserEnrollment, 
  updateEnrollmentStatus,
  getCourseModules,
  getQuizzesByModuleId,
  getQuizQuestions,
  type Course, 
  type Enrollment,
  type CourseModule as DBCourseModule
} from '../lib/neonDatabase';
import { useAuth } from '../contexts/AuthContext';
import QuizComponent, { type QuizData } from '../components/QuizComponent';

interface CourseModule {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'video' | 'document' | 'quiz';
  content: string;
  duration: string;
  completed: boolean;
  order: number;
}

export default function CourseViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [currentModule, setCurrentModule] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseData();
    }
  }, [courseId, user]);

  const fetchCourseData = async () => {
    if (!courseId || !user) return;
    
    try {
      setLoading(true);
      
      // Carica dati corso
      const coursesData = await getAllCourses();
      const courseData = coursesData.find((c: Course) => c.id === courseId);
      
      if (!courseData) {
        navigate('/education');
        return;
      }
      
      // Verifica iscrizione
      const enrollmentData = await checkUserEnrollment(user.id, courseId);
      if (!enrollmentData) {
        navigate('/education');
        return;
      }
      
      setCourse(courseData);
      setEnrollment(enrollmentData);
      
      // Carica moduli reali dal database
      const courseModules = await getCourseModules(courseData.id);
      
      // Converti moduli database in formato UI
      const uiModules: CourseModule[] = await Promise.all(
        courseModules.map(async (dbModule: DBCourseModule) => {
          let content = '';
          
          if (dbModule.type === 'lesson') {
            content = `
              <h2>${dbModule.title}</h2>
              <p>${dbModule.description}</p>
              <div class="bg-blue-50 p-4 rounded-lg">
                <p>📚 <strong>Materiali di studio</strong></p>
                <p>🎯 <strong>Esercitazioni pratiche</strong></p>
                <p>📊 <strong>Casi studio reali</strong></p>
              </div>
            `;
          } else if (dbModule.type === 'quiz') {
            content = `
              <h2>Quiz di Valutazione</h2>
              <p>Completa il quiz per ottenere il certificato del corso.</p>
              <div class="bg-amber-50 p-4 rounded-lg">
                <p><strong>⚠️ Punteggio minimo richiesto:</strong> ${courseData.passing_score}%</p>
                <p><strong>🕒 Tempo disponibile:</strong> 30 minuti</p>
                <p><strong>🔄 Tentativi:</strong> Massimo 3</p>
              </div>
            `;
          } else {
            content = `<h2>${dbModule.title}</h2><p>${dbModule.description}</p>`;
          }
          
          return {
            id: dbModule.id,
            title: dbModule.title,
            description: dbModule.description,
            type: dbModule.type as 'text' | 'video' | 'document' | 'quiz',
            content,
            duration: `${dbModule.duration_minutes || 30} min`,
            completed: enrollmentData.status === 'completed',
            order: dbModule.order_num
          };
        })
      );
      
      // Se non ci sono moduli nel database, usa moduli demo
      if (uiModules.length === 0) {
        const demoModules: CourseModule[] = [
          {
            id: '1',
            title: 'Introduzione al Corso',
            description: 'Panoramica generale degli argomenti trattati',
            type: 'text',
            content: `
              <h2>Benvenuto nel corso: ${courseData.title}</h2>
              <p>Questo corso ti fornirà una comprensione completa degli argomenti trattati.</p>
              <h3>Obiettivi del corso:</h3>
              <ul>
                <li>Comprendere i concetti fondamentali</li>
                <li>Applicare le conoscenze in contesti pratici</li>
                <li>Superare il quiz finale con almeno ${courseData.passing_score}%</li>
              </ul>
              <p><strong>Durata stimata:</strong> ${courseData.duration}</p>
              <p><strong>Livello:</strong> ${courseData.level === 'beginner' ? 'Base' : courseData.level === 'intermediate' ? 'Intermedio' : 'Avanzato'}</p>
            `,
            duration: '15 min',
            completed: enrollmentData.status !== 'enrolled',
            order: 1
          },
          {
            id: '2',
            title: 'Contenuti Principali',
            description: 'Approfondimento degli argomenti del corso',
            type: 'text',
            content: `
              <h2>Contenuti Principali</h2>
              <p>${courseData.description}</p>
              <h3>Argomenti trattati:</h3>
              <div class="bg-blue-50 p-4 rounded-lg">
                <p>📚 <strong>Materiali di studio</strong></p>
                <p>🎯 <strong>Esercitazioni pratiche</strong></p>
                <p>📊 <strong>Casi studio reali</strong></p>
                <p>✅ <strong>Verifiche intermedie</strong></p>
              </div>
            `,
            duration: '45 min',
            completed: false,
            order: 2
          },
          {
            id: '3',
            title: 'Quiz Finale',
            description: 'Verifica delle competenze acquisite',
            type: 'quiz',
            content: `
              <h2>Quiz di Valutazione</h2>
              <p>Completa il quiz per ottenere il certificato del corso.</p>
              <div class="bg-amber-50 p-4 rounded-lg">
                <p><strong>⚠️ Punteggio minimo richiesto:</strong> ${courseData.passing_score}%</p>
                <p><strong>🕒 Tempo disponibile:</strong> 30 minuti</p>
                <p><strong>🔄 Tentativi:</strong> Massimo 3</p>
              </div>
            `,
            duration: '30 min',
            completed: false,
            order: 3
          }
        ];
        setModules(demoModules);
      } else {
        setModules(uiModules.sort((a, b) => a.order - b.order));
      }
      
      // Calcola progresso
      const modulesToUse = uiModules.length > 0 ? uiModules : [];
      const completedModules = modulesToUse.filter(m => m.completed).length;
      setProgress(modulesToUse.length > 0 ? (completedModules / modulesToUse.length) * 100 : 0);
      
      // Carica quiz per il corso
      await loadQuizData(courseData.id, uiModules.length > 0 ? uiModules : []);
      
    } catch (error) {
      console.error('Errore caricamento corso:', error);
      navigate('/education');
    } finally {
      setLoading(false);
    }
  };

  const loadQuizData = async (courseId: string, courseModules: CourseModule[]) => {
    try {
      // Trova il modulo quiz
      const quizModule = courseModules.find(m => m.type === 'quiz');
      if (!quizModule) {
        console.log('Nessun modulo quiz trovato per questo corso');
        return;
      }
      
      // Carica quiz dal database
      const quizzes = await getQuizzesByModuleId(quizModule.id);
      if (quizzes.length === 0) {
        console.log('Nessun quiz trovato per il modulo');
        return;
      }
      
      const quiz = quizzes[0]; // Prendi il primo quiz del modulo
      
      // Carica domande del quiz
      const questions = await getQuizQuestions(quiz.id);
      
      // Converti in formato QuizData
      const quizData: QuizData = {
        id: quiz.id,
        course_id: courseId,
        title: quiz.title,
        description: quiz.description || 'Verifica delle competenze acquisite durante il corso',
        time_limit: quiz.time_limit || 30,
        passing_score: quiz.passing_score || 85,
        max_attempts: quiz.max_attempts || 3,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          points: q.points || 1
        }))
      };
      
      setQuizData(quizData);
    } catch (error) {
      console.error('Errore caricamento quiz:', error);
      // Fallback a quiz demo se non riesce a caricare dal database
      const demoQuiz: QuizData = {
        id: `quiz-${courseId}`,
        course_id: courseId,
        title: 'Quiz Finale',
        description: 'Verifica delle competenze acquisite durante il corso',
        time_limit: 30,
        passing_score: 85,
        max_attempts: 3,
        questions: [
          {
            id: 'q1',
            question: 'Domanda di esempio per questo corso',
            options: [
              'Opzione A',
              'Opzione B',
              'Opzione C',
              'Opzione D'
            ],
            correct_answer: 0,
            explanation: 'Questa è una domanda di esempio.',
            points: 1
          }
        ]
      };
      setQuizData(demoQuiz);
    }
  };

  const handleModuleComplete = async (moduleIndex: number) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].completed = true;
    setModules(updatedModules);
    
    // Calcola nuovo progresso
    const completedModules = updatedModules.filter(m => m.completed).length;
    const newProgress = (completedModules / updatedModules.length) * 100;
    setProgress(newProgress);
    
    // Se corso completato, aggiorna stato nel database
    if (newProgress === 100 && enrollment) {
      try {
        await updateEnrollmentStatus(enrollment.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: 85 // Demo score
        });
        setEnrollment({...enrollment, status: 'completed'});
      } catch (error) {
        console.error('Errore aggiornamento stato corso:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Corso non trovato</h2>
          <p className="text-gray-600 mb-4">Non hai accesso a questo corso o non esiste.</p>
          <button
            onClick={() => navigate('/education')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Torna ai Corsi
          </button>
        </div>
      </div>
    );
  }

  const currentModuleData = modules[currentModule];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/education')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Torna ai corsi"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{course.title}</h1>
                <p className="text-sm text-gray-600">Istruttore: {course.instructor}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Progresso</p>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
                </div>
              </div>
              
              {enrollment.status === 'completed' && (
                <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  <Award className="h-4 w-4" />
                  <span>Scarica Certificato</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Moduli */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Moduli del Corso
              </h3>
              
              <div className="space-y-2">
                {modules.map((module, index) => (
                  <button
                    key={module.id}
                    onClick={() => setCurrentModule(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentModule === index 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          module.completed 
                            ? 'bg-green-100 text-green-600' 
                            : currentModule === index
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {module.completed ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : module.type === 'quiz' ? (
                            <BarChart3 className="h-4 w-4" />
                          ) : module.type === 'video' ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{module.title}</p>
                          <p className="text-xs text-gray-500">{module.duration}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contenuto Modulo */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{currentModuleData.title}</h2>
                    <p className="text-gray-600 mt-1">{currentModuleData.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {currentModuleData.type === 'video' ? (
                  <div className="bg-gray-100 rounded-lg p-8">
                    <p className="text-gray-500">Player video sarà disponibile nella prossima versione</p>
                  </div>
                ) : currentModuleData.type === 'quiz' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    {!showQuiz ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <BarChart3 className="w-6 h-6 text-yellow-600" />
                          <h3 className="text-lg font-semibold text-yellow-800">Quiz di Valutazione</h3>
                        </div>
                        <p className="text-yellow-700 mb-4">
                          Completa questo quiz per verificare le tue competenze acquisite.
                        </p>
                        {quizData && (
                          <div className="mb-4 text-sm text-yellow-700">
                            <p><strong>Tempo limite:</strong> {quizData.time_limit} minuti</p>
                            <p><strong>Punteggio minimo:</strong> {quizData.passing_score}%</p>
                            <p><strong>Tentativi disponibili:</strong> {quizData.max_attempts}</p>
                          </div>
                        )}
                        <button 
                          onClick={() => setShowQuiz(true)}
                          className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          Inizia Quiz
                        </button>
                      </>
                    ) : (
                      <div>
                        {quizData && (
                          <QuizComponent
                            quiz={quizData}
                            onComplete={(result) => {
                              console.log('Quiz completato:', result);
                              // Non chiudere immediatamente - lascia che l'utente veda i risultati
                              if (result.passed) {
                                handleModuleComplete(currentModule);
                              }
                            }}
                            onCancel={() => setShowQuiz(false)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    <div 
                      dangerouslySetInnerHTML={{ __html: currentModuleData.content }}
                      className="text-gray-700 leading-relaxed"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between p-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentModule(Math.max(0, currentModule - 1))}
                  disabled={currentModule === 0}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Precedente</span>
                </button>
                
                <div className="flex items-center space-x-4">
                  {!currentModuleData.completed && (
                    <button
                      onClick={() => handleModuleComplete(currentModule)}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Segna come Completato</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setCurrentModule(Math.min(modules.length - 1, currentModule + 1))}
                    disabled={currentModule === modules.length - 1}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Successivo</span>
                    <PlayCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
