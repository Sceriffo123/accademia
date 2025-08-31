import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllUsers, createUser, updateUser, deleteUser,
  getAllNormatives,
  getAllDocuments,
  getAllCourses, createCourse, updateCourse, deleteCourse, getCourseEnrollments,
  type User, type Course
} from '../lib/neonDatabase';
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
  X, 
  Eye, 
  EyeOff,
  Search,
  CheckCircle,
  Upload,
  BarChart3
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalNormatives: number;
  totalDocuments: number;
  completionRate: number;
}

type TabType = 'overview' | 'users' | 'normatives' | 'documents' | 'courses';

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
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
      
      setStats({
        totalUsers: usersData.length,
        totalNormatives: normativesData.length,
        totalDocuments: documentsData.length,
        completionRate: 85
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
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
                          onClick={() => setEditingCourse(course)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifica corso"
                        >
                          <Edit className="h-4 w-4" />
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
      </div>
    </div>
  );
}