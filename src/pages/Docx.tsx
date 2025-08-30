import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllDocuments, getUserPermissions, getUserSections, getUserById, updateDocument } from '../lib/neonDatabase';
import { downloadGoogleDriveFile, isGoogleDriveUrl } from '../lib/driveDownload';
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Upload, 
  Eye, 
  Edit3, 
  Calendar, 
  User, 
  ChevronRight, 
  Plus, 
  FolderOpen, 
  X, 
  Info,
  Save,
  ExternalLink,
  Tag
} from 'lucide-react';

// Interfaccia Document che corrisponde al database
interface Document {
  id: string;
  title: string;
  description?: string;
  filename: string;
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

export default function Docx() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [userNamesCache, setUserNamesCache] = useState<Map<string, string>>(new Map());
  const [userSections, setUserSections] = useState<string[]>([]);
  const [uploaderName, setUploaderName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (selectedDocument?.uploaded_by) {
      getUserName(selectedDocument.uploaded_by).then((name: string) => {
        setUploaderName(name);
      });
    }
  }, [selectedDocument]);

  useEffect(() => {
    if (profile?.role) {
      loadUserPermissions();
      loadUserSections();
      loadDocuments();
    }
  }, [profile?.role]);

  useEffect(() => {
    if (profile?.role) {
      loadUserPermissions();
      loadUserSections();
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

  async function loadDocuments() {
    try {
      console.log('🎓 DOCX: Inizio caricamento documenti...');
      setLoading(true);
      const docs = await getAllDocuments();
      console.log('🎓 DOCX: Documenti caricati dal database:', docs);
      console.log('🎓 DOCX: Numero documenti:', docs.length);
      // Cast per risolvere il problema dei tipi
      setDocuments(docs as unknown as Document[]);
      console.log('🎓 DOCX: Documenti salvati nello stato');
    } catch (error) {
      console.error('🚨 DOCX: Errore caricamento documenti:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
      console.log('🎓 DOCX: Caricamento completato');
    }
  }

  async function getUserName(userId: string): Promise<string> {
    try {
      // Controlla prima la cache
      if (userNamesCache.has(userId)) {
        return userNamesCache.get(userId)!;
      }

      // Se non in cache, recupera dal database
      const user = await getUserById(userId);
      if (user) {
        const fullName = user.full_name;
        // Salva in cache per future richieste
        setUserNamesCache((prev: Map<string, string>) => new Map(prev.set(userId, fullName)));
        return fullName;
      }

      return 'Utente Sconosciuto';
    } catch (error) {
      console.error('Errore recupero nome utente:', error);
      return 'Utente Sconosciuto';
    }
  }

  async function handleDownloadDocument(doc: Document) {
    try {
      // Verifica permessi prima del download
      if (!canView) {
        console.error('❌ Permessi insufficienti per scaricare il documento');
        return;
      }

      console.log('🔄 Inizio download documento:', doc.filename);

      // Valida che il documento abbia un ID valido
      if (!doc.id) {
        console.error('❌ ID documento non valido');
        return;
      }

      // Fetch del file come blob per gestire correttamente i file binari
      const response = await fetch(`/api/documents/download/${doc.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Converti la risposta in blob per preservare i dati binari
      
      console.log('✅ Download PDF completato con successo');

    } catch (error) {
      console.error('❌ Errore durante il download PDF:', error);
      alert('Errore durante il download PDF. Riprova più tardi.');
    }
  }

  async function handleDownloadOriginalFile(doc: Document) {
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

  // Handler per aprire modal di modifica documento (come in Admin)
  function handleEditDocument(document: Document) {
    console.log('🔧 Avvio modalità modifica per documento:', document.title);
    setEditingDocument(document);
    setIsEditMode(true);
  }

  // Handler per salvare modifiche documento (come in Admin)
  async function handleSaveEdit() {
    if (!editingDocument) {
      console.error('❌ Nessun documento da modificare');
      return;
    }
    
    try {
      console.log('💾 Salvataggio modifiche documento:', editingDocument.title);
      await updateDocument(editingDocument.id, editingDocument);
      loadDocuments();
      setIsEditMode(false);
      setEditingDocument(null);

    } catch (error) {
      console.error('❌ Errore salvataggio modifiche:', error);
      // TODO: Mostrare notifica errore all'utente
    }
  }

  // Handler per annullare modifiche
  function handleCancelEdit() {
    setIsEditMode(false);
    setEditingDocument(null);
  }

  // Controllo permessi e visibilità
  const canView = userPermissions.includes('documents.view');
  const canCreate = userPermissions.includes('documents.create');
  const canEdit = userPermissions.includes('documents.edit');
  const canUpload = userPermissions.includes('documents.upload');
  const sectionVisible = userSections.includes('documents');

  // Controllo visibilità sezione
  if (!sectionVisible) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sezione Non Disponibile
          </h1>
          <p className="text-gray-600">
            La sezione Documenti non è abilitata per il tuo ruolo attuale.
          </p>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Accesso Negato
          </h1>
          <p className="text-gray-600">
            Non hai i permessi necessari per accedere a questa sezione.
          </p>
        </div>
      </div>
    );
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = [...new Set(documents.map(d => d.category))];

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

  const stats = [
    { label: 'Documenti Totali', value: documents.length.toString(), icon: FileText, color: 'bg-blue-500' },
    { label: 'Download Totali', value: documents.reduce((sum, doc) => sum + (doc.download_count || 0), 0).toString(), icon: Download, color: 'bg-green-500' },
    { label: 'Template Disponibili', value: documents.filter(d => d.type === 'template').length.toString(), icon: FolderOpen, color: 'bg-purple-500' },
    { label: 'Guide Operative', value: documents.filter(d => d.type === 'guide').length.toString(), icon: Eye, color: 'bg-orange-500' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Documenti e Modulistica
          </h1>
          <p className="text-gray-600">
            Template, moduli, guide e documentazione per il trasporto pubblico locale
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
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
                  {stat.label}
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Cerca documenti, template o guide..."
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-800 transition-colors"
            >
              <Filter className="h-5 w-5" />
              <span>Filtri avanzati</span>
            </button>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo Documento
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tutti i tipi</option>
                    <option value="template">Template</option>
                    <option value="form">Moduli</option>
                    <option value="guide">Guide</option>
                    <option value="report">Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tutte le categorie</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button 
                    disabled={!canUpload}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      canUpload 
                        ? 'bg-blue-800 text-white hover:bg-blue-900' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span>Carica Documento</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Documenti ({filteredDocuments.length})
            </h2>
            <button 
              disabled={!canCreate}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                canCreate 
                  ? 'border border-gray-300 text-gray-600 hover:bg-gray-50' 
                  : 'border border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Nuovo Documento</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento documenti...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100 group cursor-pointer"
                  onClick={() => {
                    setSelectedDocument(doc);
                    setShowPreviewModal(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(doc.type)}`}>
                      {getTypeLabel(doc.type)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-800 transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                    {doc.description}
                  </p>
                  
                  <div className="space-y-2 text-xs text-gray-500 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{doc.uploaded_by || 'Sistema'}</span>
                      </div>
                      <span>{doc.file_size ? `${doc.file_size} KB` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(doc.created_at).toLocaleDateString('it-IT')}</span>
                      </div>
                      <span>{doc.download_count || 0} download</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <button 
                        disabled={!canView}
                        className={`p-2 transition-colors ${
                          canView ? 'text-gray-400 hover:text-blue-600' : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        disabled={!canView}
                        className={`p-2 transition-colors ${
                          canView ? 'text-gray-400 hover:text-green-600' : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditDocument(doc)}
                        disabled={!canEdit}
                        title={canEdit ? "Modifica documento" : "Non hai i permessi per modificare"}
                        className={`p-2 transition-colors ${
                          canEdit ? 'text-gray-400 hover:text-orange-600' : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Nessun documento trovato</p>
              <p className="text-sm">Prova a modificare i filtri di ricerca</p>
            </div>
          )}
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
                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            title="Scarica PDF"
                          >
                            <Download className="h-4 w-4" />
                            <span>PDF</span>
                          </button>
                          {selectedDocument.file_path && (
                            <button
                              onClick={() => handleDownloadOriginalFile(selectedDocument)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              title={isGoogleDriveUrl(selectedDocument.file_path) ? "Scarica da Google Drive" : "Scarica file originale"}
                            >
                              {isGoogleDriveUrl(selectedDocument.file_path) ? (
                                <svg className="h-4 w-4" viewBox="0 0 87.3 78" fill="none">
                                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                  <path d="m59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5l-7.65-13.25-5.15-8.9-.5-.85-13.75 23.8z" fill="#2684fc"/>
                                  <path d="m73.4 26.5-12.9-22.3c-1.4-.8-2.95-1.2-4.5-1.2h18.5c1.6 0 3.15.45 4.5 1.2z" fill="#ffba00"/>
                                </svg>
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                              <span>File</span>
                            </button>
                          )}
                        </>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleEditDocument(selectedDocument)}
                          className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Modifica</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal di modifica inline */}
                {isEditMode && editingDocument && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Edit3 className="h-5 w-5 text-orange-600 mr-2" />
                      Modifica Documento
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                        <input
                          type="text"
                          value={editingDocument.title}
                          onChange={(e) => setEditingDocument({...editingDocument, title: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                        <input
                          type="text"
                          value={editingDocument.category}
                          onChange={(e) => setEditingDocument({...editingDocument, category: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                      <textarea
                        value={editingDocument.description || ''}
                        onChange={(e) => setEditingDocument({...editingDocument, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                        <select
                          value={editingDocument.type}
                          onChange={(e) => setEditingDocument({...editingDocument, type: e.target.value as 'template' | 'form' | 'guide' | 'report'})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="template">Template</option>
                          <option value="form">Modulo</option>
                          <option value="guide">Guida</option>
                          <option value="report">Report</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                        <select
                          value={editingDocument.status}
                          onChange={(e) => setEditingDocument({...editingDocument, status: e.target.value as 'active' | 'draft' | 'archived'})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="active">Attivo</option>
                          <option value="draft">Bozza</option>
                          <option value="archived">Archiviato</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Salva Modifiche</span>
                      </button>
                    </div>
                  </div>
                )}

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
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 text-green-600 mr-2" />
                      Informazioni Upload
                    </h4>
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
                    </div>
                  </div>
                </div>

                {/* Document Content Preview */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Eye className="h-5 w-5 text-purple-600 mr-2" />
                    Contenuto Documento
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                    {selectedDocument.description ? (
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed">
                          {selectedDocument.description}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">Anteprima non disponibile</p>
                        <p className="text-sm">Scarica il documento per visualizzarne il contenuto completo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Tag</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag, index) => (
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