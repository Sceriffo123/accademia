// Sistema di database locale per sviluppo
interface User {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
}

interface Normative {
  id: string;
  title: string;
  content: string;
  category: string;
  type: 'law' | 'regulation' | 'ruling';
  reference_number: string;
  publication_date: string;
  effective_date: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Storage locale usando localStorage
class LocalDatabase {
  private getUsers(): User[] {
    const users = localStorage.getItem('accademia_users');
    return users ? JSON.parse(users) : [];
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem('accademia_users', JSON.stringify(users));
  }

  private getNormatives(): Normative[] {
    const normatives = localStorage.getItem('accademia_normatives');
    return normatives ? JSON.parse(normatives) : [];
  }

  private saveNormatives(normatives: Normative[]): void {
    localStorage.setItem('accademia_normatives', JSON.stringify(normatives));
  }

  // Inizializza dati di esempio
  async initializeData(): Promise<void> {
    const users = this.getUsers();
    const normatives = this.getNormatives();

    // Crea utenti di default se non esistono
    if (users.length === 0) {
      const defaultUsers: User[] = [
        {
          id: '1',
          email: 'admin@accademia.it',
          full_name: 'Amministratore',
          password_hash: await this.hashPassword('admin123'),
          role: 'admin',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          email: 'user@accademia.it',
          full_name: 'Utente Demo',
          password_hash: await this.hashPassword('user123'),
          role: 'user',
          created_at: new Date().toISOString()
        }
      ];
      this.saveUsers(defaultUsers);
    }

    // Crea normative di esempio se non esistono
    if (normatives.length === 0) {
      const defaultNormatives: Normative[] = [
        {
          id: '1',
          title: 'Decreto Legislativo 285/1992 - Codice della Strada',
          content: 'Il presente decreto disciplina la circolazione stradale e stabilisce le norme per il trasporto pubblico locale non di linea. Articolo 1: Definizioni e campo di applicazione. Il trasporto pubblico locale non di linea comprende tutti i servizi di trasporto di persone effettuati con veicoli adibiti al trasporto di persone aventi più di nove posti compreso quello del conducente.',
          category: 'Trasporto Pubblico',
          type: 'law',
          reference_number: 'D.Lgs. 285/1992',
          publication_date: '1992-04-30',
          effective_date: '1993-01-01',
          tags: ['trasporto', 'codice strada', 'pubblico locale'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Legge Regionale 15/2018 - Disciplina TPL non di linea',
          content: 'La presente legge disciplina il trasporto pubblico locale non di linea nella regione, stabilendo requisiti, procedure e controlli. Articolo 1: Oggetto e finalità. La presente legge disciplina il trasporto pubblico locale non di linea al fine di garantire la sicurezza degli utenti e la qualità del servizio.',
          category: 'Normativa Regionale',
          type: 'regulation',
          reference_number: 'L.R. 15/2018',
          publication_date: '2018-03-15',
          effective_date: '2018-06-01',
          tags: ['trasporto locale', 'regionale', 'licenze'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          title: 'Sentenza TAR Lazio n. 1234/2023',
          content: 'Il Tribunale Amministrativo Regionale del Lazio si è pronunciato sulla questione relativa ai requisiti per il rilascio delle autorizzazioni per il trasporto pubblico locale non di linea. La sentenza chiarisce i criteri di valutazione delle domande di autorizzazione.',
          category: 'Giurisprudenza',
          type: 'ruling',
          reference_number: 'TAR Lazio 1234/2023',
          publication_date: '2023-05-20',
          effective_date: '2023-05-20',
          tags: ['tar', 'autorizzazioni', 'giurisprudenza'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      this.saveNormatives(defaultNormatives);
    }
  }

  // Hash password usando Web Crypto API
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'accademia_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verifica password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  // Metodi per utenti
  async getUserByEmail(email: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(u => u.email === email) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  async createUser(email: string, fullName: string, passwordHash: string, role: 'user' | 'admin' = 'user'): Promise<User> {
    const users = this.getUsers();
    const newUser: User = {
      id: Date.now().toString(),
      email,
      full_name: fullName,
      password_hash: passwordHash,
      role,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }

  async getUsersCount(): Promise<number> {
    return this.getUsers().length;
  }

  // Metodi per aggiornamento utenti
  async updateUser(id: string, data: { email?: string; full_name?: string; role?: 'user' | 'admin' | 'superadmin' | 'operator' }): Promise<User | null> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return null;
    }
    
    users[userIndex] = { ...users[userIndex], ...data };
    this.saveUsers(users);
    return users[userIndex];
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = this.getUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    
    if (filteredUsers.length === users.length) {
      return false; // Utente non trovato
    }
    
    this.saveUsers(filteredUsers);
    return true;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<boolean> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return false;
    }
    
    const passwordHash = await this.hashPassword(newPassword);
    users[userIndex].password_hash = passwordHash;
    this.saveUsers(users);
    return true;
  }

  // Metodi per normative
  async getAllNormatives(): Promise<Normative[]> {
    return this.getNormatives();
  }

  async getNormativeById(id: string): Promise<Normative | null> {
    const normatives = this.getNormatives();
    return normatives.find(n => n.id === id) || null;
  }

  async getNormativesCount(): Promise<number> {
    return this.getNormatives().length;
  }

  async getRecentNormativesCount(days: number = 30): Promise<number> {
    const normatives = this.getNormatives();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return normatives.filter(n => new Date(n.created_at) >= cutoffDate).length;
  }
}

export const localDB = new LocalDatabase();
export type { User, Normative };