import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUsers, 
  updateUser, 
  deleteUser, 
  createNewUser, 
  updateUserPassword,
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getUserPermissions,
  getUserSections
} from '../lib/api';
import { validateArubaCredentials, uploadFileToAruba } from '../lib/arubaUpload';
import FileUpload from '../components/FileUpload';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  FileText,
  Upload,
  TestTube,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
  Settings
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin' | 'superadmin' | 'operator';
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  description?: string;
  filename: string;
  file_url?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  type: 'template' | 'form' | 'guide' | 'report';
  category: string;
  tags?: string[];
  version?: string;
  status?: 'active' | 'draft' | 'archived';
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  download_count?: number;
}

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'documents' | 'test'>('test');
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userSections, setUserSections] = useState<string[]>([]);

  // Test FTP states
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testFile, setTestFile] = useState<File | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'superadmin' | 'operator'
  });

  useEffect(() => {
    if (profile?.role) {
      loadUserPermissions();
      loadUserSections();
      loadUsers();
      loadDocuments();
    }
  }, [profile?.role]);

  async function loadUserPermissions() {
    try {
      const permissions = await getUserPermissions(profile?.role || '');
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Errore caricamento permessi:', error);
      setUserPermissions([]);
    }
  }

  async function loadUserSections() {
    try {
      const sections = await getUserSections(profile?.role || '');
      setUserSections(sections);
    } catch (error) {
      console.error('Errore caricamento sezioni:', error);
      setUserSections([]);
    }
  }

  async function loadUsers() {
    try {
      const usersData = await getUsers(true, profile?.id);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments() {
    try {
      const docsData = await getAllDocuments();
      setDocuments(docsData as Document[]);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  // Test FTP Connection
  async function handleTestFTP() {
    setTestStatus('testing');
    setTestMessage('Verifica credenziali FTP Aruba...');

    try {
      const isValid = await validateArubaCredentials();
      
      if (isValid) {
        setTestStatus('success');
        setTestMessage('✅ Connessione FTP Aruba riuscita! Host: fluxdata.eu');
      } else {
        setTestStatus('error');
        setTestMessage('❌ Impossibile connettersi ad Aruba. Verifica credenziali.');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`❌ Errore test FTP: ${error}`);
    }
  }

  // Test File Upload
  async function handleTestUpload() {
    if (!testFile) {
      setTestMessage('❌ Seleziona prima un file di test');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Upload file di test su fluxdata.eu...');

    try {
      const result = await uploadFileToAruba(testFile, 'test', 'test');
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage(`✅ Upload riuscito! File disponibile su: ${result.fileUrl}`);
      } else {
        setTestStatus('error');
        setTestMessage(`❌ Upload fallito: ${result.error}`);
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`❌ Errore upload: ${error}`);
    }
  }

  async function handleCreateUser() {
    try {
      await createNewUser(newUser.email, newUser.fullName, newUser.password, newUser.role);
      setNewUser({ email: '', fullName: '', password: '', role: 'user' });
      setShowCreateUser(false);
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  }

  async function handleUpdateUser() {
    if (!editingUser) return;
    
    try {
      await updateUser(editingUser.id, {
        email: editingUser.email,
        full_name: editingUser.full_name,
        role: editingUser.role
      });
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (confirm('Sei sicuro di voler eliminare questo utente?')) {
      try {
        await deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  async function handleUpdateDocument() {
    if (!editingDocument) return;
    
    try {
      await updateDocument(editingDocument.id, editingDocument);
      setEditingDocument(null);
      loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (confirm('Sei sicuro di voler eliminare questo documento?')) {
      try {
        await deleteDocument(docId);
        loadDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  }

  function handleUploadComplete(newDocument: any) {
    setShowUploadModal(false);
    loadDocuments();
  }

  const canManageUsers = userPermissions.includes('users.manage');
  const canManageDocuments = userPermissions.includes('documents.manage');

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
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Pannello Amministrazione
          </h1>
          <p className="text-gray-600">
            Gestione utenti, documenti e test sistema Aruba
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('test')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'test'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>Test Aruba FTP</span>
              </div>
            </button>
            {canManageUsers && (
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Utenti ({users.length})</span>
                </div>
              </button>
            )}
            {canManageDocuments && (
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'documents'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Documenti ({documents.length})</span>
                </div>
              </button>
            )}
          </div>

          <div className="p-6">
            {/* TEST ARUBA FTP TAB */}
            {activeTab === 'test' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Configurazione Aruba FTP
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Host:</span>
                      <span className="ml-2 text-blue-700">fluxdata.eu</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Username:</span>
                      <span className="ml-2 text-blue-700">MSSql216075</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Cartella Upload:</span>
                      <span className="ml-2 text-blue-700">/documenti/</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">URL Pubblico:</span>
                      <span className="ml-2 text-blue-700">https://fluxdata.eu/documenti/</span>
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    1. Test Connessione FTP
                  </h4>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleTestFTP}
                      disabled={testStatus === 'testing'}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {testStatus === 'testing' ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <TestTube className="h-5 w-5" />
                      )}
                      <span>Testa Connessione</span>
                    </button>
                    
                    {testStatus !== 'idle' && (
                      <div className={`flex items-center space-x-2 ${
                        testStatus === 'success' ? 'text-green-600' :
                        testStatus === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {testStatus === 'testing' && <Loader className="h-5 w-5 animate-spin" />}
                        {testStatus === 'success' && <CheckCircle className="h-5 w-5" />}
                        {testStatus === 'error' && <AlertCircle className="h-5 w-5" />}
                        <span className="font-medium">{testMessage}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Test Upload */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    2. Test Upload File
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleziona file di test (PDF, DOC, TXT, IMG)
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setTestFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    {testFile && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">{testFile.name}</p>
                            <p className="text-sm text-gray-600">
                              {(testFile.size / 1024).toFixed(1)} KB • {testFile.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleTestUpload}
                        disabled={!testFile || testStatus === 'testing'}
                        className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testStatus === 'testing' ? (
                          <Loader className="h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                        <span>Test Upload su Aruba</span>
                      </button>
                    </div>
                    
                    {testMessage && testStatus !== 'idle' && (
                      <div className={`p-4 rounded-lg ${
                        testStatus === 'success' ? 'bg-green-50 border border-green-200' :
                        testStatus === 'error' ? 'bg-red-50 border border-red-200' :
                        'bg-blue-50 border border-blue-200'
                      }`}>
                        <p className={`text-sm ${
                          testStatus === 'success' ? 'text-green-700' :
                          testStatus === 'error' ? 'text-red-700' :
                          'text-blue-700'
                        }`}>
                          {testMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Upload Path */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-yellow-900 mb-3">
                    📁 Struttura Cartelle Upload
                  </h4>
                  <div className="space-y-2 text-sm text-yellow-800">
                    <p><strong>Cartella base:</strong> /documenti/</p>
                    <p><strong>Organizzazione:</strong> /documenti/2024/01-gennaio/categoria/file.pdf</p>
                    <p><strong>URL finale:</strong> https://fluxdata.eu/documenti/2024/01-gennaio/categoria/file.pdf</p>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && canManageUsers && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Gestione Utenti
                  </h3>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Nuovo Utente</span>
                  </button>
                </div>

                {/* Create User Modal */}
                {showCreateUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4">Crea Nuovo Utente</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          value={newUser.fullName}
                          onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
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
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo *</label>
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="user">Utente</option>
                          <option value="operator">Operatore</option>
                          <option value="admin">Admin</option>
                          {profile?.role === 'superadmin' && (
                            <option value="superadmin">SuperAdmin</option>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleCreateUser}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Crea Utente
                      </button>
                      <button
                        onClick={() => setShowCreateUser(false)}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}

                {/* Users List */}
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-6">
                      {editingUser?.id === user.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <input
                                type="email"
                                value={editingUser.email}
                                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                              <input
                                type="text"
                                value={editingUser.full_name}
                                onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                              <select
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="user">Utente</option>
                                <option value="operator">Operatore</option>
                                <option value="admin">Admin</option>
                                {profile?.role === 'superadmin' && (
                                  <option value="superadmin">SuperAdmin</option>
                                )}
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={handleUpdateUser}
                              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Save className="h-4 w-4" />
                              <span>Salva</span>
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <X className="h-4 w-4" />
                              <span>Annulla</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{user.full_name}</h4>
                            <p className="text-gray-600">{user.email}</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                              user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'operator' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'superadmin' ? 'SuperAdmin' :
                               user.role === 'admin' ? 'Admin' :
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
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'documents' && canManageDocuments && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Gestione Documenti
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Carica Documento</span>
                  </button>
                </div>

                {/* Documents List */}
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-6">
                      {editingDocument?.id === doc.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                              <input
                                type="text"
                                value={editingDocument.title}
                                onChange={(e) => setEditingDocument({...editingDocument, title: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                              <input
                                type="text"
                                value={editingDocument.category}
                                onChange={(e) => setEditingDocument({...editingDocument, category: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                            <textarea
                              value={editingDocument.description || ''}
                              onChange={(e) => setEditingDocument({...editingDocument, description: e.target.value})}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={handleUpdateDocument}
                              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Save className="h-4 w-4" />
                              <span>Salva</span>
                            </button>
                            <button
                              onClick={() => setEditingDocument(null)}
                              className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <X className="h-4 w-4" />
                              <span>Annulla</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                            <h4 className="font-semibold text-gray-900 mb-1">{doc.title}</h4>
                            <p className="text-gray-600 text-sm mb-2">{doc.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>File: {doc.filename}</span>
                              <span>Categoria: {doc.category}</span>
                              <span>Download: {doc.download_count || 0}</span>
                            </div>
                            {doc.file_url && (
                              <div className="mt-2">
                                <a 
                                  href={doc.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Scarica da Aruba</span>
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingDocument(doc)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
          category="amministrazione"
          type="template"
        />
      )}
    </div>
  );
}