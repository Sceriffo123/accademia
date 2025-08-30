import jsPDF from 'jspdf';

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

/**
 * Genera un PDF completo con tutti i dati del documento
 */
export function generatePDF(doc: Document): Blob {
  const pdf = new jsPDF();
  
  // Configurazione font e colori
  const primaryColor = [44, 62, 80]; // Blu scuro
  const secondaryColor = [52, 152, 219]; // Blu
  const textColor = [51, 51, 51]; // Grigio scuro
  
  let yPosition = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Header con logo e titolo
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACCADEMIA TPL', margin, 20);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema Gestionale Trasporto Pubblico Locale', margin, 26);
  
  yPosition = 50;
  
  // Titolo documento
  pdf.setTextColor(...primaryColor);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(doc.title, contentWidth);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 8 + 10;
  
  // Sottotitolo con tipo e categoria
  pdf.setTextColor(...secondaryColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${getTypeLabel(doc.type)} - ${doc.category}`, margin, yPosition);
  yPosition += 15;
  
  // Descrizione se presente
  if (doc.description) {
    pdf.setTextColor(...textColor);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(doc.description, contentWidth);
    pdf.text(descLines, margin, yPosition);
    yPosition += descLines.length * 6 + 15;
  }
  
  // Sezione dettagli tecnici
  pdf.setTextColor(...primaryColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Dettagli Documento', margin, yPosition);
  yPosition += 10;
  
  // Tabella dettagli
  const details = [
    ['Nome File', doc.filename || 'N/A'],
    ['Dimensione', doc.file_size ? `${doc.file_size} KB` : 'N/A'],
    ['Tipo MIME', doc.mime_type || 'N/A'],
    ['Versione', doc.version || '1.0'],
    ['Stato', getStatusLabel(doc.status)],
    ['Download', (doc.download_count || 0).toString()]
  ];
  
  pdf.setTextColor(...textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  details.forEach(([label, value]) => {
    // Label in grassetto
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', margin, yPosition);
    
    // Valore normale
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, margin + 60, yPosition);
    
    yPosition += 8;
  });
  
  yPosition += 10;
  
  // Sezione informazioni upload
  pdf.setTextColor(...primaryColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Informazioni Upload', margin, yPosition);
  yPosition += 10;
  
  const uploadInfo = [
    ['Data Upload', new Date(doc.created_at).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    ['Ultima Modifica', new Date(doc.updated_at).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    ['Caricato da', doc.uploaded_by || 'Sistema']
  ];
  
  pdf.setTextColor(...textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  uploadInfo.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', margin, yPosition);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, margin + 60, yPosition);
    
    yPosition += 8;
  });
  
  // Tags se presenti
  if (doc.tags && doc.tags.length > 0) {
    yPosition += 10;
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Tag', margin, yPosition);
    yPosition += 10;
    
    pdf.setTextColor(...textColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const tagsText = doc.tags.join(', ');
    const tagLines = pdf.splitTextToSize(tagsText, contentWidth);
    pdf.text(tagLines, margin, yPosition);
    yPosition += tagLines.length * 6 + 15;
  }
  
  // Footer
  const footerY = pdf.internal.pageSize.getHeight() - 20;
  pdf.setTextColor(128, 128, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Generato da Accademia TPL - ' + new Date().toLocaleDateString('it-IT'), margin, footerY);
  pdf.text('ID Documento: ' + doc.id, pageWidth - margin - 50, footerY);
  
  // Converti in blob
  return pdf.output('blob');
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'template': return 'Template';
    case 'form': return 'Modulo';
    case 'guide': return 'Guida';
    case 'report': return 'Report';
    default: return type || 'N/A';
  }
}

function getStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'active': return 'Attivo';
    case 'draft': return 'Bozza';
    case 'archived': return 'Archiviato';
    default: return status || 'N/A';
  }
}