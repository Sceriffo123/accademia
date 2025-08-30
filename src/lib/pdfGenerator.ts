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
 * Genera un PDF elegante e professionale con design moderno
 */
export function generatePDF(doc: Document): Blob {
  const pdf = new jsPDF();
  
  // Configurazione colori moderni
  const colors = {
    primary: [37, 99, 235],      // Blue-600
    secondary: [99, 102, 241],   // Indigo-500
    accent: [16, 185, 129],      // Emerald-500
    dark: [31, 41, 55],          // Gray-800
    medium: [75, 85, 99],        // Gray-600
    light: [156, 163, 175],      // Gray-400
    background: [249, 250, 251], // Gray-50
    white: [255, 255, 255]
  };
  
  let yPosition = 0;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // === HEADER MODERNO CON GRADIENTE ===
  // Background gradiente simulato con rettangoli sovrapposti
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 45, 'F');
  
  pdf.setFillColor(37, 99, 235, 0.8); // Trasparenza simulata
  pdf.rect(0, 0, pageWidth, 35, 'F');
  
  // Logo e titolo principale
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACCADEMIA TPL', margin, 20);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema Gestionale Trasporto Pubblico Locale', margin, 28);
  
  // Data e ora generazione (allineata a destra)
  const now = new Date();
  const dateStr = now.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  pdf.setFontSize(9);
  pdf.text(`Generato il ${dateStr}`, pageWidth - margin - 60, 32);
  
  yPosition = 60;
  
  // === BADGE TIPO DOCUMENTO ===
  const typeLabel = getTypeLabel(doc.type);
  const badgeWidth = pdf.getTextWidth(typeLabel) + 16;
  
  // Background badge
  pdf.setFillColor(...colors.secondary);
  pdf.roundedRect(margin, yPosition - 8, badgeWidth, 16, 3, 3, 'F');
  
  // Testo badge
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(typeLabel, margin + 8, yPosition);
  
  yPosition += 25;
  
  // === TITOLO DOCUMENTO CON STILE MODERNO ===
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(doc.title, contentWidth);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 5;
  
  // Linea decorativa sotto il titolo
  pdf.setDrawColor(...colors.accent);
  pdf.setLineWidth(2);
  pdf.line(margin, yPosition, margin + 80, yPosition);
  yPosition += 15;
  
  // === CATEGORIA E METADATA ===
  pdf.setTextColor(...colors.medium);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Categoria: ${doc.category}`, margin, yPosition);
  yPosition += 20;
  
  // === DESCRIZIONE CON BOX COLORATO ===
  if (doc.description) {
    // Box background
    pdf.setFillColor(...colors.background);
    pdf.setDrawColor(...colors.light);
    pdf.setLineWidth(0.5);
    
    const descLines = pdf.splitTextToSize(doc.description, contentWidth - 20);
    const boxHeight = descLines.length * 6 + 20;
    
    pdf.roundedRect(margin, yPosition - 5, contentWidth, boxHeight, 5, 5, 'FD');
    
    // Titolo descrizione
    pdf.setTextColor(...colors.secondary);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIZIONE', margin + 10, yPosition + 5);
    
    // Testo descrizione
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(descLines, margin + 10, yPosition + 15);
    yPosition += boxHeight + 15;
  }
  
  // === SEZIONE DETTAGLI CON DESIGN A CARD ===
  // Card background
  pdf.setFillColor(...colors.white);
  pdf.setDrawColor(...colors.light);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, yPosition, contentWidth, 85, 8, 8, 'FD');
  
  // Titolo sezione
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DETTAGLI TECNICI', margin + 15, yPosition + 18);
  
  yPosition += 30;
  
  // Griglia dettagli senza icone problematiche
  const details = [
    ['Nome File:', doc.filename || 'N/A'],
    ['Dimensione:', doc.file_size ? `${doc.file_size} KB` : 'N/A'],
    ['Tipo MIME:', doc.mime_type || 'application/octet-stream'],
    ['Versione:', doc.version || '1.0'],
    ['Stato:', getStatusLabel(doc.status)],
    ['Download:', (doc.download_count || 0).toString()]
  ];
  
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(10);
  
  // Layout a due colonne
  const leftColumn = margin + 15;
  const rightColumn = margin + (contentWidth / 2) + 10;
  let leftY = yPosition;
  let rightY = yPosition;
  
  details.forEach(([label, value], index) => {
    const isLeftColumn = index % 2 === 0;
    const x = isLeftColumn ? leftColumn : rightColumn;
    const y = isLeftColumn ? leftY : rightY;
    
    // Label in grassetto
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.medium);
    pdf.text(label, x, y);
    
    // Valore
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.dark);
    const truncatedValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
    pdf.text(truncatedValue, x, y + 8);
    
    if (isLeftColumn) {
      leftY += 20;
    } else {
      rightY += 20;
    }
  });
  
  yPosition = Math.max(leftY, rightY) + 15;
  
  // === SEZIONE INFORMAZIONI UPLOAD ===
  // Card background
  pdf.setFillColor(...colors.background);
  pdf.setDrawColor(...colors.light);
  pdf.roundedRect(margin, yPosition, contentWidth, 65, 8, 8, 'FD');
  
  // Titolo sezione
  pdf.setTextColor(...colors.secondary);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMAZIONI UPLOAD', margin + 15, yPosition + 18);
  
  yPosition += 30;
  
  const uploadInfo = [
    ['Data Upload:', new Date(doc.created_at).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    ['Ultima Modifica:', new Date(doc.updated_at).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    ['Caricato da:', doc.uploaded_by || 'Sistema Automatico']
  ];
  
  uploadInfo.forEach(([label, value]) => {
    // Label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.medium);
    pdf.text(label, leftColumn, yPosition);
    
    // Valore
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.dark);
    pdf.text(value, leftColumn, yPosition + 8);
    
    yPosition += 18;
  });
  
  // === TAGS CON DESIGN MODERNO ===
  if (doc.tags && doc.tags.length > 0) {
    yPosition += 20;
    
    // Titolo tags
    pdf.setTextColor(...colors.accent);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TAG ASSOCIATI', margin, yPosition);
    yPosition += 15;
    
    // Render tags come pillole colorate
    let tagX = margin;
    let tagY = yPosition;
    
    doc.tags.forEach((tag, index) => {
      const tagWidth = pdf.getTextWidth(tag) + 12;
      
      // Verifica se il tag va a capo
      if (tagX + tagWidth > pageWidth - margin) {
        tagX = margin;
        tagY += 20;
      }
      
      // Background tag
      pdf.setFillColor(...colors.accent);
      pdf.roundedRect(tagX, tagY - 8, tagWidth, 14, 7, 7, 'F');
      
      // Testo tag
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(tag, tagX + 6, tagY);
      
      tagX += tagWidth + 8;
    });
    
    yPosition = tagY + 25;
  }
  
  // === FOOTER ELEGANTE ===
  const footerY = pageHeight - 25;
  
  // Linea decorativa footer
  pdf.setDrawColor(...colors.light);
  pdf.setLineWidth(0.5);
  pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  // Informazioni footer
  pdf.setTextColor(...colors.light);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  
  // Sinistra: Info generazione
  pdf.text('Documento generato automaticamente da Accademia TPL', margin, footerY);
  
  // Centro: ID documento
  const idText = `ID: ${doc.id.substring(0, 8)}...`;
  const idWidth = pdf.getTextWidth(idText);
  pdf.text(idText, (pageWidth - idWidth) / 2, footerY);
  
  // Destra: Pagina
  const pageText = 'Pagina 1 di 1';
  const pageTextWidth = pdf.getTextWidth(pageText);
  pdf.text(pageText, pageWidth - margin - pageTextWidth, footerY);
  
  // === WATERMARK SOTTILE ===
  pdf.setTextColor(240, 240, 240);
  pdf.setFontSize(60);
  pdf.setFont('helvetica', 'bold');
  
  // Calcola posizione centrale per watermark
  const watermarkText = 'ACCADEMIA';
  const watermarkWidth = pdf.getTextWidth(watermarkText);
  const watermarkX = (pageWidth - watermarkWidth) / 2;
  const watermarkY = pageHeight / 2;
  
  // Watermark diagonale
  pdf.saveGraphicsState();
  pdf.text(watermarkText, watermarkX, watermarkY, {
    angle: -45
  });
  pdf.restoreGraphicsState();
  
  // === BORDO DECORATIVO ===
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(1);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  // Converti in blob
  return pdf.output('blob');
}

/**
 * Genera un PDF per una normativa con layout specifico
 */
export function generateNormativePDF(normative: any): Blob {
  const pdf = new jsPDF();
  
  // Configurazione colori
  const colors = {
    primary: [37, 99, 235],
    secondary: [99, 102, 241],
    accent: [16, 185, 129],
    dark: [31, 41, 55],
    medium: [75, 85, 99],
    light: [156, 163, 175],
    background: [249, 250, 251],
    white: [255, 255, 255]
  };
  
  let yPosition = 0;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // === HEADER ISTITUZIONALE ===
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  // Titolo principale
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACCADEMIA TPL', margin, 20);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Trasporto Pubblico Locale - Archivio Normativo', margin, 30);
  
  // Numero di riferimento (allineato a destra)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const refText = normative.reference_number;
  const refWidth = pdf.getTextWidth(refText);
  pdf.text(refText, pageWidth - margin - refWidth, 25);
  
  yPosition = 70;
  
  // === BADGE TIPO NORMATIVA ===
  const typeLabel = getTypeLabel(normative.type);
  const badgeWidth = pdf.getTextWidth(typeLabel) + 16;
  
  pdf.setFillColor(...getTypeColorRGB(normative.type));
  pdf.roundedRect(margin, yPosition - 8, badgeWidth, 16, 3, 3, 'F');
  
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(typeLabel, margin + 8, yPosition);
  
  yPosition += 25;
  
  // === TITOLO NORMATIVA ===
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(normative.title, contentWidth);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 8 + 10;
  
  // Linea decorativa
  pdf.setDrawColor(...colors.accent);
  pdf.setLineWidth(2);
  pdf.line(margin, yPosition, margin + 100, yPosition);
  yPosition += 20;
  
  // === INFORMAZIONI NORMATIVA ===
  pdf.setFillColor(...colors.background);
  pdf.setDrawColor(...colors.light);
  pdf.roundedRect(margin, yPosition - 5, contentWidth, 45, 5, 5, 'FD');
  
  pdf.setTextColor(...colors.secondary);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMAZIONI NORMATIVA', margin + 10, yPosition + 8);
  
  yPosition += 18;
  
  const normativeInfo = [
    ['Categoria:', normative.category],
    ['Data Pubblicazione:', new Date(normative.publication_date).toLocaleDateString('it-IT')],
    ['Data Efficacia:', new Date(normative.effective_date).toLocaleDateString('it-IT')]
  ];
  
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(10);
  
  normativeInfo.forEach(([label, value], index) => {
    const x = index < 2 ? margin + 15 : margin + (contentWidth / 2) + 10;
    const y = index < 2 ? yPosition + (index * 12) : yPosition + ((index - 2) * 12);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.medium);
    pdf.text(label, x, y);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.dark);
    pdf.text(value, x + 45, y);
  });
  
  yPosition += 50;
  
  // === CONTENUTO NORMATIVA ===
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TESTO NORMATIVA', margin, yPosition);
  yPosition += 15;
  
  // Contenuto con gestione pagine multiple
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const contentLines = pdf.splitTextToSize(normative.content, contentWidth);
  const linesPerPage = Math.floor((pageHeight - yPosition - 40) / 6);
  
  let currentLine = 0;
  while (currentLine < contentLines.length) {
    const pageLinesEnd = Math.min(currentLine + linesPerPage, contentLines.length);
    const pageLines = contentLines.slice(currentLine, pageLinesEnd);
    
    pdf.text(pageLines, margin, yPosition);
    
    currentLine = pageLinesEnd;
    
    if (currentLine < contentLines.length) {
      pdf.addPage();
      yPosition = 30;
    }
  }
  
  // === TAGS (se presenti) ===
  if (normative.tags && normative.tags.length > 0) {
    // Verifica se c'è spazio nella pagina corrente
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = 30;
    } else {
      yPosition += 20;
    }
    
    pdf.setTextColor(...colors.accent);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TAG ASSOCIATI', margin, yPosition);
    yPosition += 15;
    
    let tagX = margin;
    let tagY = yPosition;
    
    normative.tags.forEach((tag: string) => {
      const tagWidth = pdf.getTextWidth(tag) + 12;
      
      if (tagX + tagWidth > pageWidth - margin) {
        tagX = margin;
        tagY += 20;
      }
      
      pdf.setFillColor(...colors.accent);
      pdf.roundedRect(tagX, tagY - 8, tagWidth, 14, 7, 7, 'F');
      
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(tag, tagX + 6, tagY);
      
      tagX += tagWidth + 8;
    });
  }
  
  // === FOOTER SU OGNI PAGINA ===
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 20;
    
    pdf.setDrawColor(...colors.light);
    pdf.setLineWidth(0.5);
    pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
    
    pdf.setTextColor(...colors.light);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('Accademia TPL - Sistema Gestionale Trasporto Pubblico Locale', margin, footerY);
    
    const pageText = `Pagina ${i} di ${totalPages}`;
    const pageTextWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - margin - pageTextWidth, footerY);
    
    const dateText = new Date().toLocaleDateString('it-IT');
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, (pageWidth - dateWidth) / 2, footerY);
  }
  
  return pdf.output('blob');
}

function getTypeColorRGB(type: string): [number, number, number] {
  switch (type) {
    case 'law': return [37, 99, 235]; // Blue
    case 'regulation': return [16, 185, 129]; // Green
    case 'ruling': return [245, 101, 101]; // Orange/Red
    default: return [107, 114, 128]; // Gray
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'template': return 'TEMPLATE';
    case 'form': return 'MODULO';
    case 'guide': return 'GUIDA';
    case 'report': return 'REPORT';
    case 'law': return 'LEGGE';
    case 'regulation': return 'REGOLAMENTO';
    case 'ruling': return 'SENTENZA';
    default: return type?.toUpperCase() || 'DOCUMENTO';
  }
}

function getStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'active': return 'Attivo';
    case 'draft': return 'Bozza';
    case 'archived': return 'Archiviato';
    default: return status || 'Non Specificato';
  }
}