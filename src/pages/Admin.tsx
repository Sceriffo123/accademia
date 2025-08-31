import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getNormativesCount, getUsersCount, getUsers, getNormatives, updateUser, deleteUser, createNewUser, updateUserPassword } from '../lib/api';
import { createNormative, updateNormative, deleteNormative, getAllDocuments, getDocumentsCount, createDocument, updateDocument, deleteDocument } from '../lib/neonDatabase';
import { downloadGoogleDriveFile, isGoogleDriveUrl } from '../lib/driveDownload';
import { generatePDF } from '../lib/pdfGenerator';
import { 
  Users, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye,
  Settings,
  BarChart3,
  X,
  Save,
  Key,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  FolderOpen,
  Download,
  Lock,
  Unlock
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalNormatives: number;
  totalViews: number;
  newUsersThisMonth: number;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'normatives' | 'documents'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalNormatives: 0,
    totalViews: 0,
    newUsersThisMonth: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [normatives, setNormatives] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNormative, setShowAddNormative] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Stati per gestione normative (aggiunti correttamente)
  const [showEditNormative, setShowEditNormative] = useState(false);
  const [editingNormative, setEditingNormative] = useState<any>(null);
  const [normativeForm, setNormativeForm] = useState({
    title: '',
    content: '',
    category: '',
    type: 'law' as 'law' | 'regulation' | 'ruling',
    reference_number: '',
    publication_date: '',
    effective_date: '',
    filename: '',
    file_path: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  // Stati per gestione documenti
  const [showEditDocument, setShowEditDocument] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; document: any }>({ show: false, document: null });
  const [documentForm, setDocumentForm] = useState({
    title: '',
    description: '',
    filename: '',
    file_path: '',
    file_size: '',
    mime_type: '',
    type: 'template' as 'template' | 'form' | 'guide' | 'report',
    category: '',
    tags: [] as string[],
    version: '1.0',
    status: 'active' as 'active' | 'draft' | 'archived'
  });
  const [documentTagInput, setDocumentTagInput] = useState('');

  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'superadmin' | 'operator'
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Handler per creazione normativa
  async function handleCreateNormative() {
    try {
      if (!normativeForm.title || !normativeForm.content || !normativeForm.reference_number) {
        addNotification('error', 'Errore Validazione', 'Titolo, contenuto e numero di riferimento sono obbligatori');
        return;
      }
      
      if (!normativeForm.publication_date || !normativeForm.effective_date) {
        addNotification('error', 'Errore Validazione', 'Date di pubblicazione e efficacia sono obbligatorie');
        return;
      }
      
      await createNormative({
        title: normativeForm.title,
        content: normativeForm.content,
        category: normativeForm.category || 'Generale',
        type: normativeForm.type,
        reference_number: normativeForm.reference_number,
        publication_date: normativeForm.publication_date,
        effective_date: normativeForm.effective_date,
        filename: normativeForm.filename || undefined,
        file_path: normativeForm.file_path || undefined,
        tags: normativeForm.tags
      });
      
      setShowAddNormative(false);
      setNormativeForm({
        title: '',
        content: '',
        category: '',
        type: 'law',
        reference_number: '',
        publication_date: '',
        effective_date: '',
        filename: '',
        file_path: '',
        tags: []
      });
      setTagInput('');
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Normativa Creata', `La normativa "${normativeForm.title}" è stata aggiunta al sistema`);
    } catch (error) {
      console.error('Error creating normative:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione della normativa');
    }
  }

  // Handler per modifica normativa
  async function handleUpdateNormative() {
    console.log('🔄 handleUpdateNormative chiamato');
    console.log('📝 editingNormative:', editingNormative);

    try {
      if (!editingNormative) {
        console.error('❌ Nessuna normativa da modificare');
        return;
      }

      if (!editingNormative.title || !editingNormative.content || !editingNormative.reference_number) {
        console.error('❌ Campi obbligatori mancanti:', {
          title: !!editingNormative.title,
          content: !!editingNormative.content,
          reference_number: !!editingNormative.reference_number
        });
        addNotification('error', 'Errore Validazione', 'Titolo, contenuto e numero di riferimento sono obbligatori');
        return;
      }

      console.log('📤 Chiamando updateNormative con dati:', {
        id: editingNormative.id,
        title: editingNormative.title,
        reference_number: editingNormative.reference_number
      });

      await updateNormative(editingNormative.id, {
        title: editingNormative.title,
        content: editingNormative.content,
        category: editingNormative.category,
        type: editingNormative.type,
        reference_number: editingNormative.reference_number,
        publication_date: editingNormative.publication_date
          ? (editingNormative.publication_date instanceof Date
            ? formatDateForInput(editingNormative.publication_date)
            : editingNormative.publication_date)
          : editingNormative.publication_date,
        effective_date: editingNormative.effective_date
          ? (editingNormative.effective_date instanceof Date
            ? formatDateForInput(editingNormative.effective_date)
            : editingNormative.effective_date)
          : editingNormative.effective_date,
        filename: editingNormative.filename || undefined,
        file_path: editingNormative.file_path || undefined,
        tags: editingNormative.tags
      });

      console.log('✅ updateNormative completato');

      setEditingNormative(null);
      setShowEditNormative(false);
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Normativa Aggiornata', `La normativa "${editingNormative.title}" è stata modificata`);
    } catch (error) {
      console.error('🚨 Errore in handleUpdateNormative:', error);
      console.error('🚨 Dettagli errore:', error instanceof Error ? error.message : String(error));
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare la normativa');
    }
  }

  // Handler per eliminazione normativa
  async function handleDeleteNormative(normativeId: string, normativeTitle: string) {
    if (!confirm(`Sei sicuro di voler eliminare la normativa "${normativeTitle}"?`)) {
      return;
    }
    
    try {
      const success = await deleteNormative(normativeId);
      if (success) {
        await fetchAdminData(); // Refresh data
        addNotification('info', 'Normativa Eliminata', `La normativa "${normativeTitle}" è stata rimossa dal sistema`);
      } else {
        addNotification('error', 'Errore Eliminazione', 'La normativa non è stata trovata o non può essere eliminata');
      }
    } catch (error) {
      console.error('Error deleting normative:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare la normativa');
    }
  }

  // Handler per aprire modal di modifica
  function handleEditNormative(normative: any) {
    // Formatta correttamente le date per gli input HTML5 date SENZA cambiare timezone
    const formattedNormative = {
      ...normative,
      publication_date: normative.publication_date
        ? formatDateForInput(normative.publication_date)
        : '',
      effective_date: normative.effective_date
        ? formatDateForInput(normative.effective_date)
        : ''
    };
    setEditingNormative(formattedNormative);
    setShowEditNormative(true);
  }

  // Funzione per formattare le date per input HTML5 SENZA problemi di timezone
  function formatDateForInput(dateValue: any): string {
    if (!dateValue) return '';
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    // Usa il timezone locale per evitare problemi di conversione UTC
    // Formato YYYY-MM-DD mantenendo il giorno originale
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  function handleAddTag() {
    if (tagInput.trim() && !normativeForm.tags.includes(tagInput.trim())) {
      setNormativeForm({
        ...normativeForm,
        tags: [...normativeForm.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setNormativeForm({
      ...normativeForm,
      tags: normativeForm.tags.filter(tag => tag !== tagToRemove)
    });
  }

  function handleAddTagToEditing() {
    if (tagInput.trim() && editingNormative && !editingNormative.tags?.includes(tagInput.trim())) {
      const newTags = [...(editingNormative.tags || []), tagInput.trim()];
      setEditingNormative({...editingNormative, tags: newTags});
      setTagInput('');
    }
  }

  // Handler per download PDF documento (Admin)
  async function handleDownloadDocumentPDF(doc: any) {
    try {
      console.log('🔄 Generando PDF per documento:', doc.title);
      
      const pdfBlob = await generatePDF(doc, 'document');
      
      // Crea un link per il download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title || 'documento'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Download PDF completato con successo');
      addNotification('success', 'PDF Generato', `Il PDF del documento "${doc.title}" è stato scaricato`);
    } catch (error) {
      console.error('❌ Errore durante il download PDF:', error);
      addNotification('error', 'Errore Download', 'Si è verificato un errore durante la generazione del PDF');
    }
  }

  // Handler per download file originale (Admin)
  async function handleDownloadOriginalFile(doc: any) {
    try {
      if (!doc.file_path) {
        addNotification('error', 'File Non Disponibile', 'Nessun file originale disponibile per questo documento');
        return;
      }

      if (isGoogleDriveUrl(doc.file_path)) {
        await downloadGoogleDriveFile(doc.file_path, doc.filename || doc.title);
        addNotification('success', 'Download Completato', `Il file "${doc.filename || doc.title}" è stato scaricato da Google Drive`);
      } else {
        // Download standard per altri tipi di link
        const link = document.createElement('a');
        link.href = doc.file_path;
        link.download = doc.filename || doc.title || 'documento';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addNotification('success', 'Download Avviato', `Il download del file "${doc.filename || doc.title}" è stato avviato`);
      }
      
      console.log('✅ Download file originale completato con successo');
    } catch (error) {
      console.error('❌ Errore durante il download del file originale:', error);
      addNotification('error', 'Errore Download', 'Si è verificato un errore durante il download del file');
    }
  }

  // Handler per documenti
  async function handleCreateDocument() {
    try {
      if (!documentForm.title || !documentForm.filename || !documentForm.type || !documentForm.category) {
        addNotification('error', 'Errore Validazione', 'Titolo, filename, tipo e categoria sono obbligatori');
        return;
      }

      await createDocument({
        title: documentForm.title,
        description: documentForm.description,
        filename: documentForm.filename,
        file_path: documentForm.file_path,
        file_size: documentForm.file_size ? parseInt(documentForm.file_size) : undefined,
        mime_type: documentForm.mime_type,
        type: documentForm.type,
        category: documentForm.category,
        tags: documentForm.tags,
        version: documentForm.version,
        status: documentForm.status,
        uploaded_by: profile?.id
      });

      setShowAddDocument(false);
      setDocumentForm({
        title: '',
        description: '',
        filename: '',
        file_path: '',
        file_size: '',
        mime_type: '',
        type: 'template',
        category: '',
        tags: [],
        version: '1.0',
        status: 'active'
      });
      setDocumentTagInput('');
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Documento Creato', `Il documento "${documentForm.title}" è stato aggiunto al sistema`);
    } catch (error) {
      console.error('Error creating document:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione del documento');
    }
  }

  async function handleUpdateDocument() {
    console.log('🔄 handleUpdateDocument chiamato');

    try {
      if (!editingDocument) {
        console.error('❌ Nessun documento da modificare');
        return;
      }

      if (!editingDocument.title || !editingDocument.filename || !editingDocument.type || !editingDocument.category) {
        console.error('❌ Campi obbligatori mancanti');
        addNotification('error', 'Errore Validazione', 'Titolo, filename, tipo e categoria sono obbligatori');
        return;
      }

      console.log('📤 Chiamando updateDocument con dati:', {
        id: editingDocument.id,
        title: editingDocument.title
      });

      await updateDocument(editingDocument.id, {
        title: editingDocument.title,
        description: editingDocument.description,
        filename: editingDocument.filename,
        file_path: editingDocument.file_path,
        file_size: editingDocument.file_size,
        mime_type: editingDocument.mime_type,
        type: editingDocument.type,
        category: editingDocument.category,
        tags: editingDocument.tags,
        version: editingDocument.version,
        status: editingDocument.status,
        download_count: editingDocument.download_count,
        created_at: editingDocument.created_at,
        updated_at: editingDocument.updated_at
      });

      console.log('✅ updateDocument completato');

      setEditingDocument(null);
      setShowEditDocument(false);
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Documento Aggiornato', `Il documento "${editingDocument.title}" è stato modificato`);
    } catch (error) {
      console.error('🚨 Errore in handleUpdateDocument:', error);
      console.error('🚨 Dettagli errore:', error instanceof Error ? error.message : String(error));
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare il documento');
    }
  }

  async function handleDeleteDocument(documentId: string, documentTitle: string) {
    setDeleteConfirm({ show: true, document: { id: documentId, title: documentTitle } });
  }

  async function confirmDeleteDocument() {
    if (!deleteConfirm.document) return;

    try {
      const success = await deleteDocument(deleteConfirm.document.id);
      if (success) {
        await fetchAdminData(); // Refresh data
        addNotification('info', 'Documento Rimosso', `Il documento "${deleteConfirm.document.title}" è stato eliminato dal sistema`);
      } else {
        addNotification('error', 'Errore Eliminazione', 'Il documento non è stato trovato o non può essere eliminato');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare il documento');
    } finally {
      setDeleteConfirm({ show: false, document: null });
    }
  }

  // Handler per aprire modal di modifica documento
  function handleEditDocument(document: any) {
    setEditingDocument(document);
    setShowEditDocument(true);
  }

  // Handler per tag documenti
  function handleAddDocumentTag() {
    if (documentTagInput.trim() && !documentForm.tags.includes(documentTagInput.trim())) {
      setDocumentForm({
        ...documentForm,
        tags: [...documentForm.tags, documentTagInput.trim()]
      });
      setDocumentTagInput('');
    }
  }

  function handleRemoveDocumentTag(tagToRemove: string) {
    setDocumentForm({
      ...documentForm,
      tags: documentForm.tags.filter(tag => tag !== tagToRemove)
    });
  }

  function handleAddDocumentTagToEditing() {
    if (documentTagInput.trim() && editingDocument && !editingDocument.tags?.includes(documentTagInput.trim())) {
      const newTags = [...(editingDocument.tags || []), documentTagInput.trim()];
      setEditingDocument({...editingDocument, tags: newTags});
      setDocumentTagInput('');
    }
  }

  function addNotification(type: 'success' | 'error' | 'info', title: string, message: string) {
    const id = Date.now().toString();
    const notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }

  function removeNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function fetchAdminData() {
    try {
      // Fetch admin data
      const [totalUsers, totalNormatives, totalDocuments, usersData, normativesData, documentsData] = await Promise.all([
        getUsersCount(),
        getNormativesCount(),
        getDocumentsCount(),
        getUsers(profile?.role !== 'superadmin', profile?.id), // Escludi SuperAdmin solo se non sei SuperAdmin
        getNormatives(),
        getAllDocuments()
      ]);

      setStats({
        totalUsers,
        totalNormatives,
        totalViews: 1247, // Mock data
        newUsersThisMonth: 23 // Mock data
      });

      setUsers(usersData);
      setNormatives(normativesData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    try {
      if (!userForm.email || !userForm.full_name || !userForm.password) {
        addNotification('error', 'Errore Validazione', 'Tutti i campi sono obbligatori per creare un utente');
        return;
      }
      
      await createNewUser(userForm.email, userForm.full_name, userForm.password, userForm.role);
      setShowAddUser(false);
      setUserForm({ email: '', full_name: '', password: '', role: 'user' });
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Utente Creato', `L'utente ${userForm.full_name} è stato aggiunto al sistema`);
    } catch (error) {
      console.error('Error creating user:', error);
      addNotification('error', 'Errore Creazione', 'Si è verificato un errore durante la creazione dell\'utente');
    }
  }

  async function handleUpdateUser() {
    try {
      if (!editingUser) return;
      
      await updateUser(editingUser.id, {
        email: editingUser.email,
        full_name: editingUser.full_name,
        role: editingUser.role
      });
      
      setEditingUser(null);
      await fetchAdminData(); // Refresh data
      addNotification('success', 'Utente Aggiornato', `Le informazioni di ${editingUser.full_name} sono state salvate`);
    } catch (error) {
      console.error('Error updating user:', error);
      addNotification('error', 'Errore Aggiornamento', 'Non è stato possibile aggiornare le informazioni dell\'utente');
    }
  }

  async function handleDeleteUser(userId: string, userEmail: string) {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${userEmail}?`)) {
      return;
    }
    
    try {
      await deleteUser(userId);
      await fetchAdminData(); // Refresh data
      addNotification('info', 'Utente Rimosso', `L'utente ${userEmail} è stato eliminato dal sistema`);
    } catch (error) {
      console.error('Error deleting user:', error);
      addNotification('error', 'Errore Eliminazione', 'Non è stato possibile eliminare l\'utente');
    }
  }

  async function handleUpdatePassword() {
    try {
      if (!showPasswordModal || !newPassword) {
        addNotification('error', 'Password Richiesta', 'Inserisci una nuova password per continuare');
        return;
      }
      
      if (newPassword.length < 6) {
        addNotification('error', 'Password Troppo Corta', 'La password deve contenere almeno 6 caratteri');
        return;
      }
      
      await updateUserPassword(showPasswordModal.id, newPassword);
      setShowPasswordModal(null);
      setNewPassword('');
      addNotification('success', 'Password Aggiornata', `La password di ${showPasswordModal.full_name} è stata modificata`);
    } catch (error) {
      console.error('Error updating password:', error);
      addNotification('error', 'Errore Password', 'Non è stato possibile aggiornare la password');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Utenti Totali',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: `+${stats.newUsersThisMonth} questo mese`
    },
    {
      title: 'Normative Pubblicate',
      value: stats.totalNormatives,
      icon: FileText,
      color: 'bg-green-500',
      change: '+5 questa settimana'
    },
    {
      title: 'Visualizzazioni Totali',
      value: stats.totalViews,
      icon: Eye,
      color: 'bg-purple-500',
      change: '+156 oggi'
    },
    {
      title: 'Tasso di Completamento',
      value: '73%',
      icon: BarChart3,
      color: 'bg-orange-500',
      change: '+5% vs scorso mese'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => {
            const Icon = notification.type === 'success' ? CheckCircle : 
                        notification.type === 'error' ? AlertCircle : Info;
            const bgColor = notification.type === 'success' ? 'bg-green-50 border-green-200' :
                           notification.type === 'error' ? 'bg-red-50 border-red-200' :
                           'bg-blue-50 border-blue-200';
            const iconColor = notification.type === 'success' ? 'text-green-600' :
                             notification.type === 'error' ? 'text-red-600' :
                             'text-blue-600';
            const textColor = notification.type === 'success' ? 'text-green-800' :
                             notification.type === 'error' ? 'text-red-800' :
                             'text-blue-800';
            
            return (
              <div
                key={notification.id}
                className={`${bgColor} border rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right duration-300`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold ${textColor}`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm ${textColor} opacity-90 mt-1`}>
                      {notification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className={`${iconColor} hover:opacity-70 transition-opacity`}
                    aria-label="Chiudi notifica"
                    title="Chiudi notifica"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Pannello Amministrativo
          </h1>
         <p className="text-gray-600">
           Gestione utenti, contenuti e monitoraggio piattaforma
         </p>
       </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 lg:p-3 rounded-lg ${isActive ? 'bg-blue-500' : 'bg-gray-100'}`}>
                    <Icon className={`h-4 w-4 lg:h-6 lg:w-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                </div>
                <h3 className={`text-sm lg:text-lg font-semibold mb-2 leading-tight ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                  {stat.title}
                </h3>
                <p className={`text-xs lg:text-sm leading-tight ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                  {stat.value}
                </p>
                <span className="text-sm text-green-600 font-medium">
                  {stat.change}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Panoramica', icon: Settings },
                { id: 'users', label: 'Utenti', icon: Users },
                { id: 'normatives', label: 'Normative', icon: FileText },
                { id: 'documents', label: 'Documenti', icon: FolderOpen }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attività Recenti
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Nuova normativa pubblicata</p>
                      <p className="text-sm text-gray-600">Regolamento Trasporti 2024</p>
                    </div>
                    <span className="text-sm text-gray-500">2 ore fa</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Nuovo utente registrato</p>
                      <p className="text-sm text-gray-600">Marco Rossi</p>
                    </div>
                    <span className="text-sm text-gray-500">5 ore fa</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">Gestione Utenti ({users.length})</h3>
                  <button
                    onClick={() => {
                      setUserForm({ email: '', full_name: '', password: '', role: 'user' });
                      setShowAddUser(true);
                    }}
                    className="flex items-center justify-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors w-full sm:w-auto"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Utente</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors space-y-3 sm:space-y-0"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{user.full_name}</h4>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'operator' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role === 'superadmin' ? 'Super Admin' :
                             user.role === 'admin' ? 'Amministratore' :
                             user.role === 'operator' ? 'Operatore' : 'Utente'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}> 
                            {user.status === 'active' ? 'Attivo' : 'Inattivo'}
                          </span>
                          <span className="text-xs text-gray-500">Ultimo accesso: {user.last_login ? new Date(user.last_login).toLocaleDateString('it-IT') : 'Mai'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleStatusToggle(user)}
                          className={`p-2 rounded-full transition-colors ${user.status === 'active' ? 'text-green-500 hover:bg-green-100' : 'text-red-500 hover:bg-red-100'}`}
                          title={user.status === 'active' ? 'Disattiva utente' : 'Attiva utente'}
                        >
                          {user.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setShowPasswordModal(user)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Cambia password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.full_name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                          title="Elimina utente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'normatives' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Gestione Normative ({normatives.length})
                  </h3>
                  <button
                    onClick={() => setShowAddNormative(true)}
                    className="flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Normativa</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {normatives.map((normative) => (
                    <div
                      key={normative.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {normative.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            normative.type === 'law' ? 'bg-blue-100 text-blue-800' :
                            normative.type === 'regulation' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {normative.type === 'law' ? 'Legge' :
                             normative.type === 'regulation' ? 'Regolamento' : 'Sentenza'}
                          </span>
                          <span>{normative.reference_number}</span>
                          <span>
                            {normative.publication_date 
                              ? new Date(normative.publication_date).toLocaleDateString('it-IT')
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => console.log('View normative:', normative.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Visualizza"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditNormative(normative)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Modifica"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteNormative(normative.id, normative.title)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Gestione Documenti ({documents.length})
                  </h3>
                  <button
                    onClick={() => setShowAddDocument(true)}
                    className="flex items-center justify-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors w-full sm:w-auto"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Aggiungi Documento</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors space-y-3 sm:space-y-0"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 truncate">
                          {document.filename}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {document.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            document.type === 'template' ? 'bg-blue-100 text-blue-800' :
                            document.type === 'form' ? 'bg-green-100 text-green-800' :
                            document.type === 'guide' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {document.type === 'template' ? 'Template' :
                             document.type === 'form' ? 'Modulo' :
                             document.type === 'guide' ? 'Guida' : 'Report'}
                          </span>
                          <span className="text-xs sm:text-sm truncate">{document.category}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            document.status === 'active' ? 'bg-green-100 text-green-800' :
                            document.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {document.status === 'active' ? 'Attivo' :
                             document.status === 'draft' ? 'Bozza' : 'Archiviato'}
                          </span>
                          <span className="text-xs">📊 {document.download_count}</span>
                          {document.file_size && <span className="text-xs">💾 {document.file_size}KB</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 flex-shrink-0">
                        <button
                          onClick={() => setViewingDocument(document)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Visualizza"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocumentPDF(document)}
                          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Scarica PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {document.file_path && (
                          <button
                            onClick={() => handleDownloadOriginalFile(document)}
                            className={`p-2 transition-colors ${
                              isGoogleDriveUrl(document.file_path) 
                                ? 'text-gray-400 hover:text-green-600' 
                                : 'text-gray-400 hover:text-blue-600'
                            }`}
                            title={isGoogleDriveUrl(document.file_path) ? "Scarica da Google Drive" : "Scarica File Originale"}
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditDocument(document)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Modifica"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(document.id, document.title)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Aggiungi Utente */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuovo Utente</h3>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@esempio.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome e Cognome"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value as 'user' | 'admin' | 'superadmin' | 'operator'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">Utente</option>
                    <option value="operator">Operatore</option>
                    <option value="admin">Amministratore</option>
                    {profile?.role === 'superadmin' && (
                      <option value="superadmin">Super Amministratore</option>
                    )}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Utente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Normativa */}
        {showAddNormative && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuova Normativa</h3>
                <button
                  onClick={() => setShowAddNormative(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={normativeForm.title}
                    onChange={(e) => setNormativeForm({...normativeForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Titolo della normativa"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero di Riferimento *</label>
                  <input
                    type="text"
                    value={normativeForm.reference_number}
                    onChange={(e) => setNormativeForm({...normativeForm, reference_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es: D.Lgs. 285/1992"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={normativeForm.type}
                      onChange={(e) => setNormativeForm({...normativeForm, type: e.target.value as 'law' | 'regulation' | 'ruling'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="law">Legge</option>
                      <option value="regulation">Regolamento</option>
                      <option value="ruling">Sentenza</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <input
                      type="text"
                      value={normativeForm.category}
                      onChange={(e) => setNormativeForm({...normativeForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es: Trasporto Pubblico"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pubblicazione *</label>
                    <input
                      type="date"
                      value={normativeForm.publication_date}
                      onChange={(e) => setNormativeForm({...normativeForm, publication_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Efficacia *</label>
                    <input
                      type="date"
                      value={normativeForm.effective_date}
                      onChange={(e) => setNormativeForm({...normativeForm, effective_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File</label>
                    <input
                      type="text"
                      value={normativeForm.filename}
                      onChange={(e) => setNormativeForm({...normativeForm, filename: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="documento.pdf"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={normativeForm.file_path}
                      onChange={(e) => setNormativeForm({...normativeForm, file_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://drive.google.com/file/d/..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
                  <textarea
                    value={normativeForm.content}
                    onChange={(e) => setNormativeForm({...normativeForm, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Testo completo della normativa..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {normativeForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddNormative(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateNormative}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Normativa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Normativa */}
        {showEditNormative && editingNormative && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Normativa</h3>
                <button
                  onClick={() => setShowEditNormative(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={editingNormative.title}
                    onChange={(e) => setEditingNormative({...editingNormative, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero di Riferimento *</label>
                  <input
                    type="text"
                    value={editingNormative.reference_number}
                    onChange={(e) => setEditingNormative({...editingNormative, reference_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={editingNormative.type}
                      onChange={(e) => setEditingNormative({...editingNormative, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="law">Legge</option>
                      <option value="regulation">Regolamento</option>
                      <option value="ruling">Sentenza</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <input
                      type="text"
                      value={editingNormative.category}
                      onChange={(e) => setEditingNormative({...editingNormative, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pubblicazione *</label>
                    <input
                      type="date"
                      value={editingNormative.publication_date}
                      onChange={(e) => setEditingNormative({...editingNormative, publication_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Efficacia *</label>
                    <input
                      type="date"
                      value={editingNormative.effective_date}
                      onChange={(e) => setEditingNormative({...editingNormative, effective_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File</label>
                    <input
                      type="text"
                      value={editingNormative.filename || ''}
                      onChange={(e) => setEditingNormative({...editingNormative, filename: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="documento.pdf"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={editingNormative.file_path || ''}
                      onChange={(e) => setEditingNormative({...editingNormative, file_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://drive.google.com/file/d/..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
                  <textarea
                    value={editingNormative.content}
                    onChange={(e) => setEditingNormative({...editingNormative, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTagToEditing()}
                      placeholder="Aggiungi tag..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddTagToEditing}
                      className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingNormative.tags?.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = editingNormative.tags?.filter((_: string, i: number) => i !== index) || [];
                            setEditingNormative({...editingNormative, tags: newTags});
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditNormative(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateNormative}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal Cambia Password */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Cambia Password - {showPasswordModal.full_name}
                </h3>
                <button
                  onClick={() => setShowPasswordModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuova Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdatePassword}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Aggiorna Password
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal Aggiungi Documento */}
        {showAddDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Nuovo Documento</h3>
                <button
                  onClick={() => setShowAddDocument(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                    <input
                      type="text"
                      value={documentForm.title}
                      onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titolo del documento"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File *</label>
                    <input
                      type="text"
                      value={documentForm.filename}
                      onChange={(e) => setDocumentForm({...documentForm, filename: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="nomefile.pdf"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={documentForm.description}
                    onChange={(e) => setDocumentForm({...documentForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrizione del documento..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={documentForm.type}
                      onChange={(e) => setDocumentForm({...documentForm, type: e.target.value as 'template' | 'form' | 'guide' | 'report'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="template">Template</option>
                      <option value="form">Modulo</option>
                      <option value="guide">Guida</option>
                      <option value="report">Report</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                    <input
                      type="text"
                      value={documentForm.category}
                      onChange={(e) => setDocumentForm({...documentForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Es: Amministrazione"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensione (KB)</label>
                    <input
                      type="number"
                      value={documentForm.file_size}
                      onChange={(e) => setDocumentForm({...documentForm, file_size: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1024"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versione</label>
                    <input
                      type="text"
                      value={documentForm.version}
                      onChange={(e) => setDocumentForm({...documentForm, version: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1.0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                    <select
                      value={documentForm.status}
                      onChange={(e) => setDocumentForm({...documentForm, status: e.target.value as 'active' | 'draft' | 'archived'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Attivo</option>
                      <option value="draft">Bozza</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={documentForm.file_path}
                      onChange={(e) => setDocumentForm({...documentForm, file_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/uploads/documenti/"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MIME</label>
                    <input
                      type="text"
                      value={documentForm.mime_type}
                      onChange={(e) => setDocumentForm({...documentForm, mime_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="application/pdf"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={documentTagInput}
                      onChange={(e) => setDocumentTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocumentTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddDocumentTag}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {documentForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveDocumentTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddDocument(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Crea Documento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Visualizza Documento */}
        {viewingDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Visualizza Documento</h3>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.title}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.filename}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[60px]">
                    {viewingDocument.description || 'Nessuna descrizione'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingDocument.type === 'template' ? 'bg-blue-100 text-blue-800' :
                        viewingDocument.type === 'form' ? 'bg-green-100 text-green-800' :
                        viewingDocument.type === 'guide' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {viewingDocument.type === 'template' ? 'Template' :
                         viewingDocument.type === 'form' ? 'Modulo' :
                         viewingDocument.type === 'guide' ? 'Guida' : 'Report'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.category}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensione</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.file_size ? `${viewingDocument.file_size} KB` : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versione</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.version || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingDocument.status === 'active' ? 'bg-green-100 text-green-800' :
                        viewingDocument.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {viewingDocument.status === 'active' ? 'Attivo' :
                         viewingDocument.status === 'draft' ? 'Bozza' : 'Archiviato'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm">
                      {viewingDocument.file_path || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MIME</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm">
                      {viewingDocument.mime_type || 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {viewingDocument.tags && viewingDocument.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewingDocument.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">Nessun tag</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Download</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      📊 {viewingDocument.download_count || 0} download
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Creazione</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {viewingDocument.created_at ? new Date(viewingDocument.created_at).toLocaleDateString('it-IT') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-3 mt-6">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDownloadDocumentPDF(viewingDocument)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    title="Scarica PDF"
                  >
                    <Download className="h-3 w-3" />
                    <span>PDF</span>
                  </button>
                  {viewingDocument.file_path && (
                    <button
                      onClick={() => handleDownloadOriginalFile(viewingDocument)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                      title={isGoogleDriveUrl(viewingDocument.file_path) ? "Scarica da Google Drive" : "Scarica file originale"}
                    >
                      {isGoogleDriveUrl(viewingDocument.file_path) ? (
                        <svg className="h-3 w-3" viewBox="0 0 87.3 78" fill="none">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5l-7.65-13.25-5.15-8.9-.5-.85-13.75 23.8z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.9-22.3c-1.4-.8-2.95-1.2-4.5-1.2h18.5c1.6 0 3.15.45 4.5 1.2z" fill="#ffba00"/>
                        </svg>
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span>File</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Documento */}
        {showEditDocument && editingDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Documento</h3>
                <button
                  onClick={() => setShowEditDocument(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                    <input
                      type="text"
                      value={editingDocument.title}
                      onChange={(e) => setEditingDocument({...editingDocument, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome File *</label>
                    <input
                      type="text"
                      value={editingDocument.filename}
                      onChange={(e) => setEditingDocument({...editingDocument, filename: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={editingDocument.description || ''}
                    onChange={(e) => setEditingDocument({...editingDocument, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={editingDocument.type}
                      onChange={(e) => setEditingDocument({...editingDocument, type: e.target.value as 'template' | 'form' | 'guide' | 'report'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="template">Template</option>
                      <option value="form">Modulo</option>
                      <option value="guide">Guida</option>
                      <option value="report">Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                    <input
                      type="text"
                      value={editingDocument.category}
                      onChange={(e) => setEditingDocument({...editingDocument, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensione (KB)</label>
                    <input
                      type="number"
                      value={editingDocument.file_size || 0}
                      onChange={(e) => setEditingDocument({...editingDocument, file_size: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versione</label>
                    <input
                      type="text"
                      value={editingDocument.version || ''}
                      onChange={(e) => setEditingDocument({...editingDocument, version: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                    <select
                      value={editingDocument.status}
                      onChange={(e) => setEditingDocument({...editingDocument, status: e.target.value as 'active' | 'draft' | 'archived'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Attivo</option>
                      <option value="draft">Bozza</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                    <input
                      type="text"
                      value={editingDocument.file_path || ''}
                      onChange={(e) => setEditingDocument({...editingDocument, file_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MIME</label>
                    <input
                      type="text"
                      value={editingDocument.mime_type || ''}
                      onChange={(e) => setEditingDocument({...editingDocument, mime_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conteggio Download</label>
                    <input
                      type="number"
                      value={editingDocument.download_count || 0}
                      onChange={(e) => setEditingDocument({...editingDocument, download_count: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Creazione</label>
                    <input
                      type="datetime-local"
                      value={editingDocument.created_at ? new Date(editingDocument.created_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingDocument({...editingDocument, created_at: e.target.value ? new Date(e.target.value).toISOString() : null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Modifica</label>
                    <input
                      type="datetime-local"
                      value={editingDocument.updated_at ? new Date(editingDocument.updated_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingDocument({...editingDocument, updated_at: e.target.value ? new Date(e.target.value).toISOString() : null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={documentTagInput}
                      onChange={(e) => setDocumentTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocumentTagToEditing())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Aggiungi tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddDocumentTagToEditing}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Aggiungi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingDocument.tags?.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = editingDocument.tags?.filter((_: string, i: number) => i !== index) || [];
                            setEditingDocument({...editingDocument, tags: newTags});
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditDocument(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateDocument}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal Conferma Eliminazione Documento */}
        {deleteConfirm.show && deleteConfirm.document && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Conferma Eliminazione</h3>
                <button
                  onClick={() => setDeleteConfirm({ show: false, document: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Sei sicuro di voler eliminare il documento <strong>"{deleteConfirm.document.title}"</strong>?
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Questa azione non può essere annullata.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm({ show: false, document: null })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Elimina Documento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}