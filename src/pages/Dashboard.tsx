import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNormativesCount, getRecentNormativesCount, getNormatives, getUsersCount } from '../lib/api';
import { getAllDocuments, getDocumentsCount, getUserPermissions, getUserSections, getUserById } from '../lib/neonDatabase';
import { downloadGoogleDriveFile, isGoogleDriveUrl } from '../lib/driveDownload';
import { FileText, GraduationCap, TrendingUp, Clock, BookOpen, BadgeAlert as Alert, ChevronRight, Users, Database, X, Info, Download, Edit3, User, Save, ExternalLink } from 'lucide-react';

interface DashboardStats {
  totalNormatives: number;
  recentNormatives: number;
  totalUsers: number;
  totalDocuments: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalNormatives: 0,
    recentNormatives: 0,
    totalUsers: 0,
    totalDocuments: 0
  });
  const [recentNormatives, setRecentNormatives] = useState<any[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userSections, setUserSections] = useState<string[]>([]);
  const [uploaderName, setUploaderName] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
    if (profile?.role) {
      loadUserPermissions();
      loadUserSections();
    }
  }, [profile?.role]);

  useEffect(() => {
    if (selectedDocument?.uploaded_by) {
      getUserName(selectedDocument.uploaded_by).then((name: string) => {
        setUploaderName(name);
      });
    }
  }, [selectedDocument]);

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

  async function getUserName(userId: string): Promise<string> {
    try {
      const user = await getUserById(userId);
      if (user) {
        return user.full_name;
      }
      return 'Utente Sconosciuto';
    } catch (error) {
      console.error('Errore recupero nome utente:', error);
      return 'Utente Sconosciuto';
    }
  }

  async function handleDownloadDocument(doc: any) {
    try {
      if (!canView) {
        console.error('❌ Permessi insufficienti per scaricare il documento');
        return;
      }

      console.log('🔄 Inizio download documento:', doc.filename);
      const { generatePDF } = await import('../lib/pdfGenerator');
      const blob = generatePDF(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('✅ Download PDF completato con successo');

    } catch (error) {
      console.error('❌ Errore durante il download PDF:', error);
      alert('Errore durante il download PDF. Riprova più tardi.');
    }
  }

  async function handleDownloadOriginalFile(doc: any) {
    try {
      if (!canView) {
        console.error('❌ Permessi insufficienti per scaricare il file');
        return;
      }

      if (!doc.file_path) {
        alert('Nessun file originale disponibile per questo documento.');
        return;
      }

      console.log('🔄 Inizio download file originale:', doc.filename);
      
      // Se è un URL di Google Drive, usa la funzione specifica
      if (isGoogleDriveUrl(doc.file_path)) {
        await downloadGoogleDriveFile(doc.file_path, doc.filename || doc.title);
      } else {
        // Per altri tipi di URL, usa il metodo standard
        const link = document.createElement('a');
        link.href = doc.file_path;
        link.download = doc.filename || doc.title;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      console.log('✅ Download file originale completato con successo');

    } catch (error) {
      console.error('❌ Errore durante il download del file originale:', error);
      alert(`Errore durante il download: ${error.message || 'Riprova più tardi.'}`);
    }
  }

  function handleDocumentClick(doc: any) {
    setSelectedDocument(doc);
    setShowPreviewModal(true);
  }

  async function fetchDashboardData() {
    try {
      // Fetch real data from database
      const totalNormatives = await getNormativesCount();
      const recentNormatives = await getRecentNormativesCount(30);
      const latestNormatives = await getNormatives();
      const totalUsers = await getUsersCount();
      const totalDocuments = await getDocumentsCount();
      const latestDocuments = await getAllDocuments();

      setStats({
        totalNormatives,
        recentNormatives,
        totalUsers,
        totalDocuments
      });

      setRecentNormatives(latestNormatives.slice(0, 3));
      setRecentDocuments(latestDocuments.slice(0, 3));
      
      // Combina attività recenti da normative e documenti
      const combinedActivity = [
        ...latestNormatives.slice(0, 2).map(n => ({
          id: n.id,
          title: n.title,
          type: 'normative',
          date: n.created_at,
          description: `Nuova ${n.type === 'law' ? 'legge' : n.type === 'regulation' ? 'regolamento' : 'sentenza'} pubblicata`
        })),
        ...latestDocuments.slice(0, 2).map(d => ({
          id: d.id,
          title: d.title,
          type: 'document',
          date: d.created_at,
          description: `Nuovo ${d.type === 'template' ? 'template' : d.type === 'form' ? 'modulo' : d.type === 'guide' ? 'guida' : 'report'} caricato`
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
      
      setRecentActivity(combinedActivity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Controllo permessi e visibilità
  const canView = userPermissions.includes('documents.view');
  const canEdit = userPermissions.includes('documents.edit');
  const sectionVisible = userSections.includes('documents');

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'template': return 'Template';
      case 'form': return 'Modulo';
      case 'guide': return 'Guida';
      case 'report': return 'Report';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'template': return 'bg-blue-100 text-blue-800';
      case 'form': return 'bg-green-100 text-green-800';
      case 'guide': return 'bg-purple-100 text-purple-800';
      case 'report': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statCards = [
    {
      title: 'Normative Totali',
      value: stats.totalNormatives,
      icon: FileText,
      color: 'bg-blue-500',
      change: stats.recentNormatives > 0 ? `+${stats.recentNormatives} recenti` : 'Nessun aggiornamento'
    },
    {
      title: 'Utenti Registrati',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-green-500',
      change: 'Profili attivi'
    },
    {
      title: 'Documenti Disponibili',
      value: stats.totalDocuments,
      icon: Database,
      color: 'bg-purple-500',
      change: 'Template e guide'
    },
    {
      title: 'Ultimo Accesso',
      value: 'Oggi',
      icon: Clock,
      color: 'bg-orange-500',
      change: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    }
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
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Benvenuto, {profile?.full_name}
          </h1>
          <p className="text-gray-600">
            Panoramica delle tue attività e aggiornamenti recenti
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm text-green-600 font-medium">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Azioni Rapide
            </h2>
            <div className="space-y-3">
              <Link
                to="/normative"
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Consulta Normative</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </Link>
              
              <Link
                to="/education"
                className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Inizia Formazione</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </Link>
              
              <Link
                to="/docx"
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">Gestisci Documenti</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Attività Recente
            </h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                          {activity.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.type === 'normative' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {activity.type === 'normative' ? 'Normativa' : 'Documento'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.date).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Alert className="h-8 w-8 mx-auto mb-3" />
                <p>Nessuna attività recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Documents Section */}
        {recentDocuments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Documenti Recenti
              </h2>
              <Link
                to="/docx"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                Vedi tutti →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleDocumentClick(doc)}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Database className="h-4 w-4 text-gray-400" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(doc.type)}`}>
                      {getTypeLabel(doc.type)}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {doc.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Statistiche Sistema
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Utilizzo Database
                </span>
                <span className="text-sm text-gray-500">
                  {stats.totalNormatives + stats.totalDocuments} elementi
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{
                  width: `${Math.min((stats.totalNormatives + stats.totalDocuments) / 100 * 100, 100)}%`
                }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Utenti Attivi
                </span>
                <span className="text-sm text-gray-500">
                  {stats.totalUsers} registrati
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{
                  width: `${Math.min(stats.totalUsers / 50 * 100, 100)}%`
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Anteprima Documento
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedDocument.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedDocument(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              <div className="space-y-6">
                {/* Document Header */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                      <div className="p-4 bg-blue-100 rounded-xl">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          {selectedDocument.title}
                        </h2>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(selectedDocument.type)}`}>
                            {getTypeLabel(selectedDocument.type)}
                          </span>
                          <span className="text-sm text-gray-600">
                            Categoria: {selectedDocument.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canView && (
                        <>
                          <button
                            onClick={() => handleDownloadDocument(selectedDocument)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Scarica PDF generato"
                          >
                            <Download className="h-4 w-4" />
                            <span>PDF</span>
                          </button>
                          {selectedDocument.file_path && (
                            <button
                              onClick={() => handleDownloadOriginalFile(selectedDocument)}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              title="Scarica file originale"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>File</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Info className="h-5 w-5 text-blue-600 mr-2" />
                      Dettagli Documento
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nome file:</span>
                        <span className="font-medium text-gray-900">{selectedDocument.filename || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensione:</span>
                        <span className="font-medium text-gray-900">
                          {selectedDocument.file_size ? `${selectedDocument.file_size} KB` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo MIME:</span>
                        <span className="font-medium text-gray-900">{selectedDocument.mime_type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Versione:</span>
                        <span className="font-medium text-gray-900">{selectedDocument.version || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stato:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedDocument.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedDocument.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedDocument.status === 'active' ? 'Attivo' :
                           selectedDocument.status === 'draft' ? 'Bozza' :
                           selectedDocument.status === 'archived' ? 'Archiviato' : selectedDocument.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Upload</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Caricato da:</span>
                        <span className="font-medium text-gray-900">{uploaderName || 'Caricamento...'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Data upload:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(selectedDocument.created_at).toLocaleDateString('it-IT', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ultima modifica:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(selectedDocument.updated_at).toLocaleDateString('it-IT', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Download:</span>
                        <span className="font-medium text-gray-900">{selectedDocument.download_count || 0}</span>
                      </div>
                      {selectedDocument.file_path && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">File originale:</span>
                          <span className="font-medium text-gray-900 text-xs">
                            {isGoogleDriveUrl(selectedDocument.file_path) ? '📁 Google Drive' : '🔗 Link esterno'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedDocument.description && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Descrizione</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedDocument.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Tag</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}