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
  AlertCircle,
  Copy,
  Mail,
  MessageCircle,
  Send,
  Linkedin,
  Twitter,
  CheckCircle
} from 'lucide-react';

export default function NormativeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [normative, setNormative] = useState<Normative | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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

  function handleViewInPage() {
    if (!normative?.file_path) {
      alert('Nessun file disponibile per questa normativa');
      return;
    }
    
    // Apri sempre in una nuova finestra per la lettura
    window.open(normative.file_path, '_blank');
    setShowDownloadMenu(false);
  }

  function handleDownloadFile() {
    if (!normative?.file_path) {
      alert('Nessun file disponibile per questa normativa');
      return;
    }
    
    // Forza il download del file
    if (normative.file_path.startsWith('http')) {
      // Per URL esterni, crea un link temporaneo che forza il download
      const link = document.createElement('a');
      link.href = normative.file_path;
      link.download = `${normative.reference_number.replace(/[^a-zA-Z0-9]/g, '_')}_${normative.title.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Per percorsi locali
      const link = document.createElement('a');
      link.href = normative.file_path;
      link.download = `${normative.reference_number.replace(/[^a-zA-Z0-9]/g, '_')}_normativa.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowDownloadMenu(false);
  }

  function handleCopyLink() {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {
      prompt('Copia questo link per condividere:', currentUrl);
    });
  }

  function handleWhatsAppShare() {
    const currentUrl = window.location.href;
    const text = `📋 ${normative?.title}\n\n${normative?.reference_number}\n\nConsulta la normativa completa: ${currentUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  }

  function handleTelegramShare() {
    const currentUrl = window.location.href;
    const text = `📋 ${normative?.title} - ${normative?.reference_number}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  }

  function handleEmailShare() {
    const currentUrl = window.location.href;
    const subject = `Normativa: ${normative?.title}`;
    const body = `Ti condivido questa normativa del trasporto pubblico locale:\n\n${normative?.title}\nRiferimento: ${normative?.reference_number}\n\nConsulta il testo completo: ${currentUrl}\n\n---\nCondiviso da Accademia TPL`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }

  function handleLinkedInShare() {
    const currentUrl = window.location.href;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
    window.open(linkedinUrl, '_blank');
  }

  function handleTwitterShare() {
    const currentUrl = window.location.href;
    const text = `📋 ${normative?.title} - ${normative?.reference_number} #TPL #Normative`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(twitterUrl, '_blank');
  }

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest('.share-menu-container') && !target.closest('.download-menu-container')) {
        setShowShareMenu(false);
        setShowDownloadMenu(false);
      }
    }

    if (showShareMenu || showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu, showDownloadMenu]);

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      action: handleWhatsAppShare
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: handleTelegramShare
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700',
      action: handleEmailShare
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      action: handleLinkedInShare
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-black hover:bg-gray-800',
      action: handleTwitterShare
    },
    {
      name: copySuccess ? 'Copiato!' : 'Copia Link',
      icon: copySuccess ? CheckCircle : Copy,
      color: copySuccess ? 'bg-green-500' : 'bg-gray-500 hover:bg-gray-600',
      action: handleCopyLink
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  if (!normative) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
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
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/normative')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-800 transition-colors mb-4 min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Torna alle Normative</span>
          </button>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4 sm:mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getTypeColor(normative.type)}`}>
                    {getTypeLabel(normative.type)}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-600">
                    {normative.reference_number}
                  </span>
                </div>
                
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {normative.title}
                </h1>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
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

              <div className="flex items-center space-x-1 sm:space-x-2 mt-4 lg:mt-0 relative share-menu-container">
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                    bookmarked 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-600' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  title="Condividi normativa"
                  className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                    showShareMenu 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                
                {/* Share Menu */}
                {showShareMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 z-50 min-w-[280px] w-[90vw] sm:w-auto max-w-[320px]">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Condividi questa normativa
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {shareOptions.map((option, index) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              option.action();
                              if (option.name !== 'Copia Link' && !copySuccess) {
                                setShowShareMenu(false);
                              }
                            }}
                            className={`flex items-center justify-center sm:justify-start space-x-2 px-3 py-3 min-h-[44px] rounded-lg text-white transition-colors text-xs sm:text-sm ${option.color}`}
                          >
                            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{option.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        Condividi con colleghi e professionisti del settore
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="relative download-menu-container">
                  <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    title="Opzioni documento"
                    className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                      showDownloadMenu 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                    disabled={!normative?.file_path}
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  
                  {/* Download Menu */}
                  {showDownloadMenu && normative?.file_path && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50 min-w-[200px] w-[80vw] sm:w-auto max-w-[250px]">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">
                        Opzioni Documento
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={handleViewInPage}
                          className="w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-3 min-h-[44px] rounded-lg text-blue-600 hover:bg-blue-50 transition-colors text-xs sm:text-sm"
                        >
                          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Apri per Lettura</span>
                        </button>
                        <button
                          onClick={handleDownloadFile}
                          className="w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-3 min-h-[44px] rounded-lg text-green-600 hover:bg-green-50 transition-colors text-xs sm:text-sm"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Scarica File</span>
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Scegli come consultare il documento
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {normative.tags && normative.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {normative.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8 border border-gray-100">
          <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm sm:text-base">
              {normative.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}