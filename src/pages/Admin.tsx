import React, { useState, useEffect } from 'react';
import { getNormativesCount, getUsersCount, getUsers, getNormatives, updateNormative, deleteNormative, type Normative } from '../lib/api';
import NormativeEditor from '../components/NormativeEditor';
import { 
  Users, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye,
  Settings,
  BarChart3
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalNormatives: number;
  totalViews: number;
  newUsersThisMonth: number;
}

export default function Admin() {
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
  const [editingNormative, setEditingNormative] = useState<Normative | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

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

  async function handleEditNormative(normative: Normative) {
    console.log('Editing normative:', normative.title);
    setEditingNormative(normative);
    setShowEditor(true);
  }

  async function handleSaveNormative(id: string, data: Partial<Normative>) {
    console.log('Saving normative:', id, data);
    try {
      const updated = await updateNormative(id, data);
      if (updated) {
        console.log('Normative updated successfully:', updated);
        // Aggiorna la lista locale
        setNormatives(prev => prev.map(n => n.id === id ? updated : n));
        setShowEditor(false);
        setEditingNormative(null);
      } else {
        console.error('Failed to update normative');
        alert('Errore durante il salvataggio della normativa');
      }
    } catch (error) {
      console.error('Error updating normative:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }
  }

  async function handleDeleteNormative(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questa normativa?')) return;
    
    console.log('Deleting normative:', id);
    try {
      const success = await deleteNormative(id);
      if (success) {
        console.log('Normative deleted successfully');
        setNormatives(prev => prev.filter(n => n.id !== id));
      } else {
        console.error('Failed to delete normative');
        alert('Errore durante l\'eliminazione della normativa');
      }
    } catch (error) {
      console.error('Error deleting normative:', error);
      alert('Errore durante l\'eliminazione: ' + error.message);
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
                          <td className="py-3 px-4">{user.full_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role === 'admin' ? 'Admin' : 'Utente'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString('it-IT')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
                </div>

                <div className="space-y-4">
                  {normatives.map((normative) => (
                    <div
                      key={normative.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {normative.content.substring(0, 150)}...
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        <button 
                          onClick={() => window.open(`/normative/${normative.id}`, '_blank')}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-lg border border-gray-200 hover:border-blue-300"
                          title="Visualizza"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditNormative(normative)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors bg-white rounded-lg border border-gray-200 hover:border-green-300"
                          title="Modifica"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteNormative(normative.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-lg border border-gray-200 hover:border-red-300"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {normatives.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">Nessuna normativa trovata</p>
                      <p className="text-sm">Le normative appariranno qui una volta caricate dal database</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <NormativeEditor
          normative={editingNormative}
          onSave={handleSaveNormative}
          onClose={() => {
            setShowEditor(false);
            setEditingNormative(null);
          }}
        />
      )}
    </div>
  );
}