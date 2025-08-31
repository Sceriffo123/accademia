import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  FileText, 
  Users, 
  Building,
  Calendar,
  Tag,
  ChevronRight,
  BarChart3,
  Download,
  Eye
} from 'lucide-react';

interface DataEntry {
  id: string;
  title: string;
  type: 'azienda' | 'operatore' | 'veicolo' | 'licenza';
  category: string;
  lastUpdate: string;
  status: 'attivo' | 'sospeso' | 'scaduto';
  details: string;
}

export default function BancaDati() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const dataEntries: DataEntry[] = [
    {
      id: '1',
      title: 'Taxi Roma S.r.l.',
      type: 'azienda',
      category: 'Servizio Taxi',
      lastUpdate: '2024-01-15',
      status: 'attivo',
      details: 'Azienda di trasporto taxi con 25 veicoli autorizzati'
    },
    {
      id: '2',
      title: 'Mario Rossi',
      type: 'operatore',
      category: 'Conducente NCC',
      lastUpdate: '2024-01-10',
      status: 'attivo',
      details: 'Operatore NCC con licenza valida fino al 2025'
    },
    {
      id: '3',
      title: 'Mercedes Classe E - AB123CD',
      type: 'veicolo',
      category: 'Autovettura NCC',
      lastUpdate: '2024-01-08',
      status: 'attivo',
      details: 'Veicolo autorizzato per servizio NCC'
    },
    {
      id: '4',
      title: 'Licenza Taxi n. 1234',
      type: 'licenza',
      category: 'Autorizzazione Taxi',
      lastUpdate: '2023-12-20',
      status: 'scaduto',
      details: 'Licenza taxi scaduta il 31/12/2023'
    },
    {
      id: '5',
      title: 'NCC Milano Express',
      type: 'azienda',
      category: 'Servizio NCC',
      lastUpdate: '2024-01-12',
      status: 'sospeso',
      details: 'Azienda NCC temporaneamente sospesa per verifiche'
    }
  ];

  const filteredEntries = dataEntries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || entry.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || entry.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'azienda': return 'Azienda';
      case 'operatore': return 'Operatore';
      case 'veicolo': return 'Veicolo';
      case 'licenza': return 'Licenza';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'azienda': return 'bg-blue-100 text-blue-800';
      case 'operatore': return 'bg-green-100 text-green-800';
      case 'veicolo': return 'bg-purple-100 text-purple-800';
      case 'licenza': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'attivo': return 'Attivo';
      case 'sospeso': return 'Sospeso';
      case 'scaduto': return 'Scaduto';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attivo': return 'bg-green-100 text-green-800';
      case 'sospeso': return 'bg-yellow-100 text-yellow-800';
      case 'scaduto': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = [
    { label: 'Aziende Registrate', value: '156', icon: Building, color: 'bg-blue-500' },
    { label: 'Operatori Attivi', value: '1,247', icon: Users, color: 'bg-green-500' },
    { label: 'Veicoli Autorizzati', value: '2,891', icon: FileText, color: 'bg-purple-500' },
    { label: 'Licenze Valide', value: '1,089', icon: BarChart3, color: 'bg-orange-500' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Banca Dati
          </h1>
          <p className="text-gray-600">
            Archivio completo di aziende, operatori, veicoli e autorizzazioni del trasporto pubblico locale
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
                placeholder="Cerca aziende, operatori, veicoli o licenze..."
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tutti i tipi</option>
                    <option value="azienda">Aziende</option>
                    <option value="operatore">Operatori</option>
                    <option value="veicolo">Veicoli</option>
                    <option value="licenza">Licenze</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tutti gli stati</option>
                    <option value="attivo">Attivi</option>
                    <option value="sospeso">Sospesi</option>
                    <option value="scaduto">Scaduti</option>
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
              Risultati ({filteredEntries.length})
            </h2>
            <button className="flex items-center space-x-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span>Esporta</span>
            </button>
          </div>

          {filteredEntries.length > 0 ? (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100 group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Database className="h-5 w-5 text-gray-400" />
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                          {getTypeLabel(entry.type)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                          {getStatusLabel(entry.status)}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-800 transition-colors">
                        {entry.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4">
                        {entry.details}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Aggiornato: {new Date(entry.lastUpdate).toLocaleDateString('it-IT')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Tag className="h-4 w-4" />
                          <span>{entry.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Nessun dato trovato</p>
              <p className="text-sm">Prova a modificare i filtri di ricerca</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}