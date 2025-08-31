import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNormatives, Normative } from '../lib/api';
import { 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  Tag, 
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Download,
  AlertCircle
} from 'lucide-react';

export default function NormativeNazionale() {
  const [normatives, setNormatives] = useState<Normative[]>([]);
  const [filteredNormatives, setFilteredNormatives] = useState<Normative[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubtype, setSelectedSubtype] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchNormatives();
  }, []);

  useEffect(() => {
    filterNormatives();
  }, [normatives, searchTerm, selectedSubtype, selectedYear]);

  async function fetchNormatives() {
    try {
      const data = await getNormatives({
        category: 'Nazionale'
      });
      setNormatives(data);
    } catch (error) {
      console.error('Error fetching national normatives:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterNormatives() {
    let filtered = normatives.filter(n => 
      n.category === 'Trasporto Pubblico' || 
      n.category === 'Nazionale' ||
      n.reference_number.includes('D.Lgs.') ||
      n.reference_number.includes('L.') ||
      n.reference_number.includes('DPCM') ||
      n.reference_number.includes('DM')
    );

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.content.toLowerCase().includes(searchLower) ||
        n.reference_number.toLowerCase().includes(searchLower)
      );
    }

    if (selectedSubtype !== 'all') {
      filtered = filtered.filter(n => {
        switch (selectedSubtype) {
          case 'leggi':
            return n.reference_number.includes('L.');
          case 'dl':
            return n.reference_number.includes('D.L.');
          case 'dlgs':
            return n.reference_number.includes('D.Lgs.');
          case 'dpcm':
            return n.reference_number.includes('DPCM');
          case 'dm':
            return n.reference_number.includes('DM');
          default:
            return true;
        }
      });
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(n => 
        new Date(n.publication_date).getFullYear().toString() === selectedYear
      );
    }

    setFilteredNormatives(filtered);
  }

  const years = [...new Set(normatives.map(n => 
    new Date(n.publication_date).getFullYear().toString()
  ))].sort((a, b) => parseInt(b) - parseInt(a));

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case 'leggi': return 'Leggi';
      case 'dl': return 'Decreti Legge';
      case 'dlgs': return 'Decreti Legislativi';
      case 'dpcm': return 'DPCM';
      case 'dm': return 'Decreti Ministeriali';
      default: return subtype;
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/normative"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Normative</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Normative Nazionali
          </h1>
          <p className="text-gray-600">
            Leggi, Decreti Legislativi, DPCM e Decreti Ministeriali del trasporto pubblico locale
          </p>
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
                placeholder="Cerca per titolo, contenuto o numero di riferimento..."
              />
            </div>

            {/* Mobile Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-800 transition-colors md:hidden"
            >
              <Filter className="h-5 w-5" />
              <span>Filtri essenziali</span>
            </button>

            {/* Filters */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${showFilters ? 'block' : 'hidden md:grid'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo Normativa
                </label>
                <select
                  value={selectedSubtype}
                  onChange={(e) => setSelectedSubtype(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tutti i tipi</option>
                  <option value="leggi">Leggi</option>
                  <option value="dl">Decreti Legge</option>
                  <option value="dlgs">Decreti Legislativi</option>
                  <option value="dpcm">DPCM</option>
                  <option value="dm">Decreti Ministeriali</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anno
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tutti gli anni</option>
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSubtype('all');
                    setSelectedYear('all');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Reset Filtri
                </button>
              </div>
            </div>
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
                <div
                  key={normative.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Nazionale
                        </span>
                        <span className="text-sm text-gray-500">
                          {normative.reference_number}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {normative.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {normative.content.substring(0, 200)}...
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(normative.publication_date).toLocaleDateString('it-IT')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Tag className="h-4 w-4" />
                          <span>{normative.category}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/normative/${normative.id}`}
                          className="inline-flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors text-sm"
                        >
                          <span>Leggi Dettagli</span>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        
                        <button className="inline-flex items-center space-x-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                          <ExternalLink className="h-4 w-4" />
                          <span>Fonte Ufficiale</span>
                        </button>
                        
                        <button className="inline-flex items-center space-x-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                          <Download className="h-4 w-4" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Nessuna normativa nazionale trovata</p>
              <p className="text-sm">Prova a modificare i filtri di ricerca</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}