import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNormatives, Normative } from '../lib/api';
import { Search, Filter, FileText, Calendar, Tag, ChevronRight } from 'lucide-react';

export default function Normatives() {
  const [normatives, setNormatives] = useState<Normative[]>([]);
  const [filteredNormatives, setFilteredNormatives] = useState<Normative[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchNormatives();
  }, []);

  useEffect(() => {
    filterNormatives();
  }, [normatives, searchTerm, selectedType, selectedCategory]);

  async function fetchNormatives() {
    try {
      const data = await getNormatives();
      setNormatives(data);
    } catch (error) {
      console.error('Error fetching normatives:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterNormatives() {
    let filtered = normatives;

    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.reference_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.type === selectedType);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }

    setFilteredNormatives(filtered);
  }

  const categories = [...new Set(normatives.map(n => n.category))];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'law': return 'Legge';
      case 'regulation': return 'Regolamento';
      case 'ruling': return 'Sentenza';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'law': return 'bg-blue-100 text-blue-800';
      case 'regulation': return 'bg-green-100 text-green-800';
      case 'ruling': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Consultazione Normative
          </h1>
          <p className="text-gray-600">
            Accesso completo alle normative del trasporto pubblico locale non di linea
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-8 border border-gray-100">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Cerca per titolo, contenuto o numero di riferimento..."
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-800 transition-colors min-h-[44px]"
            >
              <Filter className="h-5 w-5" />
              <span>Filtri avanzati</span>
            </button>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo Documento
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tutti i tipi</option>
                    <option value="law">Leggi</option>
                    <option value="regulation">Regolamenti</option>
                    <option value="ruling">Sentenze</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tutte le categorie</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Risultati ({filteredNormatives.length})
            </h2>
          </div>

          {filteredNormatives.length > 0 ? (
            <div className="space-y-4">
              {filteredNormatives.map((normative) => (
                <Link
                  key={normative.id}
                  to={`/normative/${normative.id}`}
                  className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6 border border-gray-100 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(normative.type)}`}>
                          {getTypeLabel(normative.type)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {normative.reference_number}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-800 transition-colors line-clamp-2">
                        {normative.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {normative.content.substring(0, 200)}...
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(normative.publication_date).toLocaleDateString('it-IT')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Tag className="h-4 w-4" />
                          <span>{normative.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors ml-4 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Nessuna normativa trovata</p>
              <p className="text-sm">Prova a modificare i filtri di ricerca</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}