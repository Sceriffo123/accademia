import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document } from '../pages/Docx';

/**
 * Genera un PDF strutturato basato sui dati del documento.
 * @param doc - L'oggetto Document contenente i dati del modulo.
 * @returns Un blob rappresentante il PDF generato.
 */
export function generatePDF(doc: Document): Blob {
  const pdf = new jsPDF();
  
  // Intestazione
  pdf.setFontSize(18);
  pdf.text(doc.title || 'Documento Senza Titolo', 14, 22);
  
  // Sottotitolo con tipo e categoria
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Tipo: ${getTypeLabel(doc.type)} | Categoria: ${doc.category || 'N/A'}`, 14, 30);
  
  // Reset colore testo
  pdf.setTextColor(0, 0, 0);
  
  // Descrizione
  if (doc.description) {
    pdf.setFontSize(10);
    pdf.text('Descrizione:', 14, 40);
    const descriptionLines = pdf.splitTextToSize(doc.description, 180);
    pdf.text(descriptionLines, 14, 46);
  }
  
  // Dettagli documento in una tabella
  const details = [
    ['Nome File', doc.filename || 'N/A'],
    ['Dimensione', doc.file_size ? `${doc.file_size} KB` : 'N/A'],
    ['Tipo MIME', doc.mime_type || 'N/A'],
    ['Versione', doc.version || 'N/A'],
    ['Stato', getStatusLabel(doc.status)],
    ['Caricato da', doc.uploaded_by || 'Sistema'],
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
    })]
  ];
  
  (pdf as any).autoTable({
    startY: doc.description ? 56 + (descriptionLines.length * 6) : 40,
    head: [['Campo', 'Valore']],
    body: details,
    theme: 'striped',
    headStyles: { fillColor: [22, 160, 133] },
    styles: { fontSize: 10 }
  });
  
  // Piè di pagina
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Pagina ${i} di ${pageCount}`, 14, pdf.internal.pageSize.height - 10);
    pdf.text('Generato da Accademia', pdf.internal.pageSize.width - 60, pdf.internal.pageSize.height - 10);
  }
  
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
