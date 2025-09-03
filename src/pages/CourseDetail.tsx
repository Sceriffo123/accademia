import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft,
  PlayCircle, 
  Clock, 
  Users, 
  Star,
  CheckCircle,
  Lock,
  BookOpen,
  Download,
  FileText,
  Video,
  Award,
  BarChart3
} from 'lucide-react';
import { 
  getCourseById,
  getCourseModules,
  getUserProgress,
  updateModuleProgress,
  type Course,
  type CourseModule,
  type ModuleProgress
} from '../lib/neonDatabase';

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [progress, setProgress] = useState<ModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [notifications, setNotifications] = useState<{type: 'success' | 'error' | 'info', message: string}[]>([]);

  useEffect(() => {
    if (courseId && profile?.id) {
      loadCourseData();
    }
  }, [courseId, profile?.id]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      console.log('📚 CourseDetail: Caricamento corso:', courseId);
      
      const [courseData, modulesData, progressData] = await Promise.all([
        getCourseById(courseId!),
        getCourseModules(courseId!),
        getUserProgress(profile!.id, courseId!)
      ]);

      setCourse(courseData);
      setModules(modulesData);
      setProgress(progressData);
      
      // Seleziona il primo modulo non completato o il primo modulo
      const firstIncomplete = modulesData.find(m => 
        !progressData.some(p => p.module_id === m.id && p.completed)
      );
      setSelectedModule(firstIncomplete || modulesData[0]);
      
      console.log('📚 CourseDetail: Dati caricati:', {
        course: courseData?.title,
        modules: modulesData.length,
        progress: progressData.length
      });
    } catch (error) {
      console.error('Errore caricamento corso:', error);
      addNotification('error', 'Errore nel caricamento del corso');
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== notifications.find(n => n.message === message)));
    }, 5000);
  };

  const handleCompleteModule = async (moduleId: string) => {
    try {
      await updateModuleProgress(profile!.id, moduleId, true);
      await loadCourseData(); // Refresh data
      addNotification('success', 'Modulo completato!');
    } catch (error) {
      console.error('Errore completamento modulo:', error);
      addNotification('error', 'Errore nel completamento del modulo');
    }
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
    const completedModules = progress.filter(p => p.completed).length;
    return Math.round((completedModules / modules.length) * 100);
  };

  const isModuleCompleted = (moduleId: string) => {
    return progress.some(p => p.module_id === moduleId && p.completed);
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage()}%` }}
                      ></div>
                    </div>
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
                              {module.duration}
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
                            <span>{selectedModule.duration}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {React.createElement(getModuleIcon(selectedModule.type), { className: "h-4 w-4" })}
                            <span className="capitalize">{selectedModule.type}</span>
                          </div>
                        </div>
                      </div>
                      
                      {!isModuleCompleted(selectedModule.id) && (
                        <button
                          onClick={() => handleCompleteModule(selectedModule.id)}
                          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Completa Modulo</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {selectedModule.type === 'video' && selectedModule.video_url && (
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

                    {selectedModule.content && (
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700">
                          {selectedModule.content}
                        </div>
                      </div>
                    )}

                    {selectedModule.file_path && (
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

                    {isModuleCompleted(selectedModule.id) && (
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
    </div>
  );
}
