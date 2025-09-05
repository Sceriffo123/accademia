import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  GraduationCap, 
  PlayCircle, 
  Clock, 
  Users, 
  Star,
  CheckCircle,
  Lock,
  BookOpen,
  AlertCircle,
  Award,
  Target,
  TrendingUp
} from 'lucide-react';
import { 
  getAllCourses, 
  enrollUserInCourse, 
  getUserEnrollments,
  type Course as DBCourse,
  type Enrollment 
} from '../lib/neonDatabase';

interface Course extends DBCourse {
  completed: boolean;
  locked: boolean;
  isEnrolled: boolean;
}

export default function Education() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [notifications, setNotifications] = useState<{type: 'success' | 'error' | 'info', message: string}[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Caricamento corsi dal database
  useEffect(() => {
    if (profile?.id) {
      loadCoursesAndEnrollments();
    } else {
      loadCourses();
    }
  }, [profile?.id]);

  const loadCoursesAndEnrollments = async () => {
    try {
      setLoading(true);
      console.log('🎓 Education: Caricamento corsi e iscrizioni...');
      
      // Carica corsi e iscrizioni in parallelo
      const [coursesData, userEnrollments] = await Promise.all([
        getAllCourses(),
        getUserEnrollments(profile!.id)
      ]);
      
      console.log('🎓 Education: Corsi caricati:', coursesData.length);
      console.log('🎓 Education: Iscrizioni trovate:', userEnrollments);
      
      // Trasforma i dati del database nel formato dell'interfaccia
      const transformedCourses: Course[] = coursesData.map(course => {
        const enrollment = userEnrollments.find(e => e.course_id === course.id);
        console.log(`🎓 Education: Corso ${course.title} (${course.id}) - Enrollment:`, enrollment);
        console.log(`🎓 Education: Enrollment course_id: ${enrollment?.course_id}, Course id: ${course.id}`);
        console.log(`🎓 Education: Match: ${enrollment?.course_id === course.id}`);
        console.log(`🎓 Education: isEnrolled will be: ${!!enrollment}`);
        return {
          ...course,
          completed: enrollment?.status === 'completed' || false,
          locked: false,    // Da implementare logica di sblocco
          isEnrolled: !!enrollment
        };
      });
      
      console.log('🎓 Education: Corsi finali:', transformedCourses.map(c => ({ title: c.title, isEnrolled: c.isEnrolled })));
      
      setCourses(transformedCourses);
      setEnrollments(userEnrollments);
      addNotification('success', `${coursesData.length} corsi caricati con successo`);
    } catch (error) {
      console.error('🚨 Education: Errore caricamento corsi e iscrizioni:', error);
      addNotification('error', 'Errore nel caricamento dei corsi');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      console.log('🎓 Education: Caricamento corsi dal database...');
      
      const coursesData = await getAllCourses();
      console.log('🎓 Education: Corsi caricati:', coursesData.length);
      
      // Trasforma i dati del database nel formato dell'interfaccia
      const transformedCourses: Course[] = coursesData.map(course => ({
        ...course,
        completed: false, // Da determinare in base alle iscrizioni
        locked: false,    // Da implementare logica di sblocco
        isEnrolled: false // Da determinare in base alle iscrizioni
      }));
      
      setCourses(transformedCourses);
      addNotification('success', `${coursesData.length} corsi caricati con successo`);
    } catch (error) {
      console.error('🚨 Education: Errore caricamento corsi:', error);
      addNotification('error', 'Errore nel caricamento dei corsi');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };



  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { type, message }]);
    
    // Rimuovi automaticamente dopo 4 secondi
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== notifications.find(n => n.message === message)));
    }, 4000);
  };

  const handleEnroll = async (courseId: string) => {
    if (!profile?.id) {
      addNotification('error', 'Devi essere loggato per iscriverti ai corsi');
      return;
    }

    try {
      console.log('🎓 Education: Iscrizione al corso:', courseId);
      
      const enrollment = await enrollUserInCourse(profile.id, courseId);
      
      if (enrollment) {
        addNotification('success', 'Iscrizione completata con successo!');
        
        // Aggiorna lo stato locale
        setCourses(prevCourses => 
          prevCourses.map(course => 
            course.id === courseId 
              ? { ...course, isEnrolled: true }
              : course
          )
        );
        
        // Ricarica corsi e iscrizioni
        await loadCoursesAndEnrollments();
      } else {
        addNotification('error', 'Errore durante l\'iscrizione al corso');
      }
    } catch (error) {
      console.error('🚨 Education: Errore iscrizione:', error);
      addNotification('error', 'Errore durante l\'iscrizione al corso');
    }
  };

  const filteredCourses = selectedLevel === 'all' 
    ? courses 
    : courses.filter(course => course.level === selectedLevel);

  function getLevelLabel(level: string) {
    switch (level) {
      case 'beginner': return 'Base';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzato';
      default: return level;
    }
  }

  function getLevelColor(level: string) {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg shadow-lg max-w-sm ${
                  notification.type === 'success' 
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : notification.type === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{notification.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div className="fixed top-4 left-4 z-50 bg-yellow-500 text-black p-4 rounded-lg shadow-lg max-w-md">
            <div className="font-bold text-lg mb-2">🔍 DEBUG INFO:</div>
            <div className="text-sm">{debugInfo}</div>
            <button 
              onClick={() => setDebugInfo('')}
              className="mt-2 px-3 py-1 bg-black text-white rounded text-xs"
            >
              Chiudi
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Formazione Professionale
          </h1>
          <p className="text-gray-600">
            Percorsi didattici strutturati per operatori del trasporto pubblico locale
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <div className="p-3 bg-blue-100 rounded-xl w-fit mx-auto mb-3">
              <GraduationCap className="h-6 w-6 text-blue-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{courses.length}</h3>
            <p className="text-gray-600">Corsi Disponibili</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <div className="p-3 bg-green-100 rounded-xl w-fit mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-green-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{courses.filter(c => c.completed).length}</h3>
            <p className="text-gray-600">Corsi Completati</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <div className="p-3 bg-yellow-100 rounded-xl w-fit mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-yellow-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{courses.filter(c => c.isEnrolled && !c.completed).length}</h3>
            <p className="text-gray-600">In Corso</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <div className="p-3 bg-purple-100 rounded-xl w-fit mx-auto mb-3">
              <Award className="h-6 w-6 text-purple-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{courses.filter(c => c.completed).length}</h3>
            <p className="text-gray-600">Certificati</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <h2 className="text-lg font-semibold text-gray-900">
              Tutti i Corsi
            </h2>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Filtra per livello:
              </label>
              <select 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                title="Filtra corsi per livello"
              >
                <option value="all">Tutti i livelli</option>
                <option value="beginner">Base</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzato</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Caricamento corsi...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun corso disponibile</h3>
            <p className="text-gray-600">I corsi saranno presto disponibili.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
            <div
              key={course.id}
              className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${
                course.locked 
                  ? 'opacity-75 border-gray-200' 
                  : 'hover:shadow-md border-gray-100 hover:border-blue-200'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${
                    course.completed ? 'bg-green-100' : course.locked ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    {course.completed ? (
                      <CheckCircle className="h-6 w-6 text-green-800" />
                    ) : course.locked ? (
                      <Lock className="h-6 w-6 text-gray-500" />
                    ) : (
                      <BookOpen className="h-6 w-6 text-blue-800" />
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                    {getLevelLabel(course.level)}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                  {course.title}
                </h3>

                <p className="text-gray-600 mb-4 line-clamp-3 text-sm">
                  {course.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{course.enrollment_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-current text-yellow-400" />
                    <span className="font-medium">{course.rating}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{course.modules_count} moduli</span>
                    <span className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>Punteggio min: {course.passing_score}%</span>
                    </span>
                  </div>
                  
                  {course.completed ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-2 text-green-600 text-sm font-medium">
                        <Award className="h-4 w-4" />
                        <span>Certificato Ottenuto</span>
                      </span>
                      <button 
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Rivedi</span>
                      </button>
                    </div>
                  ) : course.locked ? (
                    <div className="flex items-center justify-center py-2">
                      <span className="flex items-center space-x-2 text-gray-400 text-sm">
                        <Lock className="h-4 w-4" />
                        <span>Completa i prerequisiti</span>
                      </span>
                    </div>
                  ) : course.isEnrolled ? (
                    <button 
                      onClick={() => {
                        const debugMsg = `🎯 DEBUG: Clicking Continue for course: ${course.title} (${course.id}) - Navigate to: /course/${course.id}`;
                        console.log(debugMsg);
                        console.log('🎯 DEBUG: Current URL before navigate:', window.location.pathname);
                        setDebugInfo(debugMsg);
                        navigate(`/course/${course.id}`);
                        console.log('🎯 DEBUG: Navigate called, URL after:', window.location.pathname);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <PlayCircle className="h-4 w-4" />
                      <span>Continua Percorso</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        console.log(`🎓 Education: Clicking Enroll for course: ${course.title} (${course.id}) - isEnrolled: ${course.isEnrolled}`);
                        handleEnroll(course.id);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Inizia Corso</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* No results */}
        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Nessun corso trovato</p>
            <p className="text-sm">Prova a cambiare i filtri di ricerca</p>
          </div>
        )}
      </div>
    </div>
  );
}