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
      if (!target.closest('.share-menu-container')) {
        setShowShareMenu(false);
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

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

              <div className="flex items-center space-x-2 mt-4 lg:mt-0 relative share-menu-container">
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
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  title="Condividi normativa"
                  className={`p-3 rounded-lg border transition-colors ${
                    showShareMenu 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Share2 className="h-5 w-5" />
                </button>
                
                {/* Share Menu */}
                {showShareMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 min-w-[280px]">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Condividi questa normativa
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
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
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white transition-colors text-sm ${option.color}`}
                          >
                            <Icon className="h-4 w-4" />
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