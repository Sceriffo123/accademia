import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPermissions, getAllDocuments } from '../lib/neonDatabase';
import { 
  FolderOpen, 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Eye,
  Edit3,
  Trash2,
  Calendar,
  User,
  ChevronRight,
  Plus,
  FileIcon
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role) {
      loadUserPermissions();
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

  async function loadDocuments() {
    try {
      setLoading(true);
      const docs = await getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Errore caricamento documenti:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  const canView = userPermissions.includes('documents.view');
  const canCreate = userPermissions.includes('documents.create');
  const canEdit = userPermissions.includes('documents.edit');
  const canDelete = userPermissions.includes('documents.delete');
  const canUpload = userPermissions.includes('documents.upload');

  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <FileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
    { label: 'Documenti Totali', value: documents.length.toString(), icon: FileIcon, color: 'bg-blue-500' },
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

          {filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <FileIcon className="h-6 w-6 text-blue-800" />
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
                        disabled={!canEdit}
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
              <FileIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Nessun documento trovato</p>
              <p className="text-sm">Prova a modificare i filtri di ricerca</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}