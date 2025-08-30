// Soluzione alternativa senza librerie esterne per generazione PDF
// Utilizziamo un semplice HTML convertito in data URI per il download

/**
 * Genera un documento HTML semplice come fallback per PDF.
 * @param doc - L'oggetto Document contenente i dati del modulo.
 * @returns Un blob rappresentante il documento generato.
 */
export function generatePDF(doc: any): Blob {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${doc.title || 'Documento Senza Titolo'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2c3e50; }
        h2 { color: #3498db; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .footer { margin-top: 40px; font-size: 12px; color: #777; text-align: center; }
      </style>
    </head>
    <body>
      <h1>${doc.title || 'Documento Senza Titolo'}</h1>
      <h2>Tipo: ${getTypeLabel(doc.type)} | Categoria: ${doc.category || 'N/A'}</h2>
      ${doc.description ? `<p><strong>Descrizione:</strong> ${doc.description}</p>` : ''}
      
      <table>
        <tr><th>Campo</th><th>Valore</th></tr>
        <tr><td>Nome File</td><td>${doc.filename || 'N/A'}</td></tr>
        <tr><td>Dimensione</td><td>${doc.file_size ? `${doc.file_size} KB` : 'N/A'}</td></tr>
        <tr><td>Tipo MIME</td><td>${doc.mime_type || 'N/A'}</td></tr>
        <tr><td>Versione</td><td>${doc.version || 'N/A'}</td></tr>
        <tr><td>Stato</td><td>${getStatusLabel(doc.status)}</td></tr>
        <tr><td>Caricato da</td><td>${doc.uploaded_by || 'Sistema'}</td></tr>
        <tr><td>Data Upload</td><td>${new Date(doc.created_at).toLocaleDateString('it-IT', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</td></tr>
        <tr><td>Ultima Modifica</td><td>${new Date(doc.updated_at).toLocaleDateString('it-IT', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</td></tr>
      </table>
      
      <div class="footer">
        <p>Generato da Accademia</p>
      </div>
    </body>
    </html>
  `;
  
  // Converti in blob
  const blob = new Blob([htmlContent], { type: 'text/html' });
  return blob;
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
