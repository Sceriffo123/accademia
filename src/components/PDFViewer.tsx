import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCw } from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  file: string | File;
  onScrollProgress?: (progress: number) => void;
  className?: string;
}

export default function PDFViewer({ file, onScrollProgress, className = '' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewedPages, setViewedPages] = useState<Set<number>>(new Set([1]));

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError('');
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(`Errore caricamento PDF: ${error.message}`);
    setLoading(false);
  }, []);

  const changePage = useCallback((offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = Math.max(1, Math.min(prevPageNumber + offset, numPages));
      setViewedPages(prev => new Set(prev).add(newPage));
      return newPage;
    });
  }, [numPages]);

  const previousPage = useCallback(() => changePage(-1), [changePage]);
  const nextPage = useCallback(() => changePage(1), [changePage]);

  const zoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.2, 3.0)), []);
  const zoomOut = useCallback(() => setScale(prev => Math.max(prev - 0.2, 0.5)), []);
  const rotate = useCallback(() => setRotation(prev => (prev + 90) % 360), []);

  const downloadPDF = useCallback(() => {
    if (typeof file === 'string') {
      const link = document.createElement('a');
      link.href = file;
      link.download = 'documento.pdf';
      link.click();
    }
  }, [file]);

  // Calculate reading progress
  useEffect(() => {
    if (numPages > 0 && onScrollProgress) {
      const progress = (viewedPages.size / numPages) * 100;
      onScrollProgress(progress);
    }
  }, [viewedPages, numPages, onScrollProgress]);

  // Auto-advance pages for better tracking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pageNumber < numPages) {
        setViewedPages(prev => new Set(prev).add(pageNumber + 1));
      }
    }, 3000); // Mark next page as viewed after 3 seconds

    return () => clearTimeout(timer);
  }, [pageNumber, numPages]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Caricamento PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-red-50 rounded-lg border border-red-200 ${className}`}>
        <div className="text-center text-red-600">
          <p className="font-medium">Errore caricamento PDF</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pagina precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-sm font-medium px-3 py-1 bg-white rounded border">
            {pageNumber} / {numPages}
          </span>
          
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pagina successiva"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded hover:bg-gray-200"
            title="Riduci zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="text-sm px-2 py-1 bg-white rounded border min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            className="p-2 rounded hover:bg-gray-200"
            title="Aumenta zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <button
            onClick={rotate}
            className="p-2 rounded hover:bg-gray-200"
            title="Ruota"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          
          <button
            onClick={downloadPDF}
            className="p-2 rounded hover:bg-gray-200"
            title="Scarica PDF"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>

        <div className="text-xs text-gray-500">
          Progresso: {Math.round((viewedPages.size / numPages) * 100)}%
        </div>
      </div>

      {/* PDF Content */}
      <div 
        ref={containerRef}
        className="overflow-auto max-h-[600px] p-4 bg-gray-100"
        style={{ textAlign: 'center' }}
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            loading={
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            }
            className="shadow-lg"
          />
        </Document>
      </div>

      {/* Progress Indicator */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Pagine visualizzate: {viewedPages.size}/{numPages}</span>
          <span>{Math.round((viewedPages.size / numPages) * 100)}% completato</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(viewedPages.size / numPages) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
