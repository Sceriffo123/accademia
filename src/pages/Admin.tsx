import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  getUsersCount,
  getAllNormatives,
  createNormative,
  updateNormative,
  deleteNormative,
  getNormativesCount,
  getAllDocuments,
  updateDocument,
  getDocumentsCount,
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesCount,
  getCourseModules,
  createCourseModule,
  updateCourseModule,
  deleteCourseModule,
  getModuleQuiz,
  getQuizQuestions,
  createQuiz,
  createQuizQuestion,
  updateQuiz,
  deleteQuiz,
  updateQuizQuestion,
  deleteQuizQuestion,
  getUserPermissions
} from '../lib/neonDatabase';
import { createModuleProgressTable, checkModuleProgressTable } from '../lib/createModuleProgressTable';
import { downloadGoogleDriveFile, isGoogleDriveUrl } from '../lib/driveDownload';
import { generatePDF } from '../lib/pdfGenerator';
import { 
  Users, 
  FileText, 
  BookOpen, 
  BarChart3, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Upload,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  Play,
  RefreshCw,
  GraduationCap,
  Settings,
  FolderOpen,
  ChevronRight,
  Key,
  AlertTriangle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalNormatives: number;
  totalDocuments: number;
  totalCourses: number;
  totalViews: number;
  newUsersThisMonth: number;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'normatives' | 'documents' | 'education'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalNormatives: 0,
    totalViews: 0,
    newUsersThisMonth: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [normatives, setNormatives] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<any>(null);
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [showEditQuiz, setShowEditQuiz] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showEditQuestion, setShowEditQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [showQuizPreview, setShowQuizPreview] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<any>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, number>>({});
  const [previewCurrentQuestion, setPreviewCurrentQuestion] = useState(0);
  const [previewShowResults, setPreviewShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddNormative, setShowAddNormative] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showEditModule, setShowEditModule] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  // Stati per sezione Formazione
  const [educationTab, setEducationTab] = useState<'courses' | 'modules' | 'quiz'>('courses');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [moduleFilters, setModuleFilters] = useState({
    course: '',
    type: '',
    level: ''
  });

  // Form per moduli
  const [moduleForm, setModuleForm] = useState({
    course_id: '',
    title: '',
    description: '',
    type: 'lesson' as 'lesson' | 'video' | 'document' | 'quiz',
    content: '',
    video_url: '',
    document_url: '',
    order_num: 1,
    duration_minutes: 0,
    is_required: true,
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced'
  });

  // Form per quiz
  const [quizForm, setQuizForm] = useState({
    module_id: '',
    title: '',
    description: '',
    time_limit: 30,
    passing_score: 60,
    max_attempts: 3
  });

  // Form per domande quiz
  const [questionForm, setQuestionForm] = useState({
    quiz_id: '',
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    order_num: 1
  });

  // Stati per gestione normative (aggiunti correttamente)
  const [showEditNormative, setShowEditNormative] = useState(false);
  const [editingNormative, setEditingNormative] = useState<any>(null);
  const [normativeForm, setNormativeForm] = useState({
    title: '',
    content: '',
    category: '',
    type: 'law' as 'law' | 'regulation' | 'ruling',
    reference_number: '',
    publication_date: '',
    effective_date: '',
    filename: '',
    file_path: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  // Stati per gestione documenti
  const [showEditDocument, setShowEditDocument] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; document: any }>({ show: false, document: null });
  const [documentForm, setDocumentForm] = useState({
    title: '',
    description: '',
    filename: '',
    file_path: '',
    file_size: '',
    mime_type: '',
    type: 'template' as 'template' | 'form' | 'guide' | 'report',
    category: '',
    tags: [] as string[],
    version: '1.0',
    status: 'active' as 'active' | 'draft' | 'archived'
  });
  const [documentTagInput, setDocumentTagInput] = useState('');

  // Stati per gestione corsi
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [viewingCourse, setViewingCourse] = useState<any>(null);
  const [courseDeleteConfirm, setCourseDeleteConfirm] = useState<{ show: boolean; course: any }>({ show: false, course: null });
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    duration: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    instructor: '',
    category: '',
    status: 'draft' as 'active' | 'draft' | 'archived',
    rating: 0,
    tags: [] as string[],
    file_path: '',
    thumbnail_path: '',
    price: 0,
    is_free: true,
    certificate_template: '',
    passing_score: 70
  });
  const [courseTagInput, setCourseTagInput] = useState('');
  const [courseModules, setCourseModules] = useState<any[]>([]);
  const [showCourseModules, setShowCourseModules] = useState(false);

  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'superadmin' | 'operator'
  });

  useEffect(() => {
    fetchAdminData();
    loadUserPermissions();
  }, []);

  // Carica moduli quando si entra nella tab moduli o cambia il filtro corso
  useEffect(() => {
    console.log('🔧 DEBUG useEffect modules:', {
      educationTab,
      coursesLength: courses.length,
      moduleFiltersCourse: moduleFilters.course,
      loading
    });
    
    if (educationTab === 'modules' && !loading) {
      // Aspetta che il loading iniziale sia completato
      if (courses.length > 0) {
        if (moduleFilters.course) {
          console.log('🔧 DEBUG: Loading modules for specific course:', moduleFilters.course);
          loadModulesForCourse(moduleFilters.course);
        } else {
          console.log('🔧 DEBUG: Loading all modules');
          loadAllModules();
        }
      } else {
        // Se non ci sono corsi, carica comunque i corsi prima
        console.log('🔧 DEBUG: No courses available, loading courses first...');
        loadCoursesAndThenModules();
      }
    }

    if (educationTab === 'quiz' && !loading) {
      console.log('🎯 DEBUG: Loading quizzes');
      loadAllQuizzes();
    }
  }, [educationTab, moduleFilters.course, courses, loading]);

  async function loadModulesForCourse(courseId: string) {
    try {
      const modulesData = await getCourseModules(courseId);
      setModules(modulesData);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  }

  async function loadCoursesAndThenModules() {
    try {
      console.log('🎓 Admin: Caricamento corsi prima dei moduli...');
      const coursesData = await getAllCourses();
      setCourses(coursesData);
      console.log(`🎓 Admin: ${coursesData.length} corsi caricati, ora carico i moduli...`);
      
      // Ora carica i moduli con i corsi appena caricati
      const allModules = [];
      for (const course of coursesData) {
        const courseModules = await getCourseModules(course.id);
        allModules.push(...courseModules);
      }
      console.log(`🎓 Admin: Totale moduli caricati: ${allModules.length}`);
      setModules(allModules);
    } catch (error) {
      console.error('Error loading courses and modules:', error);
    }
  }

  async function loadAllModules() {
    try {
      console.log('🎓 Admin: Caricamento tutti i moduli...');
      console.log('🎓 Admin: Corsi disponibili:', courses.length);
      
      if (courses.length === 0) {
        console.log('🚨 ERROR: No courses available to load modules from');
        return;
      }
      
      // Carica moduli di tutti i corsi
      const allModules = [];
      for (const course of courses) {
        console.log(`🎓 Admin: Caricamento moduli per corso: ${course.title} (${course.id})`);
        const courseModules = await getCourseModules(course.id);
        console.log(`🎓 Admin: Trovati ${courseModules.length} moduli per corso ${course.title}`);
        allModules.push(...courseModules);
      }
      console.log(`🎓 Admin: Totale moduli caricati: ${allModules.length}`);
      setModules(allModules);
    } catch (error) {
      console.error('Error loading all modules:', error);
    }
  }

  async function loadAllQuizzes() {
    try {
      console.log('🎯 Admin: Caricamento tutti i quiz...');
      console.log('🎯 Admin: Corsi disponibili:', courses.length);
      
      if (courses.length === 0) {
        console.log('🚨 ERROR: No courses available to load quizzes from');
        return;
      }
      
      const allQuizzes = [];
      for (const course of courses) {
        console.log(`🎯 Admin: Caricamento moduli per corso: ${course.title} (${course.id})`);
        const courseModules = await getCourseModules(course.id);
        console.log(`🎯 Admin: Trovati ${courseModules.length} moduli per corso ${course.title}`);
        
        for (const module of courseModules) {
          try {
            const moduleQuiz = await getModuleQuiz(module.id);
            if (moduleQuiz) {
              allQuizzes.push({
                ...moduleQuiz,
                course_name: course.title,
                module_name: module.name,
                course_id: course.id,
                module_id: module.id
              });
              console.log(`🎯 Admin: Quiz trovato per modulo ${module.name}`);
            }
          } catch (error) {
            // Se non c'è quiz per questo modulo, continua
            console.log(`🎯 Admin: Nessun quiz trovato per modulo ${module.name}`);
          }
        }
      }
      console.log(`🎯 Admin: Totale quiz caricati: ${allQuizzes.length}`);
      setQuizzes(allQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  }

  // Handler per creazione quiz
  async function handleCreateQuiz() {
    if (!hasPermission('education.create')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per creare quiz');
      return;
    }

    try {
      if (!quizForm.module_id || !quizForm.title || !quizForm.description) {
        addNotification('error', 'Errore Validazione', 'Modulo, titolo e descrizione sono obbligatori');
        return;
      }

      if (quizForm.passing_score < 1 || quizForm.passing_score > 100) {
        addNotification('error', 'Errore Validazione', 'Il punteggio minimo deve essere tra 1 e 100');
        return;
      }

      if (quizForm.time_limit < 1) {
        addNotification('error', 'Errore Validazione', 'Il tempo limite deve essere almeno 1 minuto');
        return;
      }

      if (quizForm.max_attempts < 1) {
        addNotification('error', 'Errore Validazione', 'Il numero massimo di tentativi deve essere almeno 1');
        return;
      }

      const newQuiz = await createQuiz({
        module_id: quizForm.module_id,
        title: quizForm.title,
        description: quizForm.description,
        time_limit: quizForm.time_limit,
        passing_score: quizForm.passing_score,
        max_attempts: quizForm.max_attempts
      });

      if (newQuiz) {
        addNotification('success', 'Quiz Creato', `Il quiz "${quizForm.title}" è stato creato con successo`);
        setShowAddQuiz(false);
        setQuizForm({
          module_id: '',
          title: '',
          description: '',
          time_limit: 30,
          passing_score: 60,
          max_attempts: 3
        });
        loadAllQuizzes(); // Ricarica la lista quiz
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione del quiz');
    }
  }

  // Handler per modifica quiz
  async function handleUpdateQuiz() {
    if (!hasPermission('education.edit')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per modificare quiz');
      return;
    }

    try {
      if (!editingQuiz) {
        console.error('❌ Nessun quiz da modificare');
        return;
      }

      if (!editingQuiz.title || !editingQuiz.description) {
        addNotification('error', 'Errore Validazione', 'Titolo e descrizione sono obbligatori');
        return;
      }

      if (editingQuiz.passing_score < 1 || editingQuiz.passing_score > 100) {
        addNotification('error', 'Errore Validazione', 'Il punteggio minimo deve essere tra 1 e 100');
        return;
      }

      if (editingQuiz.time_limit < 1) {
        addNotification('error', 'Errore Validazione', 'Il tempo limite deve essere almeno 1 minuto');
        return;
      }

      if (editingQuiz.max_attempts < 1) {
        addNotification('error', 'Errore Validazione', 'Il numero massimo di tentativi deve essere almeno 1');
        return;
      }

      const success = await updateQuiz(editingQuiz.id, {
        title: editingQuiz.title,
        description: editingQuiz.description,
        time_limit: editingQuiz.time_limit,
        passing_score: editingQuiz.passing_score,
        max_attempts: editingQuiz.max_attempts
      });

      if (success) {
        addNotification('success', 'Quiz Aggiornato', `Il quiz "${editingQuiz.title}" è stato aggiornato con successo`);
        setShowEditQuiz(false);
        setEditingQuiz(null);
        loadAllQuizzes(); // Ricarica la lista quiz
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare il quiz');
    }
  }

  // Handler per eliminazione quiz
  async function handleDeleteQuiz(quizId: string, quizTitle: string) {
    if (!hasPermission('education.delete')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per eliminare quiz');
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare il quiz "${quizTitle}"? Questa azione eliminerà anche tutte le domande associate.`)) {
      return;
    }
    
    try {
      const success = await deleteQuiz(quizId);
      if (success) {
        loadAllQuizzes(); // Ricarica la lista quiz
        addNotification('success', 'Quiz Eliminato', `Il quiz "${quizTitle}" è stato rimosso dal sistema`);
      } else {
        addNotification('error', 'Errore Eliminazione', 'Il quiz non è stato trovato o non può essere eliminato');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare il quiz');
    }
  }

  // Handler per aprire modal di modifica quiz
  function handleEditQuiz(quiz: any) {
    setEditingQuiz({
      id: quiz.id,
      module_id: quiz.module_id,
      title: quiz.title,
      description: quiz.description,
      time_limit: quiz.time_limit,
      passing_score: quiz.passing_score,
      max_attempts: quiz.max_attempts
    });
    setShowEditQuiz(true);
  }

  // Funzione per filtrare i moduli
  const getFilteredModules = () => {
    const filtered = modules.filter(module => {
      // Filtro per tipo
      if (moduleFilters.type && module.type !== moduleFilters.type) {
        return false;
      }
      // Filtro per livello
      if (moduleFilters.level && module.level !== moduleFilters.level) {
        return false;
      }
      return true;
    });
    
    console.log(`🎓 Admin: Filtri attivi - Tipo: ${moduleFilters.type || 'Tutti'}, Livello: ${moduleFilters.level || 'Tutti'}`);
    console.log(`🎓 Admin: Moduli totali: ${modules.length}, Moduli filtrati: ${filtered.length}`);
    
    return filtered;
  };

  // Moduli filtrati
  const filteredModules = getFilteredModules();

  // Handler per caricamento domande quiz
  async function loadQuizQuestions(quizId: string) {
    try {
      console.log('🎓 Admin: Caricamento domande quiz:', quizId);
      const questions = await getQuizQuestions(quizId);
      setQuizQuestions(questions);
      console.log('🎓 Admin: Domande caricate:', questions.length);
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      addNotification('error', 'Errore Caricamento', 'Non è stato possibile caricare le domande del quiz');
    }
  }

  // Handler per creazione domanda quiz
  async function handleCreateQuestion() {
    if (!hasPermission('education.create')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per creare domande quiz');
      return;
    }

    // Validazione
    if (!questionForm.quiz_id || !questionForm.question.trim()) {
      addNotification('error', 'Validazione Fallita', 'Quiz e domanda sono obbligatori');
      return;
    }

    // Verifica che almeno 2 opzioni siano compilate
    const validOptions = questionForm.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      addNotification('error', 'Validazione Fallita', 'Inserisci almeno 2 opzioni di risposta');
      return;
    }

    // Verifica che la risposta corretta sia valida
    if (questionForm.correct_answer >= validOptions.length) {
      addNotification('error', 'Validazione Fallita', 'La risposta corretta deve essere una delle opzioni inserite');
      return;
    }

    try {
      const success = await createQuizQuestion({
        quiz_id: questionForm.quiz_id,
        question: questionForm.question.trim(),
        options: questionForm.options.filter(opt => opt.trim() !== ''),
        correct_answer: questionForm.correct_answer,
        explanation: questionForm.explanation.trim() || undefined,
        order_num: questionForm.order_num
      });

      if (success) {
        loadQuizQuestions(questionForm.quiz_id); // Ricarica le domande
        setShowAddQuestion(false);
        setQuestionForm({
          quiz_id: '',
          question: '',
          options: ['', '', '', ''],
          correct_answer: 0,
          explanation: '',
          order_num: 1
        });
        addNotification('success', 'Domanda Creata', 'La domanda è stata aggiunta al quiz con successo');
      } else {
        addNotification('error', 'Errore Creazione', 'Non è stato possibile creare la domanda');
      }
    } catch (error) {
      console.error('Error creating question:', error);
      addNotification('error', 'Errore Creazione', 'Non è stato possibile creare la domanda');
    }
  }

  // Handler per aggiornamento domanda quiz
  async function handleUpdateQuestion() {
    if (!hasPermission('education.update')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per modificare domande quiz');
      return;
    }

    if (!editingQuestion || !editingQuestion.question.trim()) {
      addNotification('error', 'Validazione Fallita', 'La domanda è obbligatoria');
      return;
    }

    // Verifica che almeno 2 opzioni siano compilate
    const validOptions = editingQuestion.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      addNotification('error', 'Validazione Fallita', 'Inserisci almeno 2 opzioni di risposta');
      return;
    }

    // Verifica che la risposta corretta sia valida
    if (editingQuestion.correct_answer >= validOptions.length) {
      addNotification('error', 'Validazione Fallita', 'La risposta corretta deve essere una delle opzioni inserite');
      return;
    }

    try {
      const success = await updateQuizQuestion(editingQuestion.id, {
        question: editingQuestion.question.trim(),
        options: editingQuestion.options.filter(opt => opt.trim() !== ''),
        correct_answer: editingQuestion.correct_answer,
        explanation: editingQuestion.explanation.trim() || undefined,
        order_num: editingQuestion.order_num
      });

      if (success) {
        loadQuizQuestions(selectedQuizForQuestions.id); // Ricarica le domande
        setShowEditQuestion(false);
        setEditingQuestion(null);
        addNotification('success', 'Domanda Aggiornata', 'La domanda è stata modificata con successo');
      } else {
        addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare la domanda');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare la domanda');
    }
  }

  // Handler per eliminazione domanda quiz
  async function handleDeleteQuestion(questionId: string, questionText: string) {
    if (!hasPermission('education.delete')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per eliminare domande quiz');
      return;
    }

    const confirmed = window.confirm(
      `Sei sicuro di voler eliminare questa domanda?\n\n"${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}"\n\nQuesta azione non può essere annullata.`
    );

    if (!confirmed) return;

    try {
      const success = await deleteQuizQuestion(questionId);
      if (success) {
        loadQuizQuestions(selectedQuizForQuestions.id); // Ricarica le domande
        addNotification('success', 'Domanda Eliminata', 'La domanda è stata rimossa dal quiz');
      } else {
        addNotification('error', 'Errore Eliminazione', 'La domanda non è stata trovata o non può essere eliminata');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare la domanda');
    }
  }

  // Handler per aprire modal di modifica domanda
  function handleEditQuestion(question: any) {
    setEditingQuestion({
      id: question.id,
      quiz_id: question.quiz_id,
      question: question.question,
      options: [...question.options, '', '', '', ''].slice(0, 4), // Assicura 4 slot
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      order_num: question.order_num
    });
    setShowEditQuestion(true);
  }

  // Handler per aprire gestione domande quiz
  function handleManageQuestions(quiz: any) {
    setSelectedQuizForQuestions(quiz);
    loadQuizQuestions(quiz.id);
    setQuestionForm({
      quiz_id: quiz.id,
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: '',
      order_num: quizQuestions.length + 1
    });
  }

  // Handler per preview quiz
  async function handlePreviewQuiz(quiz: any) {
    try {
      console.log('🎓 Admin: Avvio preview quiz:', quiz.title);
      const questions = await getQuizQuestions(quiz.id);
      
      if (questions.length === 0) {
        addNotification('warning', 'Quiz Vuoto', 'Questo quiz non contiene domande. Aggiungi almeno una domanda prima del preview.');
        return;
      }

      setPreviewQuiz({
        ...quiz,
        questions: questions
      });
      setPreviewAnswers({});
      setPreviewCurrentQuestion(0);
      setPreviewShowResults(false);
      setShowQuizPreview(true);
      
      console.log('🎓 Admin: Preview quiz avviato con', questions.length, 'domande');
    } catch (error) {
      console.error('Error loading quiz preview:', error);
      addNotification('error', 'Errore Preview', 'Non è stato possibile caricare il preview del quiz');
    }
  }

  // Handler per risposta preview
  function handlePreviewAnswer(questionId: string, answerIndex: number) {
    setPreviewAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  }

  // Handler per navigazione preview
  function handlePreviewNavigation(direction: 'prev' | 'next' | 'finish') {
    if (direction === 'prev' && previewCurrentQuestion > 0) {
      setPreviewCurrentQuestion(prev => prev - 1);
    } else if (direction === 'next' && previewCurrentQuestion < previewQuiz.questions.length - 1) {
      setPreviewCurrentQuestion(prev => prev + 1);
    } else if (direction === 'finish') {
      // Calcola risultati
      let correctAnswers = 0;
      previewQuiz.questions.forEach((question: any) => {
        if (previewAnswers[question.id] === question.correct_answer) {
          correctAnswers++;
        }
      });
      
      setPreviewShowResults(true);
      console.log('🎓 Admin: Preview completato -', correctAnswers, 'su', previewQuiz.questions.length, 'corrette');
    }
  }

  // Handler per reset preview
  function handleResetPreview() {
    setPreviewAnswers({});
    setPreviewCurrentQuestion(0);
    setPreviewShowResults(false);
  }

  // Funzione per validare completezza quiz
  function validateQuizCompleteness(quiz: any, questions: any[]) {
    const issues = [];
    
    if (!quiz.title?.trim()) issues.push('Titolo mancante');
    if (!quiz.description?.trim()) issues.push('Descrizione mancante');
    if (!quiz.time_limit || quiz.time_limit < 1) issues.push('Tempo limite non valido');
    if (!quiz.passing_score || quiz.passing_score < 1 || quiz.passing_score > 100) issues.push('Punteggio minimo non valido');
    if (!quiz.max_attempts || quiz.max_attempts < 1) issues.push('Tentativi massimi non validi');
    if (questions.length === 0) issues.push('Nessuna domanda presente');
    
    questions.forEach((q, index) => {
      if (!q.question?.trim()) issues.push(`Domanda ${index + 1}: testo mancante`);
      if (!q.options || q.options.length < 2) issues.push(`Domanda ${index + 1}: minimo 2 opzioni richieste`);
      if (q.correct_answer < 0 || q.correct_answer >= q.options.length) issues.push(`Domanda ${index + 1}: risposta corretta non valida`);
    });
    
    return issues;
  }

  const loadUserPermissions = async () => {
    try {
      if (profile?.role) {
        const permissions = await getUserPermissions(profile.role);
        setUserPermissions(permissions);
      }
    } catch (error) {
      console.error('Errore caricamento permessi utente:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission);
  };

  // Handler per creazione normativa
  async function handleCreateNormative() {
    // Verifica permessi prima di procedere
    if (!hasPermission('normatives.create')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per creare normative');
      return;
    }

    try {
      if (!normativeForm.title || !normativeForm.content || !normativeForm.reference_number) {
        addNotification('error', 'Errore Validazione', 'Titolo, contenuto e numero di riferimento sono obbligatori');
        return;
      }
      
      if (!normativeForm.publication_date || !normativeForm.effective_date) {
        addNotification('error', 'Errore Validazione', 'Date di pubblicazione e efficacia sono obbligatorie');
        return;
      }
      
      await createNormative({
        title: normativeForm.title,
        content: normativeForm.content,
        category: normativeForm.category || 'Generale',
        type: normativeForm.type,
        reference_number: normativeForm.reference_number,
        publication_date: normativeForm.publication_date,
        effective_date: normativeForm.effective_date,
        filename: normativeForm.filename || undefined,
        file_path: normativeForm.file_path || undefined,
        tags: normativeForm.tags
      });
      
      setShowAddNormative(false);
      setNormativeForm({
        title: '',
        content: '',
        category: '',
        type: 'law',
        reference_number: '',
        publication_date: '',
        effective_date: '',
        filename: '',
        file_path: '',
        tags: []
      });
      setTagInput('');
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Normativa Creata', `La normativa "${normativeForm.title}" è stata aggiunta al sistema`);
    } catch (error) {
      console.error('Error creating normative:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione della normativa');
    }
  }

  // Handler per modifica normativa
  async function handleUpdateNormative() {
    // Verifica permessi prima di procedere
    if (!hasPermission('normatives.edit')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per modificare normative');
      return;
    }

    console.log('🔄 handleUpdateNormative chiamato');
    console.log('📝 editingNormative:', editingNormative);

    try {
      if (!editingNormative) {
        console.error('❌ Nessuna normativa da modificare');
        return;
      }

      if (!editingNormative.title || !editingNormative.content || !editingNormative.reference_number) {
        console.error('❌ Campi obbligatori mancanti:', {
          title: !!editingNormative.title,
          content: !!editingNormative.content,
          reference_number: !!editingNormative.reference_number
        });
        addNotification('error', 'Errore Validazione', 'Titolo, contenuto e numero di riferimento sono obbligatori');
        return;
      }

      console.log('📤 Chiamando updateNormative con dati:', {
        id: editingNormative.id,
        title: editingNormative.title,
        reference_number: editingNormative.reference_number
      });

      await updateNormative(editingNormative.id, {
        title: editingNormative.title,
        content: editingNormative.content,
        category: editingNormative.category,
        type: editingNormative.type,
        reference_number: editingNormative.reference_number,
        publication_date: editingNormative.publication_date
          ? (editingNormative.publication_date instanceof Date
            ? formatDateForInput(editingNormative.publication_date)
            : editingNormative.publication_date)
          : editingNormative.publication_date,
        effective_date: editingNormative.effective_date
          ? (editingNormative.effective_date instanceof Date
            ? formatDateForInput(editingNormative.effective_date)
            : editingNormative.effective_date)
          : editingNormative.effective_date,
        filename: editingNormative.filename || undefined,
        file_path: editingNormative.file_path || undefined,
        tags: editingNormative.tags
      });

      console.log('✅ updateNormative completato');

      setEditingNormative(null);
      setShowEditNormative(false);
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Normativa Aggiornata', `La normativa "${editingNormative.title}" è stata modificata`);
    } catch (error) {
      console.error('🚨 Errore in handleUpdateNormative:', error);
      console.error('🚨 Dettagli errore:', error instanceof Error ? error.message : String(error));
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare la normativa');
    }
  }

  // Handler per eliminazione normativa
  async function handleDeleteNormative(normativeId: string, normativeTitle: string) {
    // Verifica permessi prima di procedere
    if (!hasPermission('normatives.delete')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per eliminare normative');
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare la normativa "${normativeTitle}"?`)) {
      return;
    }
    
    try {
      const success = await deleteNormative(normativeId);
      if (success) {
        await fetchAdminData(); // Refresh data
        addNotification('info', 'Normativa Eliminata', `La normativa "${normativeTitle}" è stata rimossa dal sistema`);
      } else {
        addNotification('error', 'Errore Eliminazione', 'La normativa non è stata trovata o non può essere eliminata');
      }
    } catch (error) {
      console.error('Error deleting normative:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare la normativa');
    }
  }

  // Handler per aprire modal di modifica
  function handleEditNormative(normative: any) {
    // Formatta correttamente le date per gli input HTML5 date SENZA cambiare timezone
    const formattedNormative = {
      ...normative,
      publication_date: normative.publication_date
        ? formatDateForInput(normative.publication_date)
        : '',
      effective_date: normative.effective_date
        ? formatDateForInput(normative.effective_date)
        : ''
    };
    setEditingNormative(formattedNormative);
    setShowEditNormative(true);
  }

  // Funzione per formattare le date per input HTML5 SENZA problemi di timezone
  function formatDateForInput(dateValue: any): string {
    if (!dateValue) return '';
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    // Usa il timezone locale per evitare problemi di conversione UTC
    // Formato YYYY-MM-DD mantenendo il giorno originale
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  function handleAddTag() {
    if (tagInput.trim() && !normativeForm.tags.includes(tagInput.trim())) {
      setNormativeForm({
        ...normativeForm,
        tags: [...normativeForm.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setNormativeForm({
      ...normativeForm,
      tags: normativeForm.tags.filter(tag => tag !== tagToRemove)
    });
  }

  function handleAddTagToEditing() {
    if (tagInput.trim() && editingNormative && !editingNormative.tags?.includes(tagInput.trim())) {
      const newTags = [...(editingNormative.tags || []), tagInput.trim()];
      setEditingNormative({...editingNormative, tags: newTags});
      setTagInput('');
    }
  }

  // Handler per download PDF documento (Admin)
  async function handleDownloadDocumentPDF(doc: any) {
    try {
      console.log('🔄 Generando PDF per documento:', doc.title);
      
      const pdfBlob = await generatePDF(doc, 'document');
      
      // Crea un link per il download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title || 'documento'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Download PDF completato con successo');
      addNotification('success', 'PDF Generato', `Il PDF del documento "${doc.title}" è stato scaricato`);
    } catch (error) {
      console.error('❌ Errore durante il download PDF:', error);
      addNotification('error', 'Errore Download', 'Si è verificato un errore durante la generazione del PDF');
    }
  }

  // Handler per download file originale (Admin)
  async function handleDownloadOriginalFile(doc: any) {
    try {
      if (!doc.file_path) {
        addNotification('error', 'File Non Disponibile', 'Nessun file originale disponibile per questo documento');
        return;
      }

      if (isGoogleDriveUrl(doc.file_path)) {
        await downloadGoogleDriveFile(doc.file_path, doc.filename || doc.title);
        addNotification('success', 'Download Completato', `Il file "${doc.filename || doc.title}" è stato scaricato da Google Drive`);
      } else {
        // Download standard per altri tipi di link
        const link = document.createElement('a');
        link.href = doc.file_path;
        link.download = doc.filename || doc.title || 'documento';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addNotification('success', 'Download Avviato', `Il download del file "${doc.filename || doc.title}" è stato avviato`);
      }
      
      console.log('✅ Download file originale completato con successo');
    } catch (error) {
      console.error('❌ Errore durante il download del file originale:', error);
      addNotification('error', 'Errore Download', 'Si è verificato un errore durante il download del file');
    }
  }

  // Handler per documenti
  async function handleCreateDocument() {
    // Verifica permessi prima di procedere
    if (!hasPermission('documents.create')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per creare documenti');
      return;
    }

    try {
      if (!documentForm.title || !documentForm.filename || !documentForm.type || !documentForm.category) {
        addNotification('error', 'Errore Validazione', 'Titolo, filename, tipo e categoria sono obbligatori');
        return;
      }

      await createDocument({
        title: documentForm.title,
        description: documentForm.description,
        filename: documentForm.filename,
        file_path: documentForm.file_path,
        file_size: documentForm.file_size ? parseInt(documentForm.file_size) : undefined,
        mime_type: documentForm.mime_type,
        type: documentForm.type,
        category: documentForm.category,
        tags: documentForm.tags,
        version: documentForm.version,
        status: documentForm.status,
        uploaded_by: profile?.id
      });

      setShowAddDocument(false);
      setDocumentForm({
        title: '',
        description: '',
        filename: '',
        file_path: '',
        file_size: '',
        mime_type: '',
        type: 'template',
        category: '',
        tags: [],
        version: '1.0',
        status: 'active'
      });
      setDocumentTagInput('');
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Documento Creato', `Il documento "${documentForm.title}" è stato aggiunto al sistema`);
    } catch (error) {
      console.error('Error creating document:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione del documento');
    }
  }

  async function handleUpdateDocument() {
    // Verifica permessi prima di procedere
    if (!hasPermission('documents.edit')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per modificare documenti');
      return;
    }

    console.log('🔄 handleUpdateDocument chiamato');

    try {
      if (!editingDocument) {
        console.error('❌ Nessun documento da modificare');
        return;
      }

      if (!editingDocument.title || !editingDocument.filename || !editingDocument.type || !editingDocument.category) {
        console.error('❌ Campi obbligatori mancanti');
        addNotification('error', 'Errore Validazione', 'Titolo, filename, tipo e categoria sono obbligatori');
        return;
      }

      console.log('📤 Chiamando updateDocument con dati:', {
        id: editingDocument.id,
        title: editingDocument.title
      });

      await updateDocument(editingDocument.id, {
        title: editingDocument.title,
        description: editingDocument.description,
        filename: editingDocument.filename,
        file_path: editingDocument.file_path,
        file_size: editingDocument.file_size,
        mime_type: editingDocument.mime_type,
        type: editingDocument.type,
        category: editingDocument.category,
        tags: editingDocument.tags,
        version: editingDocument.version,
        status: editingDocument.status,
        download_count: editingDocument.download_count,
        created_at: editingDocument.created_at,
        updated_at: editingDocument.updated_at
      });

      console.log('✅ updateDocument completato');

      setEditingDocument(null);
      setShowEditDocument(false);
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Documento Aggiornato', `Il documento "${editingDocument.title}" è stato modificato`);
    } catch (error) {
      console.error('🚨 Errore in handleUpdateDocument:', error);
      console.error('🚨 Dettagli errore:', error instanceof Error ? error.message : String(error));
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare il documento');
    }
  }

  async function handleDeleteDocument(documentId: string, documentTitle: string) {
    // Verifica permessi prima di procedere
    if (!hasPermission('documents.delete')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per eliminare documenti');
      return;
    }
    
    setDeleteConfirm({ show: true, document: { id: documentId, title: documentTitle } });
  }

  async function confirmDeleteDocument() {
    if (!deleteConfirm.document) return;

    try {
      const success = await deleteDocument(deleteConfirm.document.id);
      if (success) {
        await fetchAdminData(); // Refresh data
        addNotification('info', 'Documento Rimosso', `Il documento "${deleteConfirm.document.title}" è stato eliminato dal sistema`);
      } else {
        addNotification('error', 'Errore Eliminazione', 'Il documento non è stato trovato o non può essere eliminato');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare il documento');
    } finally {
      setDeleteConfirm({ show: false, document: null });
    }
  }

  // Handler per aprire modal di modifica documento
  function handleEditDocument(document: any) {
    setEditingDocument(document);
    setShowEditDocument(true);
  }

  // Handler per tag documenti
  function handleAddDocumentTag() {
    if (documentTagInput.trim() && !documentForm.tags.includes(documentTagInput.trim())) {
      setDocumentForm({
        ...documentForm,
        tags: [...documentForm.tags, documentTagInput.trim()]
      });
      setDocumentTagInput('');
    }
  }

  function handleRemoveDocumentTag(tagToRemove: string) {
    setDocumentForm({
      ...documentForm,
      tags: documentForm.tags.filter(tag => tag !== tagToRemove)
    });
  }

  function handleAddDocumentTagToEditing() {
    if (documentTagInput.trim() && editingDocument && !editingDocument.tags?.includes(documentTagInput.trim())) {
      const newTags = [...(editingDocument.tags || []), documentTagInput.trim()];
      setEditingDocument({...editingDocument, tags: newTags});
      setDocumentTagInput('');
    }
  }

  function addNotification(type: 'success' | 'error' | 'info', title: string, message: string) {
    const id = Date.now().toString();
    const notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }

  function removeNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const fetchAdminData = async () => {
    console.log('🔄 DEBUG fetchAdminData - INIZIO');
    console.log('🔄 DEBUG - activeTab prima del fetch:', activeTab);
    console.log('🔄 DEBUG - educationTab prima del fetch:', educationTab);
    
    try {
      setLoading(true);
      
      // Fetch admin data
      const [totalUsers, totalNormatives, totalDocuments, totalCourses, usersData, normativesData, documentsData, coursesData] = await Promise.all([
        getUsersCount(),
        getNormativesCount(),
        getDocumentsCount(),
        getCoursesCount(),
        getAllUsers(profile?.role !== 'superadmin', profile?.id), // Escludi SuperAdmin solo se non sei SuperAdmin
        getAllNormatives(),
        getAllDocuments(),
        getAllCourses()
      ]);

      console.log('🔄 DEBUG - Dati ricevuti, setting states...');
      
      setUsers(usersData || []);
      setNormatives(normativesData || []);
      setDocuments(documentsData || []);
      setCourses(coursesData || []);

      // Carica moduli se c'è un corso selezionato
      let modulesData: any[] = [];
      if (selectedCourse) {
        console.log('🔄 DEBUG - Caricamento moduli per corso selezionato:', selectedCourse);
        modulesData = await getCourseModules(selectedCourse);
      } else if (educationTab === 'modules' && coursesData.length > 0) {
        // Se siamo nella tab moduli ma non c'è corso selezionato, carica TUTTI i moduli
        console.log('🔄 DEBUG - Caricamento TUTTI i moduli per la sezione Moduli');
        for (const course of coursesData) {
          const courseModules = await getCourseModules(course.id);
          modulesData.push(...courseModules);
        }
        console.log('🔄 DEBUG - Totale moduli caricati:', modulesData.length);
      }
      
      setModules(modulesData || []);

      console.log('🔄 DEBUG - activeTab dopo il fetch:', activeTab);
      console.log('🔄 DEBUG - educationTab dopo il fetch:', educationTab);
      
      setLoading(false);
      console.log('🔄 DEBUG fetchAdminData - FINE');
    } catch (error) {
      console.error('🚨 Error fetching admin data:', error);
      console.log('🔄 DEBUG - activeTab in caso di errore:', activeTab);
      console.log('🔄 DEBUG - educationTab in caso di errore:', educationTab);
      setLoading(false);
    }
  };

  async function handleCreateUser() {
    // Verifica permessi prima di procedere
    if (!hasPermission('users.create')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per creare utenti');
      return;
    }

    try {
      if (!userForm.email || !userForm.full_name || !userForm.password) {
        addNotification('error', 'Errore Validazione', 'Tutti i campi sono obbligatori per creare un utente');
        return;
      }
      
      await createNewUser(userForm.email, userForm.full_name, userForm.password, userForm.role);
      setShowAddUser(false);
      setUserForm({ email: '', full_name: '', password: '', role: 'user' });
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Utente Creato', `L'utente ${userForm.full_name} è stato aggiunto al sistema`);
    } catch (error) {
      console.error('Error creating user:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione dell\'utente');
    }
  }

  async function handleUpdateUser() {
    // Verifica permessi prima di procedere
    if (!hasPermission('users.edit')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per modificare utenti');
      return;
    }

    try {
      if (!editingUser) return;
      
      await updateUser(editingUser.id, {
        email: editingUser.email,
        full_name: editingUser.full_name,
        role: editingUser.role
      });
      
      setEditingUser(null);
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Utente Aggiornato', `Le informazioni di ${editingUser.full_name} sono state salvate`);
    } catch (error) {
      console.error('Error updating user:', error);
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare le informazioni dell\'utente');
    }
  }

  async function handleDeleteUser(userId: string, userEmail: string) {
    // Verifica permessi prima di procedere
    if (!hasPermission('users.delete')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per eliminare utenti');
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare l'utente ${userEmail}?`)) {
      return;
    }
    
    try {
      await deleteUser(userId);
      await fetchAdminData(); // Refresh data
      addNotification('info', 'Utente Rimosso', `L'utente ${userEmail} è stato eliminato dal sistema`);
    } catch (error) {
      console.error('Error deleting user:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare l\'utente');
    }
  }

  async function handleUpdatePassword() {
    try {
      if (!showPasswordModal || !newPassword) {
        addNotification('error', 'Password Richiesta', 'Inserisci una nuova password per continuare');
        return;
      }
      
      if (newPassword.length < 6) {
        addNotification('error', 'Password Troppo Corta', 'La password deve contenere almeno 6 caratteri');
        return;
      }
      
      await updateUserPassword(showPasswordModal.id, newPassword);
      setShowPasswordModal(null);
      setNewPassword('');
      addNotification('success', 'Password Aggiornata', `La password di ${showPasswordModal.full_name} è stata modificata`);
    } catch (error) {
      console.error('Error updating password:', error);
      addNotification('error', 'Errore Password', 'Non è stato possibile aggiornare la password');
    }
  }

  // ==============================================
  // FUNZIONI GESTIONE CORSI
  // ==============================================

  async function handleCreateCourse() {
    if (!hasPermission('education.create')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per creare corsi');
      return;
    }

    try {
      if (!courseForm.title || !courseForm.description || !courseForm.instructor) {
        addNotification('error', 'Errore Validazione', 'Titolo, descrizione e istruttore sono obbligatori');
        return;
      }
      
      await createCourse(courseForm);
      setShowAddCourse(false);
      setCourseForm({
        title: '',
        description: '',
        duration: '',
        level: 'beginner',
        instructor: '',
        category: '',
        status: 'draft',
        rating: 0,
        tags: [],
        file_path: '',
        thumbnail_path: '',
        price: 0,
        is_free: true,
        certificate_template: '',
        passing_score: 70
      });
      setCourseTagInput('');
      await fetchAdminData();
      addNotification('success', 'Corso Creato', `Il corso "${courseForm.title}" è stato aggiunto al sistema`);
    } catch (error) {
      console.error('Error creating course:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione del corso');
    }
  }

  async function handleUpdateCourse() {
    if (!hasPermission('education.edit')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per modificare corsi');
      return;
    }

    try {
      if (!editingCourse) return;
      
      await updateCourse(editingCourse.id, courseForm);
      setEditingCourse(null);
      setShowEditCourse(false);
      await fetchAdminData();
      addNotification('success', 'Corso Aggiornato', `Il corso "${editingCourse.title}" è stato modificato`);
    } catch (error) {
      console.error('🚨 Errore in handleUpdateCourse:', error);
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare il corso');
    }
  }

  async function handleDeleteCourse() {
    if (!hasPermission('education.delete')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per eliminare corsi');
      return;
    }

    const { course } = courseDeleteConfirm;
    if (!course) return;
    
    try {
      const success = await deleteCourse(course.id);
      if (success) {
        await fetchAdminData();
        addNotification('info', 'Corso Eliminato', `Il corso "${course.title}" è stato rimosso dal sistema`);
      } else {
        addNotification('error', 'Errore Eliminazione', 'Il corso non è stato trovato o non può essere eliminato');
      }
    } catch (error) {
      console.error('🚨 Errore in handleDeleteCourse:', error);
      addNotification('error', 'Errore Eliminazione', 'Si è verificato un errore durante l\'eliminazione del corso');
    } finally {
      setCourseDeleteConfirm({ show: false, course: null });
    }
  }

  const addCourseTag = () => {
    if (courseTagInput.trim() && !courseForm.tags?.includes(courseTagInput.trim())) {
      setCourseForm({
        ...courseForm,
        tags: [...(courseForm.tags || []), courseTagInput.trim()]
      });
      setCourseTagInput('');
    }
  };

  const removeCourseTag = (tag: string) => {
    setCourseForm({
      ...courseForm,
      tags: courseForm.tags?.filter(t => t !== tag) || []
    });
  };

  // ==============================================
  // FUNZIONI HANDLER MODULI
  // ==============================================

  async function handleCreateModule(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!hasPermission('education.create')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per creare moduli');
      return;
    }

    try {
      await createCourseModule(moduleForm);
      
      setShowAddModule(false);
      setModuleForm({
        course_id: '',
        title: '',
        description: '',
        type: 'lesson',
        content: '',
        video_url: '',
        document_url: '',
        order_num: 1,
        duration_minutes: 0,
        is_required: true,
        level: 'beginner'
      });
      await fetchAdminData();
      addNotification('success', 'Modulo Creato', `Il modulo "${moduleForm.title}" è stato aggiunto al sistema`);
    } catch (error) {
      console.error('Error creating module:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione del modulo');
    }
  }

  async function handleUpdateModule(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔧 DEBUG handleUpdateModule - INIZIO');
    console.log('🔧 DEBUG - Current activeTab:', activeTab);
    console.log('🔧 DEBUG - Current educationTab:', educationTab);
    console.log('🔧 DEBUG - editingModule:', editingModule);
    console.log('🔧 DEBUG - moduleForm:', moduleForm);
    
    if (!hasPermission('education.edit')) {
      console.log('🔧 DEBUG - Permessi negati');
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per modificare moduli');
      return;
    }

    try {
      if (!editingModule) {
        console.log('🔧 DEBUG - Nessun modulo in editing, uscita');
        return;
      }
      
      console.log('🔧 DEBUG - Chiamata updateCourseModule con ID:', editingModule.id);
      const result = await updateCourseModule(editingModule.id, moduleForm);
      console.log('🔧 DEBUG - Risultato updateCourseModule:', result);
      
      if (!result) {
        throw new Error('updateCourseModule returned null - module not found or update failed');
      }
      
      console.log('🔧 DEBUG - Prima di chiudere modal - activeTab:', activeTab, 'educationTab:', educationTab);
      
      setEditingModule(null);
      setShowAddModule(false);
      setShowEditModule(false);
      console.log('🔧 DEBUG - Modal chiuso, stati resettati');
      
      console.log('🔧 DEBUG - Prima di fetchAdminData - activeTab:', activeTab, 'educationTab:', educationTab);
      await fetchAdminData();
      console.log('🔧 DEBUG - Dopo fetchAdminData - activeTab:', activeTab, 'educationTab:', educationTab);
      
      addNotification('success', 'Modulo Aggiornato', `Il modulo "${editingModule.title}" è stato modificato`);
      console.log('🔧 DEBUG handleUpdateModule - FINE SUCCESSO');
    } catch (error) {
      console.error('🚨 Errore in handleUpdateModule:', error);
      console.log('🔧 DEBUG - Errore durante update - activeTab:', activeTab, 'educationTab:', educationTab);
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare il modulo');
    }
  }

  async function handleDeleteModule(moduleId: string, moduleTitle: string) {
    if (!hasPermission('education.delete')) {
      addNotification('error', 'Accesso Negato', 'Non hai i permessi per eliminare moduli');
      return;
    }
    
    try {
      const success = await deleteCourseModule(moduleId);
      if (success) {
        await fetchAdminData();
        addNotification('info', 'Modulo Eliminato', `Il modulo "${moduleTitle}" è stato rimosso dal sistema`);
      } else {
        addNotification('error', 'Errore Eliminazione', 'Il modulo non è stato trovato o non può essere eliminato');
      }
    } catch (error) {
      console.error('🚨 Errore in handleDeleteModule:', error);
      addNotification('error', 'Errore Eliminazione', 'Si è verificato un errore durante l\'eliminazione del modulo');
    }
  }

  function handleEditModule(module: any) {
    setModuleForm({
      course_id: module.course_id,
      title: module.title,
      description: module.description,
      type: module.type,
      content: module.content || '',
      video_url: module.video_url || '',
      document_url: module.document_url || '',
      order_num: module.order_num,
      duration_minutes: module.duration_minutes || 0,
      is_required: module.is_required,
      level: module.level
    });
    setEditingModule(module);
    setShowEditModule(true);
  }

  function handleEditCourse(course: any) {
    setCourseForm({
      title: course.title,
      description: course.description,
      level: course.level,
      instructor: course.instructor,
      category: course.category,
      status: course.status,
      rating: course.rating,
      tags: course.tags || [],
      thumbnail_path: course.thumbnail_path,
      video_path: course.video_path,
      document_path: course.document_path,
      price: course.price,
      is_free: course.is_free,
      certificate_template: course.certificate_template,
      passing_score: course.passing_score
    });
    setEditingCourse(course);
    setShowEditCourse(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Utenti Totali',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: `+${stats.newUsersThisMonth} questo mese`
    },
    {
      title: 'Normative Pubblicate',
      value: stats.totalNormatives,
      icon: FileText,
      color: 'bg-green-500',
      change: '+5 questa settimana'
    },
    {
      title: 'Documenti Caricati',
      value: stats.totalDocuments,
      icon: Download,
      color: 'bg-indigo-500',
      change: '+12 questa settimana'
    },
    {
      title: 'Corsi Disponibili',
      value: stats.totalCourses,
      icon: GraduationCap,
      color: 'bg-purple-500',
      change: '+2 questa settimana'
    },
    {
      title: 'Visualizzazioni Totali',
      value: stats.totalViews,
      icon: Eye,
      color: 'bg-emerald-500',
      change: '+156 oggi'
    },
    {
      title: 'Tasso di Completamento',
      value: '73%',
      icon: BarChart3,
      color: 'bg-orange-500',
      change: '+5% vs scorso mese'
    }
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => {
            const Icon = notification.type === 'success' ? CheckCircle : 
                        notification.type === 'error' ? AlertCircle : Info;
            const bgColor = notification.type === 'success' ? 'bg-green-50 border-green-200' :
                           notification.type === 'error' ? 'bg-red-50 border-red-200' :
                           'bg-blue-50 border-blue-200';
            const iconColor = notification.type === 'success' ? 'text-green-600' :
                             notification.type === 'error' ? 'text-red-600' :
                             'text-blue-600';
            const textColor = notification.type === 'success' ? 'text-green-800' :
                             notification.type === 'error' ? 'text-red-800' :
                             'text-blue-800';
            
            return (
              <div
                key={notification.id}
                className={`${bgColor} border rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right duration-300`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold ${textColor}`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm ${textColor} opacity-90 mt-1`}>
                      {notification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className={`${iconColor} hover:opacity-70 transition-opacity`}
                    aria-label="Chiudi notifica"
                    title="Chiudi notifica"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Pannello Amministrativo
          </h1>
          <p className="text-gray-600">
            Gestione utenti, contenuti e monitoraggio piattaforma
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </p>
                <span className="text-sm text-green-600 font-medium">
                  {stat.change}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          {/* Mobile Tab Navigation */}
          <div className="md:hidden p-4">
            <div className="space-y-2">
              {[
                { id: 'overview', label: 'Panoramica', icon: Settings },
                { id: 'users', label: 'Utenti', icon: Users },
                { id: 'normatives', label: 'Normative', icon: FileText },
                { id: 'documents', label: 'Documenti', icon: FolderOpen },
                { id: 'education', label: 'Formazione', icon: GraduationCap }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between p-4 min-h-[44px] rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <div className="hidden md:block">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Panoramica', icon: Settings },
                { id: 'users', label: 'Utenti', icon: Users },
                { id: 'normatives', label: 'Normative', icon: FileText },
                { id: 'documents', label: 'Documenti', icon: FolderOpen },
                { id: 'education', label: 'Formazione', icon: GraduationCap }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attività Recenti
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Nuova normativa pubblicata</p>
                      <p className="text-sm text-gray-600">Regolamento Trasporti 2024</p>
                    </div>
                    <span className="text-sm text-gray-500">2 ore fa</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Nuovo utente registrato</p>
                      <p className="text-sm text-gray-600">Marco Rossi</p>
                    </div>
                    <span className="text-sm text-gray-500">5 ore fa</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Gestione Utenti ({users.length})
                  </h3>
                  <button
                    onClick={() => setShowAddUser(true)}
                    disabled={!hasPermission('users.create')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      hasPermission('users.create')
                        ? 'bg-blue-800 text-white hover:bg-blue-900'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Utente</span>
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                      {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-0"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                            {editingUser?.id === user.id ? (
                              <input
                                type="text"
                                value={editingUser.full_name}
                                onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                              className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            ) : (
                              user.full_name
                            )}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                            {editingUser?.id === user.id ? (
                              <input
                                type="email"
                                value={editingUser.email}
                                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                              className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            ) : (
                              user.email
                            )}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                            user.role === 'operator' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {editingUser?.id === user.id ? (
                              <select
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'user' | 'admin' | 'superadmin' | 'operator'})}
                                className="px-2 py-1 border border-gray-300 rounded text-xs min-h-[44px]"
                              >
                                <option value="user">Utente</option>
                                <option value="operator">Operatore</option>
                                <option value="admin">Admin</option>
                                {profile?.role === 'superadmin' && (
                                  <option value="superadmin">SuperAdmin</option>
                                )}
                              </select>
                            ) : (
                              user.role === 'superadmin' ? 'SuperAdmin' :
                                 user.role === 'admin' ? 'Admin' : 
                               user.role === 'operator' ? 'Operatore' : 'Utente'
                            )}
                          </span>
                          <span className="whitespace-nowrap">
                            {new Date(user.created_at).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>
                      
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                            {editingUser?.id === user.id ? (
                          <>
                                <button
                                  onClick={handleUpdateUser}
                              className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
                                  title="Salva"
                                >
                              <Save className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                              className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                  title="Annulla"
                                >
                              <X className="h-5 w-5" />
                                </button>
                          </>
                            ) : (
                          <>
                                <button
                                  onClick={() => setEditingUser({...user})}
                                  disabled={!hasPermission('users.edit')}
                              className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                                    hasPermission('users.edit')
                                  ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                      : 'text-gray-300 cursor-not-allowed'
                                  }`}
                                  title={hasPermission('users.edit') ? 'Modifica' : 'Permesso negato'}
                                >
                              <Edit3 className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setShowPasswordModal(user)}
                              className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-yellow-600 transition-colors rounded-lg hover:bg-yellow-50"
                                  title="Cambia Password"
                                >
                              <Key className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  disabled={!hasPermission('users.delete')}
                              className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                                    hasPermission('users.delete')
                                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                      : 'text-gray-300 cursor-not-allowed'
                                  }`}
                                  title={hasPermission('users.delete') ? 'Elimina' : 'Permesso negato'}
                                >
                              <Trash2 className="h-5 w-5" />
                                </button>
                          </>
                            )}
                      </div>
                    </div>
                      ))}
                </div>
              </div>
            )}

            {activeTab === 'normatives' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Gestione Normative ({normatives.length})
                  </h3>
                  <button
                    onClick={() => setShowAddNormative(true)}
                    disabled={!hasPermission('normatives.create')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      hasPermission('normatives.create')
                        ? 'bg-blue-800 text-white hover:bg-blue-900'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Normativa</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {normatives.map((normative) => (
                    <div
                      key={normative.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-0"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                          {normative.title}
                        </h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            normative.type === 'law' ? 'bg-blue-100 text-blue-800' :
                            normative.type === 'regulation' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {normative.type === 'law' ? 'Legge' :
                             normative.type === 'regulation' ? 'Regolamento' : 'Sentenza'}
                          </span>
                          <span className="truncate">{normative.reference_number}</span>
                          <span className="whitespace-nowrap">
                            {normative.publication_date 
                              ? new Date(normative.publication_date).toLocaleDateString('it-IT')
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                        <button 
                          onClick={() => console.log('View normative:', normative.id)}
                          className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                          title="Visualizza"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleEditNormative(normative)}
                          disabled={!hasPermission('normatives.edit')}
                          className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                            hasPermission('normatives.edit')
                              ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={hasPermission('normatives.edit') ? 'Modifica' : 'Permesso negato'}
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteNormative(normative.id, normative.title)}
                          disabled={!hasPermission('normatives.delete')}
                          className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                            hasPermission('normatives.delete')
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={hasPermission('normatives.delete') ? 'Elimina' : 'Permesso negato'}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Gestione Documenti ({documents.length})
                  </h3>
                  <button
                    onClick={() => setShowAddDocument(true)}
                    disabled={!hasPermission('documents.create')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      hasPermission('documents.create')
                        ? 'bg-blue-800 text-white hover:bg-blue-900'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Documento</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-0"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                          {document.filename}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                          {document.title}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            document.type === 'template' ? 'bg-blue-100 text-blue-800' :
                            document.type === 'form' ? 'bg-green-100 text-green-800' :
                            document.type === 'guide' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {document.type === 'template' ? 'Template' :
                             document.type === 'form' ? 'Modulo' :
                             document.type === 'guide' ? 'Guida' : 'Report'}
                          </span>
                          <span className="truncate">{document.category}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            document.status === 'active' ? 'bg-green-100 text-green-800' :
                            document.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {document.status === 'active' ? 'Attivo' :
                             document.status === 'draft' ? 'Bozza' : 'Archiviato'}
                          </span>
                          <span className="whitespace-nowrap">📊 {document.download_count} download</span>
                          {document.file_size && <span className="whitespace-nowrap">💾 {document.file_size} KB</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                        <button
                          onClick={() => setViewingDocument(document)}
                          className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                          title="Visualizza"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocumentPDF(document)}
                          className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
                          title="Scarica PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {document.file_path && (
                          <button
                            onClick={() => handleDownloadOriginalFile(document)}
                            className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                              isGoogleDriveUrl(document.file_path) 
                                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' 
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={isGoogleDriveUrl(document.file_path) ? "Scarica da Google Drive" : "Scarica File Originale"}
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditDocument(document)}
                          disabled={!hasPermission('documents.edit')}
                          className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                            hasPermission('documents.edit')
                              ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={hasPermission('documents.edit') ? 'Modifica' : 'Permesso negato'}
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(document.id, document.title)}
                          disabled={!hasPermission('documents.delete')}
                          className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                            hasPermission('documents.delete')
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={hasPermission('documents.delete') ? 'Elimina' : 'Permesso negato'}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div className="space-y-6">
                {/* Sottotab Formazione */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => setEducationTab('courses')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        educationTab === 'courses'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Corsi
                    </button>
                    <button
                      onClick={() => setEducationTab('modules')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        educationTab === 'modules'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Moduli
                    </button>
                    <button
                      onClick={() => setEducationTab('quiz')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        educationTab === 'quiz'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Quiz
                    </button>
                  </nav>
                </div>

                {/* Sezione Corsi */}
                {educationTab === 'courses' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Gestione Corsi ({courses.length})
                      </h3>
                  <button
                    onClick={() => setShowAddCourse(true)}
                    disabled={!hasPermission('education.create')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      hasPermission('education.create')
                        ? 'bg-blue-800 text-white hover:bg-blue-900'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Corso</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-0"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                          {course.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                            course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {course.level === 'beginner' ? 'Principiante' :
                             course.level === 'intermediate' ? 'Intermedio' : 'Avanzato'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            course.status === 'published' ? 'bg-green-100 text-green-800' :
                            course.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {course.status === 'published' ? 'Pubblicato' :
                             course.status === 'draft' ? 'Bozza' : 'Archiviato'}
                          </span>
                          <span>Istruttore: {course.instructor}</span>
                          <span>Iscritti: {course.enrollment_count || 0}</span>
                          {course.is_free ? (
                            <span className="text-green-600 font-medium">Gratuito</span>
                          ) : (
                            <span className="text-blue-600 font-medium">€{course.price}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-1">
                        <button
                          onClick={() => handleEditCourse(course)}
                          disabled={!hasPermission('education.edit')}
                          className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                            hasPermission('education.edit')
                              ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={hasPermission('education.edit') ? 'Modifica' : 'Permesso negato'}
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setCourseDeleteConfirm({ show: true, course })}
                          disabled={!hasPermission('education.delete')}
                          className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                            hasPermission('education.delete')
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={hasPermission('education.delete') ? 'Elimina' : 'Permesso negato'}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                  </div>
                )}

                {/* Sezione Moduli */}
                {educationTab === 'modules' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Gestione Moduli ({filteredModules.length} di {modules.length})
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            console.log('🔧 DEBUG: Manual load all modules clicked');
                            loadAllModules();
                          }}
                          className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Carica Moduli</span>
                        </button>
                        <button
                          onClick={() => {
                            setModuleFilters({ course: '', type: '', level: '' });
                            loadAllModules();
                          }}
                          className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Reset Filtri</span>
                        </button>
                        <button
                          onClick={() => loadAllModules()}
                          className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Ricarica</span>
                        </button>
                        <button
                          onClick={() => setShowAddModule(true)}
                          disabled={!hasPermission('education.create')}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                            hasPermission('education.create')
                              ? 'bg-blue-800 text-white hover:bg-blue-900'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="h-5 w-5" />
                          <span>Aggiungi Modulo</span>
                        </button>
                      </div>
                    </div>

                    {/* Filtri Moduli */}
                    <div className="space-y-4">
                      {/* Indicatori filtri attivi */}
                      {(moduleFilters.course || moduleFilters.type || moduleFilters.level) && (
                        <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 rounded-lg">
                          <span className="text-sm font-medium text-blue-800">Filtri attivi:</span>
                          {moduleFilters.course && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Corso: {courses.find(c => c.id === moduleFilters.course)?.title || 'Sconosciuto'}
                            </span>
                          )}
                          {moduleFilters.type && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Tipo: {moduleFilters.type}
                            </span>
                          )}
                          {moduleFilters.level && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              Livello: {moduleFilters.level}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <select
                        value={moduleFilters.course}
                        onChange={(e) => {
                          const courseId = e.target.value;
                          setModuleFilters({...moduleFilters, course: courseId});
                          if (courseId) {
                            loadModulesForCourse(courseId);
                          } else {
                            loadAllModules();
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Tutti i corsi</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                      <select
                        value={moduleFilters.type}
                        onChange={(e) => setModuleFilters({...moduleFilters, type: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Tutti i tipi</option>
                        <option value="lesson">Lezione</option>
                        <option value="video">Video</option>
                        <option value="document">Documento</option>
                        <option value="quiz">Quiz</option>
                      </select>
                      <select
                        value={moduleFilters.level}
                        onChange={(e) => setModuleFilters({...moduleFilters, level: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Tutti i livelli</option>
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzato</option>
                      </select>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 overflow-x-auto">
                      {filteredModules.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">
                            {modules.length === 0 ? 'Nessun modulo trovato' : 'Nessun modulo corrisponde ai filtri'}
                          </p>
                          <p className="text-sm">
                            {modules.length === 0 ? 'Seleziona un corso o aggiungi un nuovo modulo' : 'Prova a modificare i filtri o aggiungi un nuovo modulo'}
                          </p>
                        </div>
                      ) : (
                        filteredModules.map((module) => (
                        <div
                          key={module.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-0"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                              {module.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                              {module.description}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                module.type === 'lesson' ? 'bg-blue-100 text-blue-800' :
                                module.type === 'video' ? 'bg-purple-100 text-purple-800' :
                                module.type === 'document' ? 'bg-green-100 text-green-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {module.type === 'lesson' ? 'Lezione' :
                                 module.type === 'video' ? 'Video' :
                                 module.type === 'document' ? 'Documento' : 'Quiz'}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                module.level === 'beginner' ? 'bg-green-100 text-green-800' :
                                module.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {module.level === 'beginner' ? 'Principiante' :
                                 module.level === 'intermediate' ? 'Intermedio' : 'Avanzato'}
                              </span>
                              <span>Ordine: {module.order_num}</span>
                              {module.duration_minutes && (
                                <span>Durata: {module.duration_minutes} min</span>
                              )}
                              {module.is_required && (
                                <span className="text-red-600 font-medium">Obbligatorio</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-1">
                            <button
                              onClick={() => handleEditModule(module)}
                              disabled={!hasPermission('education.edit')}
                              className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                                hasPermission('education.edit')
                                  ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                              title={hasPermission('education.edit') ? 'Modifica' : 'Permesso negato'}
                            >
                              <Edit3 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteModule(module.id, module.title)}
                              disabled={!hasPermission('education.delete')}
                              className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                                hasPermission('education.delete')
                                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                              title={hasPermission('education.delete') ? 'Elimina' : 'Permesso negato'}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Sezione Quiz */}
                {educationTab === 'quiz' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Gestione Quiz ({quizzes.length})
                      </h3>
                      <button
                        onClick={() => setShowAddQuiz(true)}
                        disabled={!hasPermission('education.create')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          hasPermission('education.create')
                            ? 'bg-blue-800 text-white hover:bg-blue-900'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="h-5 w-5" />
                        <span>Aggiungi Quiz</span>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                      {quizzes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-6xl mb-4">🎯</div>
                          <h4 className="text-lg font-medium mb-2">Nessun quiz trovato</h4>
                          <p className="text-sm">I quiz vengono creati automaticamente quando aggiungi domande ai moduli dei corsi.</p>
                        </div>
                      ) : (
                        quizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-0"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                                {quiz.title}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                                Corso: {quiz.course_name} • Modulo: {quiz.module_name}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                <span className="px-2 py-1 rounded-full text-xs font-medium w-fit bg-blue-100 text-blue-800">
                                  {quiz.passing_score}% per superare
                                </span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium w-fit bg-green-100 text-green-800">
                                  {quiz.time_limit ? `${quiz.time_limit} min` : 'Tempo illimitato'}
                                </span>
                                <span className="whitespace-nowrap">
                                  {new Date(quiz.created_at).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                              <button
                                onClick={() => handlePreviewQuiz(quiz)}
                                className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
                                title="Preview Quiz"
                              >
                                <Play className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleManageQuestions(quiz)}
                                className="p-3 min-h-[48px] min-w-[48px] text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                                title="Gestisci Domande"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEditQuiz(quiz)}
                                disabled={!hasPermission('education.edit')}
                                className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                                  hasPermission('education.edit')
                                    ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title={hasPermission('education.edit') ? 'Modifica' : 'Permesso negato'}
                              >
                                <Edit3 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                disabled={!hasPermission('education.delete')}
                                className={`p-3 min-h-[48px] min-w-[48px] transition-colors rounded-lg ${
                                  hasPermission('education.delete')
                                    ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title={hasPermission('education.delete') ? 'Elimina' : 'Permesso negato'}
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Aggiungi Quiz */}
        {showAddQuiz && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuovo Quiz</h3>
                <button
                  onClick={() => setShowAddQuiz(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modulo *</label>
                  <select
                    value={quizForm.module_id}
                    onChange={(e) => setQuizForm({...quizForm, module_id: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleziona un modulo</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {courses.find(c => c.id === module.course_id)?.title} - {module.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Titolo del quiz"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({...quizForm, description: e.target.value})}
                    className="w-full px-3 py-3 min-h-[100px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                    placeholder="Descrizione del quiz"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tempo Limite (minuti) *</label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={quizForm.time_limit}
                      onChange={(e) => setQuizForm({...quizForm, time_limit: parseInt(e.target.value) || 30})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Punteggio Minimo (%) *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({...quizForm, passing_score: parseInt(e.target.value) || 60})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tentativi Massimi *</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={quizForm.max_attempts}
                      onChange={(e) => setQuizForm({...quizForm, max_attempts: parseInt(e.target.value) || 3})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowAddQuiz(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateQuiz}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Quiz */}
        {showEditQuiz && editingQuiz && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Quiz</h3>
                <button
                  onClick={() => setShowEditQuiz(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={editingQuiz.title}
                    onChange={(e) => setEditingQuiz({...editingQuiz, title: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Titolo del quiz"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                  <textarea
                    value={editingQuiz.description}
                    onChange={(e) => setEditingQuiz({...editingQuiz, description: e.target.value})}
                    className="w-full px-3 py-3 min-h-[100px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                    placeholder="Descrizione del quiz"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tempo Limite (minuti) *</label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={editingQuiz.time_limit}
                      onChange={(e) => setEditingQuiz({...editingQuiz, time_limit: parseInt(e.target.value) || 30})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Punteggio Minimo (%) *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingQuiz.passing_score}
                      onChange={(e) => setEditingQuiz({...editingQuiz, passing_score: parseInt(e.target.value) || 60})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tentativi Massimi *</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editingQuiz.max_attempts}
                      onChange={(e) => setEditingQuiz({...editingQuiz, max_attempts: parseInt(e.target.value) || 3})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowEditQuiz(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateQuiz}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Aggiorna Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Utente */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuovo Utente</h3>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@esempio.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome e Cognome"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value as 'user' | 'admin' | 'superadmin' | 'operator'})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">Utente</option>
                    <option value="operator">Operatore</option>
                    <option value="admin">Amministratore</option>
                    {profile?.role === 'superadmin' && (
                      <option value="superadmin">Super Amministratore</option>
                    )}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Utente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Normativa */}
        {showAddNormative && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuova Normativa</h3>
                <button
                  onClick={() => setShowAddNormative(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={normativeForm.title}
                    onChange={(e) => setNormativeForm({...normativeForm, title: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Titolo della normativa"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero di Riferimento *</label>
                  <input
                    type="text"
                    value={normativeForm.reference_number}
                    onChange={(e) => setNormativeForm({...normativeForm, reference_number: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es: D.Lgs. 285/1992"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={normativeForm.type}
                      onChange={(e) => setNormativeForm({...normativeForm, type: e.target.value as 'law' | 'regulation' | 'ruling'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="law">Legge</option>
                      <option value="regulation">Regolamento</option>
                      <option value="ruling">Sentenza</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <input
                      type="text"
                      value={normativeForm.category}
                      onChange={(e) => setNormativeForm({...normativeForm, category: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es: Trasporto Pubblico"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pubblicazione *</label>
                    <input
                      type="date"
                      value={normativeForm.publication_date}
                      onChange={(e) => setNormativeForm({...normativeForm, publication_date: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Efficacia *</label>
                    <input
                      type="date"
                      value={normativeForm.effective_date}
                      onChange={(e) => setNormativeForm({...normativeForm, effective_date: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File</label>
                    <input
                      type="text"
                      value={normativeForm.filename}
                      onChange={(e) => setNormativeForm({...normativeForm, filename: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="documento.pdf"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={normativeForm.file_path}
                      onChange={(e) => setNormativeForm({...normativeForm, file_path: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://drive.google.com/file/d/..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
                  <textarea
                    value={normativeForm.content}
                    onChange={(e) => setNormativeForm({...normativeForm, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Testo completo della normativa..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-3 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {normativeForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddNormative(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateNormative}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Normativa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Normativa */}
        {showEditNormative && editingNormative && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Normativa</h3>
                <button
                  onClick={() => setShowEditNormative(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={editingNormative.title}
                    onChange={(e) => setEditingNormative({...editingNormative, title: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero di Riferimento *</label>
                  <input
                    type="text"
                    value={editingNormative.reference_number}
                    onChange={(e) => setEditingNormative({...editingNormative, reference_number: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={editingNormative.type}
                      onChange={(e) => setEditingNormative({...editingNormative, type: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="law">Legge</option>
                      <option value="regulation">Regolamento</option>
                      <option value="ruling">Sentenza</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <input
                      type="text"
                      value={editingNormative.category}
                      onChange={(e) => setEditingNormative({...editingNormative, category: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pubblicazione *</label>
                    <input
                      type="date"
                      value={editingNormative.publication_date}
                      onChange={(e) => setEditingNormative({...editingNormative, publication_date: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Efficacia *</label>
                    <input
                      type="date"
                      value={editingNormative.effective_date}
                      onChange={(e) => setEditingNormative({...editingNormative, effective_date: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File</label>
                    <input
                      type="text"
                      value={editingNormative.filename || ''}
                      onChange={(e) => setEditingNormative({...editingNormative, filename: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="documento.pdf"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={editingNormative.file_path || ''}
                      onChange={(e) => setEditingNormative({...editingNormative, file_path: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://drive.google.com/file/d/..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
                  <textarea
                    value={editingNormative.content}
                    onChange={(e) => setEditingNormative({...editingNormative, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTagToEditing()}
                      placeholder="Aggiungi tag..."
                      className="flex-1 px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddTagToEditing}
                      className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingNormative.tags?.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = editingNormative.tags?.filter((_: string, i: number) => i !== index) || [];
                            setEditingNormative({...editingNormative, tags: newTags});
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditNormative(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateNormative}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal Cambia Password */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Cambia Password - {showPasswordModal.full_name}
                </h3>
                <button
                  onClick={() => setShowPasswordModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuova Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(null)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdatePassword}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Aggiorna Password
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal Aggiungi Documento */}
        {showAddDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuovo Documento</h3>
                <button
                  onClick={() => setShowAddDocument(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                    <input
                      type="text"
                      value={documentForm.title}
                      onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titolo del documento"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File *</label>
                    <input
                      type="text"
                      value={documentForm.filename}
                      onChange={(e) => setDocumentForm({...documentForm, filename: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="nomefile.pdf"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={documentForm.description}
                    onChange={(e) => setDocumentForm({...documentForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrizione del documento..."
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={documentForm.type}
                      onChange={(e) => setDocumentForm({...documentForm, type: e.target.value as 'template' | 'form' | 'guide' | 'report'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="template">Template</option>
                      <option value="form">Modulo</option>
                      <option value="guide">Guida</option>
                      <option value="report">Report</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                    <input
                      type="text"
                      value={documentForm.category}
                      onChange={(e) => setDocumentForm({...documentForm, category: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es: Amministrazione"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensione (KB)</label>
                    <input
                      type="number"
                      value={documentForm.file_size}
                      onChange={(e) => setDocumentForm({...documentForm, file_size: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1024"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versione</label>
                    <input
                      type="text"
                      value={documentForm.version}
                      onChange={(e) => setDocumentForm({...documentForm, version: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1.0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                    <select
                      value={documentForm.status}
                      onChange={(e) => setDocumentForm({...documentForm, status: e.target.value as 'active' | 'draft' | 'archived'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Attivo</option>
                      <option value="draft">Bozza</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={documentForm.file_path}
                      onChange={(e) => setDocumentForm({...documentForm, file_path: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/uploads/documenti/"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MIME</label>
                    <input
                      type="text"
                      value={documentForm.mime_type}
                      onChange={(e) => setDocumentForm({...documentForm, mime_type: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="application/pdf"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={documentTagInput}
                      onChange={(e) => setDocumentTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocumentTag())}
                      className="flex-1 px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddDocumentTag}
                      className="px-3 py-3 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {documentForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveDocumentTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddDocument(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Documento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Visualizza Documento */}
        {viewingDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Visualizza Documento</h3>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.title}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.filename}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[60px]">
                    {viewingDocument.description || 'Nessuna descrizione'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingDocument.type === 'template' ? 'bg-blue-100 text-blue-800' :
                        viewingDocument.type === 'form' ? 'bg-green-100 text-green-800' :
                        viewingDocument.type === 'guide' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {viewingDocument.type === 'template' ? 'Template' :
                         viewingDocument.type === 'form' ? 'Modulo' :
                         viewingDocument.type === 'guide' ? 'Guida' : 'Report'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.category}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensione</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.file_size ? `${viewingDocument.file_size} KB` : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versione</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.version || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingDocument.status === 'active' ? 'bg-green-100 text-green-800' :
                        viewingDocument.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {viewingDocument.status === 'active' ? 'Attivo' :
                         viewingDocument.status === 'draft' ? 'Bozza' : 'Archiviato'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm">
                      {viewingDocument.file_path || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MIME</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm">
                      {viewingDocument.mime_type || 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {viewingDocument.tags && viewingDocument.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewingDocument.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">Nessun tag</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Download</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      📊 {viewingDocument.download_count || 0} download
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Creazione</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.created_at ? new Date(viewingDocument.created_at).toLocaleDateString('it-IT') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-3 mt-6">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDownloadDocumentPDF(viewingDocument)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    title="Scarica PDF"
                  >
                    <Download className="h-3 w-3" />
                    <span>PDF</span>
                  </button>
                  {viewingDocument.file_path && (
                    <button
                      onClick={() => handleDownloadOriginalFile(viewingDocument)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                      title={isGoogleDriveUrl(viewingDocument.file_path) ? "Scarica da Google Drive" : "Scarica file originale"}
                    >
                      {isGoogleDriveUrl(viewingDocument.file_path) ? (
                        <svg className="h-3 w-3" viewBox="0 0 87.3 78" fill="none">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5l-7.65-13.25-5.15-8.9-.5-.85-13.75 23.8z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.9-22.3c-1.4-.8-2.95-1.2-4.5-1.2h18.5c1.6 0 3.15.45 4.5 1.2z" fill="#ffba00"/>
                        </svg>
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span>File</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="px-4 py-3 min-h-[44px] bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Documento */}
        {showEditDocument && editingDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Documento</h3>
                <button
                  onClick={() => setShowEditDocument(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                    <input
                      type="text"
                      value={editingDocument.title}
                      onChange={(e) => setEditingDocument({...editingDocument, title: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File *</label>
                    <input
                      type="text"
                      value={editingDocument.filename}
                      onChange={(e) => setEditingDocument({...editingDocument, filename: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={editingDocument.description || ''}
                    onChange={(e) => setEditingDocument({...editingDocument, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={editingDocument.type}
                      onChange={(e) => setEditingDocument({...editingDocument, type: e.target.value as 'template' | 'form' | 'guide' | 'report'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="template">Template</option>
                      <option value="form">Modulo</option>
                      <option value="guide">Guida</option>
                      <option value="report">Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                    <input
                      type="text"
                      value={editingDocument.category}
                      onChange={(e) => setEditingDocument({...editingDocument, category: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensione (KB)</label>
                    <input
                      type="number"
                      value={editingDocument.file_size || ''}
                      onChange={(e) => setEditingDocument({...editingDocument, file_size: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versione</label>
                    <input
                      type="text"
                      value={editingDocument.version || ''}
                      onChange={(e) => setEditingDocument({...editingDocument, version: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                    <select
                      value={editingDocument.status}
                      onChange={(e) => setEditingDocument({...editingDocument, status: e.target.value as 'active' | 'draft' | 'archived'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Attivo</option>
                      <option value="draft">Bozza</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={editingDocument.file_path || ''}
                      onChange={(e) => setEditingDocument({...editingDocument, file_path: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MIME</label>
                    <input
                      type="text"
                      value={editingDocument.mime_type || ''}
                      onChange={(e) => setEditingDocument({...editingDocument, mime_type: e.target.value})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conteggio Download</label>
                    <input
                      type="number"
                      value={editingDocument.download_count || 0}
                      onChange={(e) => setEditingDocument({...editingDocument, download_count: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Creazione</label>
                    <input
                      type="datetime-local"
                      value={editingDocument.created_at ? new Date(editingDocument.created_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingDocument({...editingDocument, created_at: e.target.value ? new Date(e.target.value).toISOString() : null})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Modifica</label>
                    <input
                      type="datetime-local"
                      value={editingDocument.updated_at ? new Date(editingDocument.updated_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingDocument({...editingDocument, updated_at: e.target.value ? new Date(e.target.value).toISOString() : null})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={documentTagInput}
                      onChange={(e) => setDocumentTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocumentTagToEditing())}
                      className="flex-1 px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddDocumentTagToEditing}
                      className="px-3 py-3 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingDocument.tags?.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = editingDocument.tags?.filter((_: string, i: number) => i !== index) || [];
                            setEditingDocument({...editingDocument, tags: newTags});
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditDocument(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateDocument}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal Conferma Eliminazione Documento */}
        {deleteConfirm.show && deleteConfirm.document && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Conferma Eliminazione</h3>
                <button
                  onClick={() => setDeleteConfirm({ show: false, document: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Sei sicuro di voler eliminare il documento <strong>"{deleteConfirm.document.title}"</strong>?
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Questa azione non può essere annullata.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm({ show: false, document: null })}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Elimina Documento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Corso */}
        {showAddCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuovo Corso</h3>
                <button
                  onClick={() => setShowAddCourse(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titolo
                  </label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Inserisci il titolo del corso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Inserisci la descrizione del corso"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Livello
                    </label>
                    <select
                      value={courseForm.level}
                      onChange={(e) => setCourseForm({...courseForm, level: e.target.value as 'beginner' | 'intermediate' | 'advanced'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="beginner">Principiante</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="advanced">Avanzato</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stato
                    </label>
                    <select
                      value={courseForm.status}
                      onChange={(e) => setCourseForm({...courseForm, status: e.target.value as 'draft' | 'published' | 'archived'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="draft">Bozza</option>
                      <option value="published">Pubblicato</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Istruttore
                  </label>
                  <input
                    type="text"
                    value={courseForm.instructor}
                    onChange={(e) => setCourseForm({...courseForm, instructor: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome dell'istruttore"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Categoria del corso"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={courseForm.is_free}
                        onChange={(e) => setCourseForm({...courseForm, is_free: e.target.checked, price: e.target.checked ? 0 : courseForm.price})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Corso gratuito</span>
                    </label>
                  </div>

                  {!courseForm.is_free && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prezzo (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({...courseForm, price: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={courseTagInput}
                      onChange={(e) => setCourseTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCourseTag())}
                      className="flex-1 px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={addCourseTag}
                      className="px-3 py-3 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {courseForm.tags?.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeCourseTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddCourse(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateCourse}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Corso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Corso */}
        {showEditCourse && editingCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Corso</h3>
                <button
                  onClick={() => setShowEditCourse(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titolo
                  </label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Inserisci il titolo del corso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Inserisci la descrizione del corso"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Livello
                    </label>
                    <select
                      value={courseForm.level}
                      onChange={(e) => setCourseForm({...courseForm, level: e.target.value as 'beginner' | 'intermediate' | 'advanced'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="beginner">Principiante</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="advanced">Avanzato</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stato
                    </label>
                    <select
                      value={courseForm.status}
                      onChange={(e) => setCourseForm({...courseForm, status: e.target.value as 'draft' | 'published' | 'archived'})}
                      className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="draft">Bozza</option>
                      <option value="published">Pubblicato</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Istruttore
                  </label>
                  <input
                    type="text"
                    value={courseForm.instructor}
                    onChange={(e) => setCourseForm({...courseForm, instructor: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome dell'istruttore"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                    className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Categoria del corso"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={courseForm.is_free}
                        onChange={(e) => setCourseForm({...courseForm, is_free: e.target.checked, price: e.target.checked ? 0 : courseForm.price})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Corso gratuito</span>
                    </label>
                  </div>

                  {!courseForm.is_free && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prezzo (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({...courseForm, price: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={courseTagInput}
                      onChange={(e) => setCourseTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCourseTag())}
                      className="flex-1 px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={addCourseTag}
                      className="px-3 py-3 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {courseForm.tags?.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeCourseTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditCourse(false)}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateCourse}
                  className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Conferma Eliminazione Corso */}
        {courseDeleteConfirm.show && courseDeleteConfirm.course && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Conferma Eliminazione</h3>
                <button
                  onClick={() => setCourseDeleteConfirm({ show: false, course: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Sei sicuro di voler eliminare il corso <strong>"{courseDeleteConfirm.course.title}"</strong>?
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Questa azione eliminerà anche tutti i moduli, quiz e iscrizioni associate. L'azione non può essere annullata.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCourseDeleteConfirm({ show: false, course: null })}
                  className="px-4 py-3 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDeleteCourse}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Elimina Corso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi/Modifica Modulo */}
        {(showAddModule || showEditModule) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto mx-2 sm:mx-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingModule ? 'Modifica Modulo' : 'Aggiungi Nuovo Modulo'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModule(false);
                      setShowEditModule(false);
                      setEditingModule(null);
                      setModuleForm({
                        course_id: '',
                        title: '',
                        description: '',
                        type: 'lesson',
                        content: '',
                        video_url: '',
                        document_url: '',
                        order_num: 1,
                        duration_minutes: 30,
                        is_required: true,
                        level: 'beginner'
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={editingModule ? handleUpdateModule : handleCreateModule} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Corso */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Corso *
                      </label>
                      <select
                        value={moduleForm.course_id}
                        onChange={(e) => setModuleForm({...moduleForm, course_id: e.target.value})}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleziona corso</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Titolo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Titolo Modulo *
                      </label>
                      <input
                        type="text"
                        value={moduleForm.title}
                        onChange={(e) => setModuleForm({...moduleForm, title: e.target.value})}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Es: Introduzione al Corso"
                      />
                    </div>
                  </div>

                  {/* Descrizione */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrizione
                    </label>
                    <textarea
                      value={moduleForm.description}
                      onChange={(e) => setModuleForm({...moduleForm, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Descrizione del modulo..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Tipo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo *
                      </label>
                      <select
                        value={moduleForm.type}
                        onChange={(e) => setModuleForm({...moduleForm, type: e.target.value})}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="lesson">Lezione</option>
                        <option value="video">Video</option>
                        <option value="document">Documento</option>
                        <option value="quiz">Quiz</option>
                      </select>
                    </div>

                    {/* Livello */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Livello *
                      </label>
                      <select
                        value={moduleForm.level}
                        onChange={(e) => setModuleForm({...moduleForm, level: e.target.value})}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzato</option>
                      </select>
                    </div>

                    {/* Ordine */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ordine
                      </label>
                      <input
                        type="number"
                        value={moduleForm.order_num}
                        onChange={(e) => setModuleForm({...moduleForm, order_num: parseInt(e.target.value) || 1})}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Durata */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durata (minuti)
                      </label>
                      <input
                        type="number"
                        value={moduleForm.duration_minutes}
                        onChange={(e) => setModuleForm({...moduleForm, duration_minutes: parseInt(e.target.value) || 0})}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Richiesto */}
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={moduleForm.is_required}
                          onChange={(e) => setModuleForm({...moduleForm, is_required: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Modulo richiesto</span>
                      </label>
                    </div>
                  </div>

                  {/* Contenuto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contenuto
                    </label>
                    <textarea
                      value={moduleForm.content}
                      onChange={(e) => setModuleForm({...moduleForm, content: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contenuto del modulo..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Video URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Video
                      </label>
                      <input
                        type="url"
                        value={moduleForm.video_url}
                        onChange={(e) => setModuleForm({...moduleForm, video_url: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* Document URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Documento
                      </label>
                      <input
                        type="url"
                        value={moduleForm.document_url}
                        onChange={(e) => setModuleForm({...moduleForm, document_url: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Pulsanti */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModule(false);
                        setShowEditModule(false);
                        setEditingModule(null);
                        setModuleForm({
                          course_id: '',
                          title: '',
                          description: '',
                          type: 'lesson',
                          content: '',
                          video_url: '',
                          document_url: '',
                          order_num: 1,
                          duration_minutes: 30,
                          is_required: true,
                          level: 'beginner'
                        });
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={!hasPermission('education.create') && !hasPermission('education.update')}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                        hasPermission('education.create') || hasPermission('education.update')
                          ? 'bg-blue-800 hover:bg-blue-900'
                          : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {editingModule ? 'Aggiorna Modulo' : 'Crea Modulo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Gestione Domande Quiz */}
        {selectedQuizForQuestions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Gestione Domande - {selectedQuizForQuestions.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedQuizForQuestions.courseName} • {selectedQuizForQuestions.moduleName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedQuizForQuestions(null);
                    setQuizQuestions([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Header con pulsante aggiungi domanda */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    Domande ({quizQuestions.length})
                  </h4>
                  <span className="text-sm text-gray-500">
                    Punteggio minimo: {selectedQuizForQuestions.passing_score}%
                  </span>
                </div>
                <button
                  onClick={() => setShowAddQuestion(true)}
                  disabled={!hasPermission('education.create')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    hasPermission('education.create')
                      ? 'bg-blue-800 text-white hover:bg-blue-900'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Aggiungi Domanda</span>
                </button>
              </div>

              {/* Lista domande */}
              <div className="space-y-4">
                {quizQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nessuna domanda presente in questo quiz</p>
                    <p className="text-sm">Aggiungi la prima domanda per iniziare</p>
                  </div>
                ) : (
                  quizQuestions.map((question, index) => (
                    <div key={question.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              Domanda {index + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              Ordine: {question.order_num}
                            </span>
                          </div>
                          <h5 className="font-medium text-gray-900 mb-3">
                            {question.question}
                          </h5>
                          
                          {/* Opzioni di risposta */}
                          <div className="space-y-3 mb-4">
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                                  optIndex === question.correct_answer
                                    ? 'bg-green-50 border-green-300 shadow-md ring-2 ring-green-200'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <span className={`text-sm font-bold w-8 h-8 text-center px-2 py-1 rounded-full flex items-center justify-center ${
                                  optIndex === question.correct_answer
                                    ? 'bg-green-200 text-green-800 ring-2 ring-green-300'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className={`text-sm flex-1 ${
                                  optIndex === question.correct_answer
                                    ? 'text-green-900 font-semibold'
                                    : 'text-gray-700'
                                }`}>
                                  {option}
                                </span>
                                {optIndex === question.correct_answer && (
                                  <div className="flex items-center space-x-2 text-green-600 flex-shrink-0">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="text-xs font-bold uppercase">Corretta</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Spiegazione */}
                          {question.explanation && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-sm text-blue-800">
                                <strong>Spiegazione:</strong> {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Azioni */}
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleEditQuestion(question)}
                            disabled={!hasPermission('education.edit')}
                            className={`p-2 rounded-lg transition-colors ${
                              hasPermission('education.edit')
                                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title={hasPermission('education.edit') ? 'Modifica' : 'Permesso negato'}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id, question.question)}
                            disabled={!hasPermission('education.delete')}
                            className={`p-2 rounded-lg transition-colors ${
                              hasPermission('education.delete')
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title={hasPermission('education.delete') ? 'Elimina' : 'Permesso negato'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Domanda */}
        {showAddQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuova Domanda</h3>
                <button
                  onClick={() => setShowAddQuestion(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateQuestion(); }}>
                <div className="space-y-4">
                  {/* Domanda */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Testo Domanda *
                    </label>
                    <textarea
                      value={questionForm.question}
                      onChange={(e) => setQuestionForm({...questionForm, question: e.target.value})}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Inserisci il testo della domanda..."
                    />
                  </div>

                  {/* Opzioni di risposta */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opzioni di Risposta * (minimo 2)
                    </label>
                    <div className="space-y-3">
                      {questionForm.options.map((option, index) => (
                        <div 
                          key={index} 
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                            questionForm.correct_answer === index
                              ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="correct_answer"
                            checked={questionForm.correct_answer === index}
                            onChange={() => setQuestionForm({...questionForm, correct_answer: index})}
                            className="h-5 w-5 text-green-600 focus:ring-green-500 focus:ring-2"
                          />
                          <span className={`text-sm font-bold w-8 h-8 text-center px-2 py-1 rounded-full flex items-center justify-center ${
                            questionForm.correct_answer === index
                              ? 'bg-green-200 text-green-800 ring-2 ring-green-300'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...questionForm.options];
                              newOptions[index] = e.target.value;
                              setQuestionForm({...questionForm, options: newOptions});
                            }}
                            className={`flex-1 px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm ${
                              questionForm.correct_answer === index
                                ? 'bg-green-50 text-green-900 font-semibold placeholder-green-400'
                                : 'bg-white text-gray-900 placeholder-gray-400'
                            }`}
                            placeholder={`Opzione ${String.fromCharCode(65 + index)}`}
                          />
                          {questionForm.correct_answer === index && (
                            <div className="flex items-center space-x-2 text-green-600 flex-shrink-0">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-xs font-bold uppercase">Corretta</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-blue-800 font-medium mb-1">
                            💡 Come selezionare la risposta corretta
                          </p>
                          <p className="text-sm text-blue-700">
                            Clicca sul radio button (○) accanto alla risposta che vuoi rendere corretta. 
                            La risposta selezionata sarà evidenziata in verde con l'icona ✓ e la scritta "Corretta".
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spiegazione */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spiegazione (opzionale)
                    </label>
                    <textarea
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({...questionForm, explanation: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Spiegazione della risposta corretta..."
                    />
                  </div>

                  {/* Ordine */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={questionForm.order_num}
                      onChange={(e) => setQuestionForm({...questionForm, order_num: parseInt(e.target.value) || 1})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestion(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={!hasPermission('education.create')}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                      hasPermission('education.create')
                        ? 'bg-blue-800 hover:bg-blue-900'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Crea Domanda
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Modifica Domanda */}
        {showEditQuestion && editingQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Domanda</h3>
                <button
                  onClick={() => setShowEditQuestion(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateQuestion(); }}>
                <div className="space-y-4">
                  {/* Domanda */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Testo Domanda *
                    </label>
                    <textarea
                      value={editingQuestion.question}
                      onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Inserisci il testo della domanda..."
                    />
                  </div>

                  {/* Opzioni di risposta */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opzioni di Risposta * (minimo 2)
                    </label>
                    <div className="space-y-3">
                      {editingQuestion.options.map((option, index) => (
                        <div 
                          key={index} 
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                            editingQuestion.correct_answer === index
                              ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="correct_answer_edit"
                            checked={editingQuestion.correct_answer === index}
                            onChange={() => setEditingQuestion({...editingQuestion, correct_answer: index})}
                            className="h-5 w-5 text-green-600 focus:ring-green-500 focus:ring-2"
                          />
                          <span className={`text-sm font-bold w-8 h-8 text-center px-2 py-1 rounded-full flex items-center justify-center ${
                            editingQuestion.correct_answer === index
                              ? 'bg-green-200 text-green-800 ring-2 ring-green-300'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...editingQuestion.options];
                              newOptions[index] = e.target.value;
                              setEditingQuestion({...editingQuestion, options: newOptions});
                            }}
                            className={`flex-1 px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm ${
                              editingQuestion.correct_answer === index
                                ? 'bg-green-50 text-green-900 font-semibold placeholder-green-400'
                                : 'bg-white text-gray-900 placeholder-gray-400'
                            }`}
                            placeholder={`Opzione ${String.fromCharCode(65 + index)}`}
                          />
                          {editingQuestion.correct_answer === index && (
                            <div className="flex items-center space-x-2 text-green-600 flex-shrink-0">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-xs font-bold uppercase">Corretta</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-blue-800 font-medium mb-1">
                            💡 Come selezionare la risposta corretta
                          </p>
                          <p className="text-sm text-blue-700">
                            Clicca sul radio button (○) accanto alla risposta che vuoi rendere corretta. 
                            La risposta selezionata sarà evidenziata in verde con l'icona ✓ e la scritta "Corretta".
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spiegazione */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spiegazione (opzionale)
                    </label>
                    <textarea
                      value={editingQuestion.explanation}
                      onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Spiegazione della risposta corretta..."
                    />
                  </div>

                  {/* Ordine */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={editingQuestion.order_num}
                      onChange={(e) => setEditingQuestion({...editingQuestion, order_num: parseInt(e.target.value) || 1})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowEditQuestion(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={!hasPermission('education.update')}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                      hasPermission('education.update')
                        ? 'bg-blue-800 hover:bg-blue-900'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Aggiorna Domanda
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Preview Quiz */}
        {showQuizPreview && previewQuiz && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {!previewShowResults ? (
                <>
                  {/* Header Preview */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Preview: {previewQuiz.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {previewQuiz.courseName} • {previewQuiz.moduleName}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>⏱️ {previewQuiz.time_limit} minuti</span>
                        <span>🎯 {previewQuiz.passing_score}% per superare</span>
                        <span>🔄 {previewQuiz.max_attempts} tentativi</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQuizPreview(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Domanda {previewCurrentQuestion + 1} di {previewQuiz.questions.length}
                      </span>
                      <span className="text-sm text-gray-500">
                        {Math.round(((previewCurrentQuestion + 1) / previewQuiz.questions.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${((previewCurrentQuestion + 1) / previewQuiz.questions.length) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Domanda Corrente */}
                  {previewQuiz.questions[previewCurrentQuestion] && (
                    <div className="mb-8">
                      <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          {previewQuiz.questions[previewCurrentQuestion].question}
                        </h4>
                        
                        <div className="space-y-3">
                          {previewQuiz.questions[previewCurrentQuestion].options.map((option: string, index: number) => (
                            <label
                              key={index}
                              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                previewAnswers[previewQuiz.questions[previewCurrentQuestion].id] === index
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question_${previewQuiz.questions[previewCurrentQuestion].id}`}
                                checked={previewAnswers[previewQuiz.questions[previewCurrentQuestion].id] === index}
                                onChange={() => handlePreviewAnswer(previewQuiz.questions[previewCurrentQuestion].id, index)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-4"
                              />
                              <span className={`text-sm font-medium mr-3 px-2 py-1 rounded-full ${
                                previewAnswers[previewQuiz.questions[previewCurrentQuestion].id] === index
                                  ? 'bg-blue-200 text-blue-800'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="text-gray-900">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigazione */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handlePreviewNavigation('prev')}
                      disabled={previewCurrentQuestion === 0}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        previewCurrentQuestion === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <span>← Precedente</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleResetPreview}
                        className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Reset
                      </button>
                    </div>

                    {previewCurrentQuestion < previewQuiz.questions.length - 1 ? (
                      <button
                        onClick={() => handlePreviewNavigation('next')}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span>Successiva →</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePreviewNavigation('finish')}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Termina Preview</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Risultati Preview */}
                  <div className="text-center">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Preview Completato!
                      </h3>
                      <p className="text-gray-600">
                        Ecco come avresti performato in questo quiz
                      </p>
                    </div>

                    {(() => {
                      const correctAnswers = previewQuiz.questions.filter((q: any) => 
                        previewAnswers[q.id] === q.correct_answer
                      ).length;
                      const totalQuestions = previewQuiz.questions.length;
                      const percentage = Math.round((correctAnswers / totalQuestions) * 100);
                      const passed = percentage >= previewQuiz.passing_score;

                      return (
                        <div className="mb-8">
                          <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 ${
                            passed ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <div className="text-center">
                              <div className={`text-3xl font-bold ${
                                passed ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {percentage}%
                              </div>
                              <div className={`text-sm ${
                                passed ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {correctAnswers}/{totalQuestions}
                              </div>
                            </div>
                          </div>

                          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                            passed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {passed ? (
                              <>
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-medium">Quiz Superato!</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5 w-5" />
                                <span className="font-medium">Quiz Non Superato</span>
                              </>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mt-4">
                            Punteggio minimo richiesto: {previewQuiz.passing_score}%
                          </p>
                        </div>
                      );
                    })()}

                    {/* Riepilogo Risposte */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Riepilogo Risposte
                      </h4>
                      <div className="space-y-4 text-left">
                        {previewQuiz.questions.map((question: any, index: number) => {
                          const userAnswer = previewAnswers[question.id];
                          const isCorrect = userAnswer === question.correct_answer;
                          
                          return (
                            <div key={question.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                              <div className="flex items-start space-x-3">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                  isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                  {isCorrect ? '✓' : '✗'}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 mb-2">
                                    {index + 1}. {question.question}
                                  </p>
                                  <div className="text-sm space-y-1">
                                    <p>
                                      <span className="text-gray-600">Tua risposta: </span>
                                      <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                        {userAnswer !== undefined 
                                          ? `${String.fromCharCode(65 + userAnswer)} - ${question.options[userAnswer]}`
                                          : 'Non risposto'
                                        }
                                      </span>
                                    </p>
                                    {!isCorrect && (
                                      <p>
                                        <span className="text-gray-600">Risposta corretta: </span>
                                        <span className="text-green-600">
                                          {String.fromCharCode(65 + question.correct_answer)} - {question.options[question.correct_answer]}
                                        </span>
                                      </p>
                                    )}
                                    {question.explanation && (
                                      <p className="text-blue-600 italic">
                                        💡 {question.explanation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Azioni Finali */}
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={handleResetPreview}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Riprova Preview
                      </button>
                      <button
                        onClick={() => setShowQuizPreview(false)}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Chiudi
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}