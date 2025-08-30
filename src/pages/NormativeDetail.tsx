import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNormativeById, Normative } from '../lib/api';
import { 
  ArrowLeft, 
  Calendar, 
  Tag, 
  Share2, 
  Bookmark,
  Download,
  AlertCircle
} from 'lucide-react';

export default function NormativeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [normative, setNormative] = useState<Normative | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNormative();
    }
  }, [id]);

  async function fetchNormative() {
    try {
      const data = await getNormativeById(id!);
      setNormative(data);
    } catch (error) {
      console.error('Error fetching normative:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'law': return 'Legge';
      case 'regulation': return 'Regolamento';
      case 'ruling': return 'Sentenza';
      default: return type;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'law': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'regulation': return 'bg-green-100 text-green-800 border-green-200';
      case 'ruling': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function handleDownload() {
    if (!normative?.file_path) {
      alert('Nessun file allegato disponibile per questa normativa');
      return;
    }
    
    // Se è un URL esterno (Google Drive, etc.)
    if (normative.file_path.startsWith('http')) {
      window.open(normative.file_path, '_blank');
    } else {
      // Se è un percorso locale, crea un link di download
      const link = document.createElement('a');
      link.href = normative.file_path;
      link.download = normative.filename || 'normativa.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function handleShare() {
    const currentUrl = window.location.href;
    
    // Prova a usare l'API Web Share se disponibile (mobile/modern browsers)
    if (navigator.share) {
      navigator.share({
        title: normative?.title,
        text: `${normative?.title} - ${normative?.reference_number}`,
        url: currentUrl
      }).catch(() => {
        // Fallback se Web Share API fallisce (permission denied, user cancellation, etc.)
        navigator.clipboard.writeText(currentUrl).then(() => {
          alert('Link copiato negli appunti!');
        }).catch(() => {
          // Fallback del fallback: mostra URL in un prompt
          prompt('Copia questo link per condividere:', currentUrl);
        });
      });
    } else {
      // Fallback: copia URL negli appunti
      navigator.clipboard.writeText(currentUrl).then(() => {
        alert('Link copiato negli appunti!');
      }).catch(() => {
        // Fallback del fallback: mostra URL in un prompt
        prompt('Copia questo link per condividere:', currentUrl);
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  if (!normative) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Normativa non trovata
          </h1>
          <p className="text-gray-600 mb-6">
            La normativa richiesta non esiste o è stata rimossa.
          </p>
          <button
            onClick={() => navigate('/normative')}
            className="inline-flex items-center space-x-2 bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Torna alle Normative</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/normative')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-800 transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Torna alle Normative</span>
          </button>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(normative.type)}`}>
                    {getTypeLabel(normative.type)}
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    {normative.reference_number}
                  </span>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {normative.title}
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Pubblicata: {new Date(normative.publication_date).toLocaleDateString('it-IT')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Efficace: {new Date(normative.effective_date).toLocaleDateString('it-IT')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Tag className="h-4 w-4" />
                    <span>{normative.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-4 lg:mt-0">
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`p-3 rounded-lg border transition-colors ${
                    bookmarked 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-600' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Bookmark className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleShare}
                  title="Condividi normativa"
                  className="p-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleDownload}
                  title="Scarica file allegato"
                  className="p-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!normative?.file_path}
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Tags */}
            {normative.tags && normative.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {normative.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {normative.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}