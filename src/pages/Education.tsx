import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle, 
  Lock, 
  Star, 
  Clock, 
  Users, 
  Award, 
  Euro, 
  GraduationCap
} from 'lucide-react';
import { getAllCourses, createEnrollment, checkUserEnrollment, type Course, type Enrollment } from '../lib/neonDatabase';
import { useAuth } from '../contexts/AuthContext';

export default function Education() {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<{[key: string]: Enrollment}>({});
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await getAllCourses();
      setCourses(coursesData);

      // Se l'utente è loggato, verifica le iscrizioni
      if (user) {
        const userEnrollments: {[key: string]: Enrollment} = {};
        for (const course of coursesData) {
          const enrollment = await checkUserEnrollment(user.id, course.id);
          if (enrollment) {
            userEnrollments[course.id] = enrollment;
          }
        }
        setEnrollments(userEnrollments);
      }
    } catch (error) {
      console.error('Errore caricamento corsi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = (courseId: string) => {
    if (!user) {
      alert('Devi effettuare il login per iscriverti ai corsi');
      return;
    }

    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    setSelectedCourse(course);
    setShowEnrollmentModal(true);
  };

  const confirmEnrollment = async () => {
    if (!selectedCourse || !user) return;

    try {
      const paymentStatus = selectedCourse.is_free ? 'free' : 'pending';
      
      await createEnrollment({
        user_id: user.id,
        course_id: selectedCourse.id,
        payment_status: paymentStatus
      });

      setShowEnrollmentModal(false);
      setSelectedCourse(null);
      
      // Ricarica le iscrizioni
      await fetchCourses();
      
    } catch (error) {
      console.error('Errore iscrizione:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento corsi...</p>
        </div>
      </div>
    );
  }


  const filteredCourses = selectedLevel === 'all' 
    ? courses 
    : courses.filter(course => course.level === selectedLevel);

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Base';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzato';
      default: return level;
    }
  };

  const getEnrollmentStatus = (courseId: string) => {
    const enrollment = enrollments[courseId];
    if (!enrollment) return null;
    
    switch (enrollment.status) {
      case 'completed': return { text: 'Completato', color: 'text-green-600', icon: CheckCircle };
      case 'in_progress': return { text: 'In Corso', color: 'text-blue-600', icon: PlayCircle };
      case 'enrolled': return { text: 'Iscritto', color: 'text-yellow-600', icon: Users };
      case 'failed': return { text: 'Non Superato', color: 'text-red-600', icon: Lock };
      default: return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <div className="p-3 bg-blue-100 rounded-xl w-fit mx-auto mb-3">
              <GraduationCap className="h-6 w-6 text-blue-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">6</h3>
            <p className="text-gray-600">Corsi Disponibili</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <div className="p-3 bg-green-100 rounded-xl w-fit mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-green-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">1</h3>
            <p className="text-gray-600">Corsi Completati</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <div className="p-3 bg-purple-100 rounded-xl w-fit mx-auto mb-3">
              <Clock className="h-6 w-6 text-purple-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">12h</h3>
            <p className="text-gray-600">Ore di Formazione</p>
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
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Filtra corsi per livello"
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
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                    <BookOpen className="h-6 w-6 text-blue-800" />
                  </div>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(course.level)}`}>
                    {getLevelText(course.level)}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                  {course.title}
                </h3>

                <p className="text-gray-600 mb-4 line-clamp-3 text-sm">
                  {course.description}
                </p>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{course.enrollment_count || 0} iscritti</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">{course.rating}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{course.modules_count} moduli</span>
                  </div>
                  {!course.is_free && (
                    <div className="flex items-center space-x-1">
                      <Euro className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">€{course.price}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{course.duration}</span>
                  </div>
                  {(() => {
                    const enrollmentStatus = getEnrollmentStatus(course.id);
                    if (enrollmentStatus) {
                      const IconComponent = enrollmentStatus.icon;
                      return (
                        <span className={`flex items-center space-x-2 text-sm font-medium ${enrollmentStatus.color}`}>
                          <IconComponent className="h-4 w-4" />
                          <span>{enrollmentStatus.text}</span>
                        </span>
                      );
                    }
                    
                    return (
                      <button 
                        onClick={() => handleEnrollment(course.id)}
                        className="flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors text-sm"
                      >
                        <PlayCircle className="h-4 w-4" />
                        <span>{course.is_free ? 'Iscriviti Gratis' : `Iscriviti - €${course.price}`}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No results */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Nessun corso trovato</p>
            <p className="text-sm">Prova a cambiare i filtri di ricerca</p>
          </div>
        )}

        {/* Modal Iscrizione Corso */}
        {showEnrollmentModal && selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <GraduationCap className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Iscrizione al Corso
                    </h3>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">{selectedCourse.title}</h4>
                  <p className="text-sm text-gray-600 mb-4">{selectedCourse.description}</p>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Durata:</span>
                        <span className="ml-2 font-medium">{selectedCourse.duration}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Livello:</span>
                        <span className="ml-2 font-medium">{getLevelText(selectedCourse.level)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Moduli:</span>
                        <span className="ml-2 font-medium">{selectedCourse.modules_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Valutazione:</span>
                        <span className="ml-2 font-medium">⭐ {selectedCourse.rating}</span>
                      </div>
                    </div>
                  </div>

                  {selectedCourse.is_free ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">Corso Gratuito</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        Puoi iscriverti immediatamente e iniziare subito il corso.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Euro className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-blue-800 font-medium">Corso a Pagamento</span>
                        </div>
                        <span className="text-xl font-bold text-blue-800">€{selectedCourse.price}</span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        Dopo l'iscrizione riceverai le istruzioni per il pagamento.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEnrollmentModal(false);
                      setSelectedCourse(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmEnrollment}
                    className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      selectedCourse.is_free 
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {selectedCourse.is_free ? 'Iscriviti Gratis' : `Iscriviti - €${selectedCourse.price}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}