import React, { useState } from 'react';
import { 
  GraduationCap, 
  PlayCircle, 
  Clock, 
  Users, 
  Star,
  CheckCircle,
  Lock,
  BookOpen
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrollments: number;
  rating: number;
  completed: boolean;
  locked: boolean;
  modules: number;
}

export default function Education() {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const courses: Course[] = [
    {
      id: '1',
      title: 'Normative di Base del Trasporto Locale',
      description: 'Introduzione alle principali normative che regolano il trasporto pubblico locale non di linea',
      duration: '2 ore',
      level: 'beginner',
      enrollments: 245,
      rating: 4.8,
      completed: false,
      locked: false,
      modules: 6
    },
    {
      id: '2',
      title: 'Licenze e Autorizzazioni',
      description: 'Procedure per ottenere e mantenere le licenze necessarie per operare nel settore',
      duration: '3 ore',
      level: 'intermediate',
      enrollments: 189,
      rating: 4.9,
      completed: false,
      locked: false,
      modules: 8
    },
    {
      id: '3',
      title: 'Sicurezza e Responsabilità',
      description: 'Normative sulla sicurezza, responsabilità civile e penale degli operatori',
      duration: '2.5 ore',
      level: 'intermediate',
      enrollments: 156,
      rating: 4.7,
      completed: false,
      locked: false,
      modules: 7
    },
    {
      id: '4',
      title: 'Gestione Documenti e Adempimenti',
      description: 'Come gestire correttamente documenti, registri e adempimenti obbligatori',
      duration: '1.5 ore',
      level: 'beginner',
      enrollments: 203,
      rating: 4.6,
      completed: true,
      locked: false,
      modules: 5
    },
    {
      id: '5',
      title: 'Controlli e Sanzioni',
      description: 'Normative sui controlli, procedure sanzionatorie e ricorsi',
      duration: '2 ore',
      level: 'advanced',
      enrollments: 98,
      rating: 4.9,
      completed: false,
      locked: true,
      modules: 6
    },
    {
      id: '6',
      title: 'Evoluzione Normativa 2024',
      description: 'Aggiornamenti e novità normative introdotte nel 2024',
      duration: '1 ora',
      level: 'advanced',
      enrollments: 67,
      rating: 5.0,
      completed: false,
      locked: true,
      modules: 4
    }
  ];

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
                      <span>{course.enrollments}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-current text-yellow-400" />
                    <span className="font-medium">{course.rating}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {course.modules} moduli
                  </span>
                  
                  {course.completed ? (
                    <span className="flex items-center space-x-2 text-green-600 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      <span>Completato</span>
                    </span>
                  ) : course.locked ? (
                    <span className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Lock className="h-4 w-4" />
                      <span>Bloccato</span>
                    </span>
                  ) : (
                    <button className="flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors text-sm">
                      <PlayCircle className="h-4 w-4" />
                      <span>Inizia</span>
                    </button>
                  )}
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
      </div>
    </div>
  );
}