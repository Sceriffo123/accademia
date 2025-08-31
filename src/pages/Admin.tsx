import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllUsers, createUser, updateUser, deleteUser,
  getAllNormatives,
  getAllDocuments,
  getAllCourses, createCourse, updateCourse, deleteCourse, getCourseEnrollments, deleteEnrollment,
  getQuizByCourseId, createQuiz, updateQuiz, deleteQuiz, getQuizQuestions, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
  createCourseModule, getCourseModules, updateCourseModule, deleteCourseModule,
  sql,
  type User, type Course, type Enrollment, type Quiz, type QuizQuestion, type CourseModule
} from '../lib/neonDatabase';
import { migrateHardcodedQuizzes, checkMigrationStatus } from '../lib/migration';
import { 
  Users, 
  FileText, 
  BookOpen,
  Database, 
  TrendingUp, 
  Plus, 
  Edit3, 
  Edit,
  Trash2, 
  Eye, 
  EyeOff, 
  Upload,
  X,
  AlertTriangle,
  UserMinus,
  Search,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalNormatives: number;
  totalDocuments: number;
  completionRate: number;
}

type TabType = 'overview' | 'users' | 'normatives' | 'documents' | 'courses';
type CourseSubTabType = 'courses' | 'modules' | 'quizzes';

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [courseSubTab, setCourseSubTab] = useState<CourseSubTabType>('courses');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalNormatives: 0,
    totalDocuments: 0,
    completionRate: 85
  });
  const [users, setUsers] = useState<User[]>([]);
  const [normatives, setNormatives] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'operator'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<{[courseId: string]: number}>({});
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  // Stati per quiz
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<Quiz | null>(null);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState('');

  // Stati per moduli corso
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [selectedCourseEnrollments, setSelectedCourseEnrollments] = useState<Enrollment[]>([]);
  
  // Stati per migrazione
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [showEnrollmentsModal, setShowEnrollmentsModal] = useState(false);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('');
  const [newModule, setNewModule] = useState({
    course_id: '',
    title: '',
    description: '',
    type: 'lesson' as 'lesson' | 'video' | 'document' | 'quiz' | 'assignment',
    content: '',
    order_num: 1,
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    is_required: true,
    duration_minutes: undefined as number | undefined,
    video_url: '',
    document_url: ''
  });
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    duration: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    category: '',
    instructor: '',
    modules_count: 1,
    price: 0,
    is_free: true,
    passing_score: 70,
    tags: ''
  });
  
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    time_limit: 30,
    passing_score: 70,
    max_attempts: 3
  });
  
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    points: 1,
    order: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [usersData, normativesData, documentsData, coursesData] = await Promise.all([
        getAllUsers(true, profile?.id),
        getAllNormatives(),
        getAllDocuments(),
        getAllCourses()
      ]);

      setUsers(usersData);
      setNormatives(normativesData);
      setDocuments(documentsData);
      setCourses(coursesData);
      
      // Carica il conteggio degli iscritti per ogni corso
      const enrollmentCounts: {[courseId: string]: number} = {};
      for (const course of coursesData) {
        const enrollments = await getCourseEnrollments(course.id);
        enrollmentCounts[course.id] = enrollments.length;
      }
      setCourseEnrollments(enrollmentCounts);
      
      // Carica tutti i quiz
      await fetchQuizzes();
      
      setStats({
        totalUsers: usersData.length,
        totalNormatives: normativesData.length,
        totalDocuments: documentsData.length,
        completionRate: 85
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuizzes() {
    try {
      // Carica tutti i quiz dal database tramite i moduli
      const allQuizzes: Quiz[] = [];
      
      // Prima carica tutti i moduli di tutti i corsi
      for (const course of courses) {
        const courseModules = await getCourseModules(course.id);
        
        // Per ogni modulo, carica i quiz associati
        for (const module of courseModules) {
          const moduleQuizzes = await sql`
            SELECT * FROM quizzes WHERE module_id = ${module.id}
          `;
          allQuizzes.push(...(moduleQuizzes as Quiz[]));
        }
      }
      
      setQuizzes(allQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setQuizzes([]);
    }
  }

  async function fetchModules(courseId: string) {
    try {
      const modulesData = await getCourseModules(courseId);
      setModules(modulesData);
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  }

  // Handlers per moduli
  async function handleCreateModule() {
    if (!newModule.course_id || !newModule.title) return;
    
    try {
      await createCourseModule(newModule);
      await fetchModules(newModule.course_id);
      setShowCreateModule(false);
      setNewModule({
        course_id: '',
        title: '',
        description: '',
        type: 'lesson',
        content: '',
        order_num: 1,
        level: 'beginner',
        is_required: true
      });
    } catch (error) {
      console.error('Error creating module:', error);
    }
  }

  async function handleUpdateModule() {
    if (!editingModule) return;
    
    try {
      await updateCourseModule(editingModule.id, editingModule);
      await fetchModules(editingModule.course_id);
      setEditingModule(null);
    } catch (error) {
      console.error('Error updating module:', error);
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo modulo?')) return;
    
    try {
      await deleteCourseModule(moduleId);
      setModules(modules.filter(m => m.id !== moduleId));
    } catch (error) {
      console.error('Error deleting module:', error);
    }
  }

  // Handler per visualizzare e gestire domande quiz
  const handleViewQuizQuestions = async (quiz: Quiz) => {
    try {
      setSelectedQuizForQuestions(quiz);
      const quizQuestions = await getQuizQuestions(quiz.id);
      setQuestions(quizQuestions);
      setShowQuestionsModal(true);
    } catch (error) {
      console.error('Errore caricamento domande quiz:', error);
      alert('Errore nel caricamento delle domande del quiz');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa domanda?')) return;
    
    try {
      await deleteQuizQuestion(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      alert('Domanda eliminata con successo!');
    } catch (error) {
      console.error('Errore eliminazione domanda:', error);
      alert('Errore nell\'eliminazione della domanda');
    }
  };

  async function handleCreateQuiz() {
    if (!selectedCourseForQuiz) return;
    
    try {
      const quizData = {
        course_id: selectedCourseForQuiz,
        ...newQuiz
      };
      
      await createQuiz(quizData);
      await fetchQuizzes();
      setNewQuiz({
        title: '',
        description: '',
        time_limit: 30,
        passing_score: 70,
        max_attempts: 3
      });
      setSelectedCourseForQuiz('');
      setShowCreateQuiz(false);
    } catch (error) {
      console.error('Error creating quiz:', error);
    }
  }

  async function handleUpdateQuiz() {
    if (!editingQuiz) return;
    
    try {
      await updateQuiz(editingQuiz.id, newQuiz);
      await fetchQuizzes();
      setEditingQuiz(null);
      setNewQuiz({
        title: '',
        description: '',
        time_limit: 30,
        passing_score: 70,
        max_attempts: 3
      });
    } catch (error) {
      console.error('Error updating quiz:', error);
    }
  }

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo quiz? Questa azione eliminerà anche tutte le domande associate.')) return;
    
    try {
      await deleteQuiz(quizId);
      await fetchQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  }


  async function handleCreateUser() {
    try {
      await createUser(newUser.email, newUser.fullName, newUser.password, newUser.role);
      setNewUser({ email: '', fullName: '', password: '', role: 'user' });
      setShowCreateUser(false);
      fetchData();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      await updateUser(editingUser.id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role
      });
      
      setUsers(users.map(user => 
        user.id === editingUser.id ? editingUser : user
      ));
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleCreateCourse = async () => {
    try {
      const courseData = {
        ...newCourse,
        status: 'active' as const,
        rating: 0,
        tags: newCourse.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      };
      
      const createdCourse = await createCourse(courseData);
      if (!createdCourse) throw new Error('Failed to create course');
      setCourses([...courses, createdCourse]);
      setNewCourse({
        title: '',
        description: '',
        duration: '',
        level: 'beginner',
        category: '',
        instructor: '',
        modules_count: 1,
        price: 0,
        is_free: true,
        passing_score: 70,
        tags: ''
      });
      setShowCreateCourse(false);
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    
    try {
      const courseData = {
        ...editingCourse,
        tags: Array.isArray(editingCourse.tags) 
          ? editingCourse.tags 
          : editingCourse.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      };
      
      await updateCourse(editingCourse.id, courseData);
      setCourses(courses.map(course => 
        course.id === editingCourse.id ? {...editingCourse, tags: courseData.tags} : course
      ));
      setEditingCourse(null);
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo corso?')) return;
    
    try {
      await deleteCourse(courseId);
      setCourses(courses.filter(course => course.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleViewEnrollments = async (course: Course) => {
    try {
      const enrollments = await getCourseEnrollments(course.id);
      setSelectedCourseEnrollments(enrollments);
      setSelectedCourseTitle(course.title);
      setShowEnrollmentsModal(true);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<string | null>(null);

  const handleCancelEnrollment = async (enrollmentId: string) => {
    setEnrollmentToCancel(enrollmentId);
    setShowCancelConfirm(true);
  };

  const confirmCancelEnrollment = async () => {
    if (!enrollmentToCancel) return;
    
    try {
      await deleteEnrollment(enrollmentToCancel);
      // Ricarica le iscrizioni del corso corrente
      const updatedEnrollments = selectedCourseEnrollments.filter(e => e.id !== enrollmentToCancel);
      setSelectedCourseEnrollments(updatedEnrollments);
      
      // Aggiorna il conteggio degli iscritti
      const courseId = selectedCourseEnrollments.find(e => e.id === enrollmentToCancel)?.course_id;
      if (courseId) {
        setCourseEnrollments(prev => ({
          ...prev,
          [courseId]: (prev[courseId] || 1) - 1
        }));
      }
      
      setShowCancelConfirm(false);
      setEnrollmentToCancel(null);
    } catch (error) {
      console.error('Error canceling enrollment:', error);
    }
  };

  async function handleDeleteUser(userId: string) {
    if (confirm('Sei sicuro di voler eliminare questo utente?')) {
      try {
        await deleteUser(userId);
        fetchData();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  // Gestione migrazione quiz hardcoded
  const handleMigrateQuizzes = async () => {
    setMigrationStatus('Migrazione in corso...');
    try {
      const result = await migrateHardcodedQuizzes();
      if (result.success) {
        setMigrationStatus(`✅ ${result.message}`);
        // Ricarica i quiz dopo la migrazione
        await fetchQuizzes();
      } else {
        setMigrationStatus(`❌ ${result.message}`);
      }
    } catch (error) {
      setMigrationStatus(`❌ Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  const checkMigrationNeeded = async () => {
    try {
      const status = await checkMigrationStatus();
      if (status.hasHardcodedQuiz && !status.hasDatabaseQuiz) {
        setShowMigrationModal(true);
      }
    } catch (error) {
      console.error('Errore verifica migrazione:', error);
    }
  };


  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNormatives = normatives.filter(normative =>
    normative.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    normative.reference_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statCards = [
    {
      title: 'Utenti Totali',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Normative Pubblicate',
      value: stats.totalNormatives,
      icon: FileText,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Visualizzazioni Totali',
      value: '12.4k',
      icon: Eye,
      color: 'bg-purple-500',
      change: '+23%'
    },
    {
      title: 'Tasso di Completamento',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+5%'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: BarChart3 },
    { id: 'users', label: 'Utenti', icon: Users },
    { id: 'normatives', label: 'Normative', icon: FileText },
    { id: 'documents', label: 'Documenti', icon: Database },
    { id: 'courses', label: 'Formazione', icon: BookOpen },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Pannello Amministrazione
            </h1>
            <p className="text-gray-600">
              Gestione utenti, contenuti e monitoraggio piattaforma
            </p>
          </div>
          
        </div>


        {/* Stats Grid - Mobile 2x2, Desktop 4x1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className={`p-2 lg:p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <span className="text-xs lg:text-sm text-green-600 font-medium">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-xs lg:text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </h3>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Mobile Tab Selector */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabType)}
              className="w-full p-3 border-0 bg-transparent text-gray-900 font-medium focus:ring-0 focus:outline-none"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden lg:block mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            <div className="grid grid-cols-5 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isTabActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all ${
                      isTabActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Panoramica Sistema
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Attività Recente
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">3 nuovi utenti registrati</p>
                        <p className="text-xs text-gray-600">Nelle ultime 24 ore</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">2 normative aggiornate</p>
                        <p className="text-xs text-gray-600">Questa settimana</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Stato Sistema
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Database</span>
                      <span className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Online</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Backup</span>
                      <span className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Aggiornato</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Performance</span>
                      <span className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Ottimale</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Statistiche Utilizzo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {stats.totalUsers}
                    </div>
                    <div className="text-sm text-gray-600">Utenti Attivi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {stats.totalNormatives}
                    </div>
                    <div className="text-sm text-gray-600">Normative Pubblicate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {stats.totalDocuments}
                    </div>
                    <div className="text-sm text-gray-600">Documenti Caricati</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  Gestione Utenti ({users.length})
                </h2>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nuovo Utente</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cerca utenti..."
                />
              </div>

              {/* Users List */}
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                        <p className="text-gray-600 text-sm">{user.email}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                          user.role === 'operator' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'Amministratore' :
                           user.role === 'superadmin' ? 'Super Admin' :
                           user.role === 'operator' ? 'Operatore' : 'Utente'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Normatives Tab */}
          {activeTab === 'normatives' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  Gestione Normative ({normatives.length})
                </h2>
                <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>Nuova Normativa</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cerca normative..."
                />
              </div>

              {/* Normatives List */}
              <div className="space-y-4">
                {filteredNormatives.map((normative) => (
                  <div key={normative.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{normative.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{normative.reference_number}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            normative.type === 'law' ? 'bg-blue-100 text-blue-800' :
                            normative.type === 'regulation' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {normative.type === 'law' ? 'Legge' :
                             normative.type === 'regulation' ? 'Regolamento' : 'Sentenza'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Pubblicata: {new Date(normative.publication_date).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  Gestione Documenti ({documents.length})
                </h2>
                <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Carica Documento</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cerca documenti..."
                />
              </div>

              {/* Documents List */}
              <div className="space-y-4">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{doc.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{doc.filename}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            doc.type === 'template' ? 'bg-blue-100 text-blue-800' :
                            doc.type === 'form' ? 'bg-green-100 text-green-800' :
                            doc.type === 'guide' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {doc.type === 'template' ? 'Template' :
                             doc.type === 'form' ? 'Modulo' :
                             doc.type === 'guide' ? 'Guida' : 'Report'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Scarica documento">
                            <Upload className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Caricato: {new Date(doc.created_at).toLocaleDateString('it-IT')} • 
                        Dimensione: {doc.file_size ? `${doc.file_size} KB` : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="p-6">
              {/* Sub-tabs for Courses */}
              <div className="flex space-x-1 mb-6">
                <button
                  onClick={() => setCourseSubTab('courses')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    courseSubTab === 'courses'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Corsi
                </button>
                <button
                  onClick={() => setCourseSubTab('modules')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    courseSubTab === 'modules'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Moduli
                </button>
                <button
                  onClick={() => setCourseSubTab('quizzes')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    courseSubTab === 'quizzes'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Quiz
                </button>
              </div>

              {/* Courses Sub-tab */}
              {courseSubTab === 'courses' && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Gestione Corsi ({courses.length})
                    </h2>
                    <button
                      onClick={() => setShowCreateCourse(true)}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Nuovo Corso</span>
                    </button>
                  </div>

                  {/* Courses List */}
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{course.title}</h3>
                            <p className="text-gray-600 text-sm">{course.category}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                course.is_free ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {course.is_free ? 'Gratuito' : `€${course.price}`}
                              </span>
                              <span className="text-xs text-gray-500">
                                {courseEnrollments[course.id] || 0} iscritti
                              </span>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                course.status === 'active' ? 'bg-green-100 text-green-800' :
                                course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {course.status === 'active' ? 'Attivo' :
                                 course.status === 'draft' ? 'Bozza' : 'Archiviato'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewEnrollments(course)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Visualizza iscritti"
                            >
                              <Users className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCourseForQuiz(course.id);
                                setActiveTab('courses');
                                setCourseSubTab('quizzes');
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Gestisci quiz del corso"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingCourse(course)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifica corso"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Elimina corso"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Modules Sub-tab */}
              {courseSubTab === 'modules' && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Gestione Moduli ({modules.length})
                    </h2>
                    <button
                      onClick={() => setShowCreateModule(true)}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Nuovo Modulo</span>
                    </button>
                  </div>

                  {/* Modules List */}
                  <div className="space-y-4">
                    {modules.map((module) => {
                      const course = courses.find(c => c.id === module.course_id);
                      return (
                        <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{module.title}</h3>
                              <p className="text-gray-600 text-sm">Corso: {course?.title || 'N/A'}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  module.type === 'lesson' ? 'bg-blue-100 text-blue-800' :
                                  module.type === 'video' ? 'bg-green-100 text-green-800' :
                                  module.type === 'document' ? 'bg-yellow-100 text-yellow-800' :
                                  module.type === 'quiz' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {module.type}
                                </span>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  module.level === 'beginner' ? 'bg-green-100 text-green-800' :
                                  module.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {module.level}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Ordine: {module.order_num}
                                </span>
                                {module.duration_minutes && (
                                  <span className="text-xs text-gray-500">
                                    {module.duration_minutes} min
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setEditingModule(module)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifica modulo"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteModule(module.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Elimina modulo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Quizzes Sub-tab */}
              {courseSubTab === 'quizzes' && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Gestione Quiz ({quizzes.filter(quiz => {
                          if (!selectedCourseForQuiz) return true;
                          // Trova il modulo del quiz e verifica se appartiene al corso selezionato
                          const module = modules.find(m => m.id === quiz.module_id);
                          return module?.course_id === selectedCourseForQuiz;
                        }).length})
                      </h2>
                      {selectedCourseForQuiz && (
                        <p className="text-sm text-gray-600 mt-1">
                          Corso: {courses.find(c => c.id === selectedCourseForQuiz)?.title}
                          <button
                            onClick={() => setSelectedCourseForQuiz('')}
                            className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                          >
                            (mostra tutti)
                          </button>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShowMigrationModal(true)}
                        className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                        title="Migra quiz hardcoded al database"
                      >
                        <Database className="h-4 w-4" />
                        <span>Migra Quiz</span>
                      </button>
                      <button
                        onClick={() => setShowCreateQuiz(true)}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Nuovo Quiz</span>
                      </button>
                    </div>
                  </div>

                  {/* Quizzes List */}
                  <div className="space-y-4">
                    {quizzes
                      .filter(quiz => {
                        if (!selectedCourseForQuiz) return true;
                        // Trova il modulo del quiz e verifica se appartiene al corso selezionato
                        const module = modules.find(m => m.id === quiz.module_id);
                        return module?.course_id === selectedCourseForQuiz;
                      })
                      .map((quiz) => {
                      const module = modules.find(m => m.id === quiz.module_id);
                      const course = courses.find(c => c.id === module?.course_id);
                      return (
                        <div key={quiz.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                              <p className="text-gray-600 text-sm">{course?.title || 'Corso non trovato'}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-xs text-gray-500">
                                  {quiz.time_limit} min
                                </span>
                                <span className="text-xs text-gray-500">
                                  Soglia: {quiz.passing_score}%
                                </span>
                                <span className="text-xs text-gray-500">
                                  Max tentativi: {quiz.max_attempts}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewQuizQuestions(quiz.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Gestisci domande"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingQuiz(quiz);
                                  setNewQuiz({
                                    title: quiz.title,
                                    description: quiz.description,
                                    time_limit: quiz.time_limit,
                                    passing_score: quiz.passing_score,
                                    max_attempts: quiz.max_attempts
                                  });
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifica quiz"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Elimina quiz"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {quizzes.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nessun quiz trovato</p>
                        <p className="text-sm">Crea il primo quiz per iniziare</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Nuovo Utente</h3>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as 'user' | 'admin' | 'operator'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">Utente</option>
                    <option value="operator">Operatore</option>
                    <option value="admin">Amministratore</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crea Utente
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) => editingUser && setEditingUser({...editingUser, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome Cognome"
                    title="Nome completo dell'utente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => editingUser && setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@esempio.com"
                    title="Indirizzo email utente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => editingUser && setEditingUser({...editingUser, role: e.target.value as 'user' | 'admin' | 'operator' | 'superadmin'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title="Seleziona ruolo utente"
                  >
                    <option value="user">Utente</option>
                    <option value="operator">Operatore</option>
                    <option value="admin">Amministratore</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Course Modal */}
        {showCreateCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Nuovo Corso di Formazione</h3>
                <button
                  onClick={() => setShowCreateCourse(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Chiudi"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Corso</label>
                    <input
                      type="text"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es. Evoluzione Normativa 2024"
                      title="Titolo del corso"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <input
                      type="text"
                      value={newCourse.category}
                      onChange={(e) => setNewCourse({...newCourse, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es. Normativa, Sicurezza, Management"
                      title="Categoria del corso"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrizione dettagliata del corso..."
                    title="Descrizione del corso"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durata</label>
                    <input
                      type="text"
                      value={newCourse.duration}
                      onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es. 8 ore"
                      title="Durata del corso"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Livello</label>
                    <select
                      value={newCourse.level}
                      onChange={(e) => setNewCourse({...newCourse, level: e.target.value as 'beginner' | 'intermediate' | 'advanced'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      title="Seleziona livello corso"
                    >
                      <option value="beginner">Base</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="advanced">Avanzato</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moduli</label>
                    <input
                      type="number"
                      value={newCourse.modules_count}
                      onChange={(e) => setNewCourse({...newCourse, modules_count: parseInt(e.target.value) || 1})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1"
                      title="Numero di moduli del corso"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Istruttore</label>
                  <input
                    type="text"
                    value={newCourse.instructor}
                    onChange={(e) => setNewCourse({...newCourse, instructor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome Cognome"
                    title="Nome dell'istruttore del corso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punteggio Minimo (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCourse.passing_score}
                    onChange={(e) => setNewCourse({...newCourse, passing_score: parseInt(e.target.value) || 70})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="70"
                    title="Punteggio minimo per superare il corso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separati da virgola)</label>
                  <input
                    type="text"
                    value={newCourse.tags}
                    onChange={(e) => setNewCourse({...newCourse, tags: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="normativa, aggiornamento, obbligatorio"
                    title="Tags del corso separati da virgola"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_free"
                        checked={newCourse.is_free}
                        onChange={(e) => setNewCourse({...newCourse, is_free: e.target.checked, price: e.target.checked ? 0 : newCourse.price})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_free" className="ml-2 text-sm text-gray-700">
                        Corso Gratuito
                      </label>
                    </div>
                    
                    {!newCourse.is_free && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCourse.price}
                          onChange={(e) => setNewCourse({...newCourse, price: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="299.00"
                          title="Prezzo del corso in euro"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateCourse(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateCourse}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crea Corso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Course Modal */}
        {editingCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Corso</h3>
                <button
                  onClick={() => setEditingCourse(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Chiudi"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Corso</label>
                    <input
                      type="text"
                      value={editingCourse.title}
                      onChange={(e) => setEditingCourse({...editingCourse, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titolo del corso"
                      title="Titolo del corso"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <input
                      type="text"
                      value={editingCourse.category}
                      onChange={(e) => setEditingCourse({...editingCourse, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Categoria del corso"
                      title="Categoria del corso"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={editingCourse.description}
                    onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durata</label>
                    <input
                      type="text"
                      value={editingCourse.duration}
                      onChange={(e) => setEditingCourse({...editingCourse, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Livello</label>
                    <select
                      value={editingCourse.level}
                      onChange={(e) => setEditingCourse({...editingCourse, level: e.target.value as 'beginner' | 'intermediate' | 'advanced'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="beginner">Base</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="advanced">Avanzato</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moduli</label>
                    <input
                      type="number"
                      min="1"
                      value={editingCourse.modules_count}
                      onChange={(e) => setEditingCourse({...editingCourse, modules_count: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Istruttore</label>
                    <input
                      type="text"
                      value={editingCourse.instructor}
                      onChange={(e) => setEditingCourse({...editingCourse, instructor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Punteggio Minimo (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingCourse.passing_score}
                      onChange={(e) => setEditingCourse({...editingCourse, passing_score: parseInt(e.target.value) || 70})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separati da virgola)</label>
                  <input
                    type="text"
                    value={Array.isArray(editingCourse.tags) ? editingCourse.tags.join(', ') : editingCourse.tags || ''}
                    onChange={(e) => setEditingCourse({...editingCourse, tags: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="normativa, aggiornamento, obbligatorio"
                    title="Tags del corso separati da virgola"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit_is_free"
                        checked={editingCourse.is_free}
                        onChange={(e) => setEditingCourse({...editingCourse, is_free: e.target.checked, price: e.target.checked ? 0 : editingCourse.price})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit_is_free" className="ml-2 text-sm text-gray-700">
                        Corso Gratuito
                      </label>
                    </div>
                    
                    {!editingCourse.is_free && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingCourse.price}
                          onChange={(e) => setEditingCourse({...editingCourse, price: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateCourse}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Gestione Iscrizioni */}
        {showEnrollmentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Iscritti al corso: {selectedCourseTitle}
                </h3>
                <button
                  onClick={() => setShowEnrollmentsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Chiudi"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {selectedCourseEnrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nessun iscritto per questo corso</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCourseEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {(enrollment as any).user_name || 'Nome non disponibile'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {(enrollment as any).user_email || 'Email non disponibile'}
                              </p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  enrollment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {enrollment.status === 'completed' ? 'Completato' :
                                   enrollment.status === 'in_progress' ? 'In corso' : 'Iscritto'}
                                </span>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  enrollment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                  enrollment.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {enrollment.payment_status === 'paid' ? 'Pagato' :
                                   enrollment.payment_status === 'pending' ? 'Pagamento pendente' : 'Gratuito'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Iscritto: {new Date(enrollment.enrolled_at).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCancelEnrollment(enrollment.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Annulla iscrizione"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowEnrollmentsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Conferma Annullamento Iscrizione */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Conferma Annullamento
                  </h3>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Sei sicuro di voler annullare questa iscrizione al corso?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Attenzione:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>L&apos;iscrizione verrà rimossa definitivamente</li>
                        <li>L&apos;utente perderà l&apos;accesso al corso</li>
                        <li>I progressi del corso verranno mantenuti per eventuali future iscrizioni</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setEnrollmentToCancel(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmCancelEnrollment}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Conferma Annullamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Creazione/Modifica Quiz */}
        {(showCreateQuiz || editingQuiz) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingQuiz ? 'Modifica Quiz' : 'Nuovo Quiz'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateQuiz(false);
                    setEditingQuiz(null);
                    setNewQuiz({
                      title: '',
                      description: '',
                      time_limit: 30,
                      passing_score: 70,
                      max_attempts: 3
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingQuiz) {
                  handleUpdateQuiz();
                } else {
                  handleCreateQuiz();
                }
              }} className="space-y-4">
                {!editingQuiz && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Corso
                    </label>
                    <select
                      value={selectedCourseForQuiz}
                      onChange={(e) => setSelectedCourseForQuiz(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleziona un corso</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titolo Quiz
                  </label>
                  <input
                    type="text"
                    value={newQuiz.title}
                    onChange={(e) => setNewQuiz({...newQuiz, title: e.target.value})}
                    placeholder="Inserisci il titolo del quiz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={newQuiz.description}
                    onChange={(e) => setNewQuiz({...newQuiz, description: e.target.value})}
                    placeholder="Descrizione del quiz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tempo (min)
                    </label>
                    <input
                      type="number"
                      value={newQuiz.time_limit}
                      onChange={(e) => setNewQuiz({...newQuiz, time_limit: parseInt(e.target.value)})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Soglia (%)
                    </label>
                    <input
                      type="number"
                      value={newQuiz.passing_score}
                      onChange={(e) => setNewQuiz({...newQuiz, passing_score: parseInt(e.target.value)})}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tentativi
                    </label>
                    <input
                      type="number"
                      value={newQuiz.max_attempts}
                      onChange={(e) => setNewQuiz({...newQuiz, max_attempts: parseInt(e.target.value)})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateQuiz(false);
                      setEditingQuiz(null);
                      setNewQuiz({
                        title: '',
                        description: '',
                        time_limit: 30,
                        passing_score: 70,
                        max_attempts: 3
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingQuiz ? 'Aggiorna' : 'Crea'} Quiz
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Creazione/Modifica Domanda Quiz */}
        {(showCreateQuestion || editingQuestion) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingQuestion ? 'Modifica Domanda' : 'Nuova Domanda'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateQuestion(false);
                    setEditingQuestion(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                // Handle form submission here
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domanda
                  </label>
                  <textarea
                    placeholder="Inserisci il testo della domanda"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opzioni di Risposta
                  </label>
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <input
                        type="text"
                        placeholder={`Opzione ${String.fromCharCode(65 + index)}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <input
                        type="radio"
                        name="correct_answer"
                        value={index}
                        className="w-4 h-4 text-blue-600"
                        title="Seleziona come risposta corretta"
                      />
                    </div>
                  ))}
                  <p className="text-sm text-gray-500 mt-1">
                    Seleziona il radio button per indicare la risposta corretta
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spiegazione (opzionale)
                  </label>
                  <textarea
                    placeholder="Spiegazione della risposta corretta"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Punti
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      defaultValue="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordine
                    </label>
                    <input
                      type="number"
                      min="1"
                      defaultValue={questions.length + 1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateQuestion(false);
                      setEditingQuestion(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingQuestion ? 'Aggiorna' : 'Crea'} Domanda
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Gestione Domande Quiz */}
        {showQuestionsModal && selectedQuizForQuestions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Gestione Domande - {selectedQuizForQuestions.title}
                </h3>
                <button
                  onClick={() => {
                    setShowQuestionsModal(false);
                    setSelectedQuizForQuestions(null);
                    setQuestions([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <button
                  onClick={() => setShowCreateQuestion(true)}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nuova Domanda</span>
                </button>
              </div>

              {/* Lista Domande */}
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900">
                        Domanda {index + 1}
                      </h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingQuestion(question)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Modifica domanda"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Elimina domanda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{question.question}</p>
                    
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded ${
                            optIndex === question.correct_answer
                              ? 'bg-green-100 border border-green-300'
                              : 'bg-gray-50'
                          }`}
                        >
                          <span className="font-medium">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>{' '}
                          {option}
                          {optIndex === question.correct_answer && (
                            <span className="ml-2 text-green-600 text-sm font-medium">
                              ✓ Corretta
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-3 p-2 bg-blue-50 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Spiegazione:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-2 text-sm text-gray-500">
                      Punti: {question.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Migration Modal */}
        {showMigrationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Migrazione Quiz Hardcoded
              </h3>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  Questo strumento migrerà i quiz hardcoded dal CourseViewer al database Neon.
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ Attenzione:</strong> Questa operazione creerà il quiz "Evoluzione Normativa 2024" 
                    nel database con tutte le sue domande.
                  </p>
                </div>
                
                {migrationStatus && (
                  <div className="bg-gray-50 border rounded-lg p-3">
                    <p className="text-sm font-mono">{migrationStatus}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowMigrationModal(false);
                    setMigrationStatus('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleMigrateQuizzes}
                  disabled={migrationStatus.includes('corso')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  Avvia Migrazione
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}