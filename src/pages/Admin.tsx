import React, { useState, useEffect } from 'react';
import { getNormativesCount, getUsersCount, getUsers, getNormatives, updateUser, deleteUser, createNewUser, updateUserPassword } from '../lib/api';
import { 
  inspectDatabase, 
  checkRoleMigrationCompatibility, 
  validateDatabaseStructure, 
  createUsersBackup, 
  listBackups,
  measurePerformance 
} from '../lib/devTools';
import { 
  Users, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye,
  Settings,
  BarChart3,
  X,
  Save,
  Key,
  CheckCircle,
  AlertCircle,
  Info,
  Database,
  Search,
  Shield,
  Archive,
  Play,
  Terminal
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalNormatives: number;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'normatives' | 'services'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalNormatives: 0,
    totalViews: 0,
    newUsersThisMonth: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [normatives, setNormatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNormative, setShowAddNormative] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'user' as 'user' | 'admin'
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

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

  async function fetchAdminData() {
    try {
      // Fetch admin data
      const [totalUsers, totalNormatives, usersData, normativesData] = await Promise.all([
        getUsersCount(),
        getNormativesCount(),
        getUsers(),
        getNormatives()
      ]);

      setStats({
        totalUsers,
        totalNormatives,
        totalViews: 1247, // Mock data
        newUsersThisMonth: 23 // Mock data
      });

      setUsers(usersData);
      setNormatives(normativesData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
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
      title: 'Visualizzazioni Totali',
      value: stats.totalViews,
      icon: Eye,
      color: 'bg-purple-500',
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
    <div className="container mx-auto px-4 py-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Panoramica', icon: Settings },
                { id: 'users', label: 'Utenti', icon: Users },
                { id: 'normatives', label: 'Normative', icon: FileText },
                { id: 'services', label: 'Servizi', icon: Terminal }
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
                    className="flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Utente</span>
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Nome</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Ruolo</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Registrato</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            {editingUser?.id === user.id ? (
                              <input
                                type="text"
                                value={editingUser.full_name}
                                onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            ) : (
                              user.full_name
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {editingUser?.id === user.id ? (
                              <input
                                type="email"
                                value={editingUser.email}
                                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              user.email
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {editingUser?.id === user.id ? (
                              <select
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'user' | 'admin'})}
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="user">Utente</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Utente'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString('it-IT')}
                          </td>
                          <td className="py-3 px-4">
                            {editingUser?.id === user.id ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={handleUpdateUser}
                                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                  title="Salva"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Annulla"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingUser({...user})}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Modifica"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setShowPasswordModal(user)}
                                  className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                                  title="Cambia Password"
                                >
                                  <Key className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Elimina"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    className="flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Normativa</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {normatives.map((normative) => (
                    <div
                      key={normative.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {normative.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            normative.type === 'law' ? 'bg-blue-100 text-blue-800' :
                            normative.type === 'regulation' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {normative.type === 'law' ? 'Legge' :
                             normative.type === 'regulation' ? 'Regolamento' : 'Sentenza'}
                          </span>
                          <span>{normative.reference_number}</span>
                          <span>{new Date(normative.publication_date).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Strumenti di Controllo Database
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Database className="h-4 w-4" />
                    <span>Servizi di Sviluppo</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Ispezione Database */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Search className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Ispezione Database</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Analizza la struttura completa del database, tabelle, colonne e constraint.
                    </p>
                    <button
                      onClick={async () => {
                        addNotification('info', 'Avvio Ispezione', 'Controllo struttura database in corso...');
                        try {
                          await measurePerformance('Ispezione Database', inspectDatabase);
                          addNotification('success', 'Ispezione Completata', 'Controlla la console per i risultati dettagliati');
                        } catch (error) {
                          addNotification('error', 'Errore Ispezione', 'Impossibile completare l\'ispezione del database');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span>Avvia Ispezione</span>
                    </button>
                  </div>

                  {/* Verifica Migrazione Ruoli */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Verifica Migrazione</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Controlla la compatibilità per l'implementazione del nuovo sistema di ruoli.
                    </p>
                    <button
                      onClick={async () => {
                        addNotification('info', 'Verifica Migrazione', 'Controllo compatibilità ruoli in corso...');
                        try {
                          const result = await measurePerformance('Verifica Migrazione', checkRoleMigrationCompatibility);
                          if (result) {
                            addNotification('success', 'Verifica Completata', 'Sistema pronto per migrazione ruoli');
                          }
                        } catch (error) {
                          addNotification('error', 'Errore Verifica', 'Impossibile verificare compatibilità migrazione');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span>Verifica Sistema</span>
                    </button>
                  </div>

                  {/* Validazione Database */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Validazione Struttura</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Verifica l'integrità e la correttezza della struttura del database.
                    </p>
                    <button
                      onClick={async () => {
                        addNotification('info', 'Validazione', 'Controllo integrità database in corso...');
                        try {
                          await measurePerformance('Validazione Database', validateDatabaseStructure);
                          addNotification('success', 'Validazione Completata', 'Database strutturalmente corretto');
                        } catch (error) {
                          addNotification('error', 'Errore Validazione', 'Problemi rilevati nella struttura database');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span>Valida Struttura</span>
                    </button>
                  </div>

                  {/* Backup Utenti */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Archive className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Backup Utenti</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Crea un backup di sicurezza della tabella utenti prima delle modifiche.
                    </p>
                    <button
                      onClick={async () => {
                        addNotification('info', 'Backup', 'Creazione backup tabella utenti...');
                        try {
                          const backupName = await measurePerformance('Backup Utenti', createUsersBackup);
                          addNotification('success', 'Backup Creato', `Backup salvato: ${backupName}`);
                        } catch (error) {
                          addNotification('error', 'Errore Backup', 'Impossibile creare backup utenti');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                      <span>Crea Backup</span>
                    </button>
                  </div>

                  {/* Lista Backup */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-gray-500 rounded-lg">
                        <Database className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Lista Backup</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Visualizza tutti i backup esistenti della tabella utenti.
                    </p>
                    <button
                      onClick={async () => {
                        addNotification('info', 'Lista Backup', 'Recupero lista backup...');
                        try {
                          const backups = await measurePerformance('Lista Backup', listBackups);
                          addNotification('success', 'Lista Aggiornata', `Trovati ${backups.length} backup`);
                        } catch (error) {
                          addNotification('error', 'Errore Lista', 'Impossibile recuperare lista backup');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Database className="h-4 w-4" />
                      <span>Mostra Lista</span>
                    </button>
                  </div>

                  {/* Strumento Completo */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-indigo-500 rounded-lg">
                        <Terminal className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Controllo Completo</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Esegue tutti i controlli: ispezione, validazione e verifica migrazione.
                    </p>
                    <button
                      onClick={async () => {
                        addNotification('info', 'Controllo Completo', 'Esecuzione di tutti i controlli...');
                        try {
                          await measurePerformance('Ispezione Completa', async () => {
                            await inspectDatabase();
                            await validateDatabaseStructure();
                            await checkRoleMigrationCompatibility();
                          });
                          addNotification('success', 'Controllo Completato', 'Tutti i controlli eseguiti con successo');
                        } catch (error) {
                          addNotification('error', 'Errore Controllo', 'Errore durante l\'esecuzione dei controlli');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Terminal className="h-4 w-4" />
                      <span>Controllo Completo</span>
                    </button>
                  </div>
                </div>

                {/* Informazioni Aggiuntive */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Informazioni sui Servizi</h4>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p>• <strong>Ispezione Database:</strong> Mostra struttura tabelle, colonne, constraint e dati esistenti</p>
                        <p>• <strong>Verifica Migrazione:</strong> Controlla compatibilità per implementazione nuovi ruoli</p>
                        <p>• <strong>Validazione:</strong> Verifica integrità e correttezza struttura database</p>
                        <p>• <strong>Backup:</strong> Crea copie di sicurezza prima di modifiche importanti</p>
                        <p>• <strong>Performance:</strong> Tutti gli strumenti misurano i tempi di esecuzione</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@esempio.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome e Cognome"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value as 'user' | 'admin'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">Utente</option>
                    <option value="admin">Amministratore</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Utente
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdatePassword}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Aggiorna Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}