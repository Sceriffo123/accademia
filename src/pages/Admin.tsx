import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getNormativesCount, getUsersCount, getUsers, getNormatives, updateUser, deleteUser, createNewUser, updateUserPassword } from '../lib/api';
import { createNormative, updateNormative, deleteNormative } from '../lib/neonDatabase';
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
  Info
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
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'normatives'>('overview');
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
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'superadmin' | 'operator'
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Handler per creazione normativa
  async function handleCreateNormative() {
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
        publication_date: editingNormative.publication_date instanceof Date 
          ? editingNormative.publication_date.toISOString().split('T')[0]
          : editingNormative.publication_date,
        effective_date: editingNormative.effective_date instanceof Date 
          ? editingNormative.effective_date.toISOString().split('T')[0]
          : editingNormative.effective_date,
        tags: editingNormative.tags
      });

      console.log('✅ updateNormative completato');

      setEditingNormative(null);
      setShowEditNormative(false);
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Normativa Aggiornata', `La normativa "${editingNormative.title}" è stata modificata`);
    } catch (error) {
      console.error('🚨 Errore in handleUpdateNormative:', error);
      console.error('🚨 Dettagli errore:', error?.message);
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare la normativa');
    }
  }

  // Handler per eliminazione normativa
  async function handleDeleteNormative(normativeId: string, normativeTitle: string) {
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
    setEditingNormative({...normative});
    setShowEditNormative(true);
  }

  // Handler per gestire i tag
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
        getUsers(profile?.role !== 'superadmin', profile?.id), // Escludi SuperAdmin solo se non sei SuperAdmin
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
                { id: 'normatives', label: 'Normative', icon: FileText }
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
                                onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'user' | 'admin' | 'superadmin' | 'operator'})}
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="user">Utente</option>
                                <option value="operator">Operatore</option>
                                <option value="admin">Admin</option>
                                {profile?.role === 'superadmin' && (
                                  <option value="superadmin">SuperAdmin</option>
                                )}
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                                user.role === 'operator' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'superadmin' ? 'SuperAdmin' :
                                 user.role === 'admin' ? 'Admin' : 
                                 user.role === 'operator' ? 'Operatore' : 'Utente'}
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
                        <button 
                          onClick={() => console.log('View normative:', normative.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Visualizza"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditNormative(normative)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Modifica"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteNormative(normative.id, normative.title)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                    onChange={(e) => setUserForm({...userForm, role: e.target.value as 'user' | 'admin' | 'superadmin' | 'operator'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Titolo della normativa"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero di Riferimento *</label>
                  <input
                    type="text"
                    value={normativeForm.reference_number}
                    onChange={(e) => setNormativeForm({...normativeForm, reference_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es: D.Lgs. 285/1992"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={normativeForm.type}
                      onChange={(e) => setNormativeForm({...normativeForm, type: e.target.value as 'law' | 'regulation' | 'ruling'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es: Trasporto Pubblico"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pubblicazione *</label>
                    <input
                      type="date"
                      value={normativeForm.publication_date}
                      onChange={(e) => setNormativeForm({...normativeForm, publication_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Efficacia *</label>
                    <input
                      type="date"
                      value={normativeForm.effective_date}
                      onChange={(e) => setNormativeForm({...normativeForm, effective_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
                  <textarea
                    value={normativeForm.content}
                    onChange={(e) => setNormativeForm({...normativeForm, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateNormative}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero di Riferimento *</label>
                  <input
                    type="text"
                    value={editingNormative.reference_number}
                    onChange={(e) => setEditingNormative({...editingNormative, reference_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={editingNormative.type}
                      onChange={(e) => setEditingNormative({...editingNormative, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pubblicazione *</label>
                    <input
                      type="date"
                      value={editingNormative.publication_date}
                      onChange={(e) => setEditingNormative({...editingNormative, publication_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Efficacia *</label>
                    <input
                      type="date"
                      value={editingNormative.effective_date}
                      onChange={(e) => setEditingNormative({...editingNormative, effective_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
                  <textarea
                    value={editingNormative.content}
                    onChange={(e) => setEditingNormative({...editingNormative, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateNormative}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
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