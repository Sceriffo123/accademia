import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadFileToAruba } from '../lib/arubaUpload';
import { createDocument } from '../lib/neonDatabase';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader,
  FileText,
  Image,
  FileSpreadsheet
} from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (document: any) => void;
  onClose?: () => void;
  category?: string;
  type?: 'template' | 'form' | 'guide' | 'report';
}

export default function FileUpload({ 
  onUploadComplete, 
  onClose, 
  category = 'generale',
  type = 'template' 
}: FileUploadProps) {
  const { profile } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedType, setSelectedType] = useState(type);
  const [tags, setTags] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    console.log('🎓 UPLOAD: File selezionato:', file.name, file.type, file.size);
    setSelectedFile(file);
    setError('');
    
    // Auto-compila il titolo se vuoto
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setError('Seleziona un file e inserisci un titolo');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      console.log('🎓 UPLOAD: Inizio processo upload...');
      
      // Simula progress per UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // 1. Upload file su Aruba
      console.log('🎓 UPLOAD: Upload su spazio Aruba...');
      const uploadResult = await uploadFileToAruba(selectedFile, selectedCategory, selectedType);
      
      clearInterval(progressInterval);
      setUploadProgress(95);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Errore upload su Aruba');
      }

      console.log('🎓 UPLOAD: File caricato su Aruba:', uploadResult.fileUrl);

      // 2. Salva metadati nel database locale
      console.log('🎓 UPLOAD: Salvataggio metadati nel database...');
      const documentData = {
        title: title.trim(),
        description: description.trim() || undefined,
        filename: selectedFile.name,
        file_url: uploadResult.fileUrl!,
        file_path: uploadResult.filePath!,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        type: selectedType,
        category: selectedCategory,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
        version: '1.0',
        status: 'active' as const,
        uploaded_by: profile?.id
      };

      const newDocument = await createDocument(documentData);
      
      if (!newDocument) {
        throw new Error('Errore salvataggio metadati nel database');
      }

      setUploadProgress(100);
      setUploadResult(newDocument);
      
      console.log('🎓 UPLOAD: Documento creato con successo:', newDocument.id);
      
      // Notifica completamento
      if (onUploadComplete) {
        onUploadComplete(newDocument);
      }

      // Reset form dopo 2 secondi
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('🚨 UPLOAD: Errore durante upload:', error);
      setError(error instanceof Error ? error.message : 'Errore durante upload');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setTags('');
    setUploadProgress(0);
    setUploadResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('image')) return Image;
    if (file.type.includes('pdf')) return FileText;
    if (file.type.includes('sheet') || file.type.includes('excel')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Carica Nuovo Documento
              </h3>
              <p className="text-sm text-gray-600">
                Upload su spazio Aruba con indicizzazione automatica
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          {uploadResult ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="p-4 bg-green-100 rounded-2xl w-fit mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Upload Completato!
              </h3>
              <p className="text-gray-600 mb-4">
                Il documento è stato caricato con successo su Aruba
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Titolo:</strong> {uploadResult.title}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>File:</strong> {uploadResult.filename}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>URL:</strong> 
                  <a 
                    href={uploadResult.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 ml-2"
                  >
                    Visualizza file
                  </a>
                </p>
              </div>
              <button
                onClick={resetForm}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Carica Altro Documento
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-3">
                      {React.createElement(getFileIcon(selectedFile), {
                        className: "h-12 w-12 text-blue-600"
                      })}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedFile.name}
                      </h3>
                      <p className="text-gray-600">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-red-600 hover:text-red-800 text-sm transition-colors"
                    >
                      Rimuovi file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Trascina il file qui
                      </h3>
                      <p className="text-gray-600 mb-4">
                        oppure clicca per selezionare
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Seleziona File
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Supportati: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG (max 50MB)
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
              />

              {/* Form Fields */}
              {selectedFile && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titolo Documento *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Inserisci il titolo del documento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrizione
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Descrizione opzionale del documento"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo Documento *
                      </label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="template">Template</option>
                        <option value="form">Modulo</option>
                        <option value="guide">Guida</option>
                        <option value="report">Report</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoria *
                      </label>
                      <input
                        type="text"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="es. Licenze, Autorizzazioni, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (separati da virgola)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. taxi, ncc, autorizzazioni"
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Upload in corso...
                    </span>
                    <span className="text-sm text-gray-600">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Caricamento su spazio Aruba...</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedFile && !uploading && !uploadResult && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annulla
                    </button>
                  )}
                  <button
                    onClick={handleUpload}
                    disabled={!title.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Carica su Aruba</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}