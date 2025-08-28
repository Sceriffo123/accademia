// Mock database implementation for browser compatibility
export interface QueryResult {
  rows: any[];
  rowCount: number;
}

// Mock data storage
const mockData = {
  users: [
    {
      id: '1',
      email: 'admin@accademia.it',
      full_name: 'Amministratore',
      role: 'admin',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      email: 'user@accademia.it',
      full_name: 'Utente Demo',
      role: 'user',
      created_at: new Date().toISOString()
    }
  ],
  normatives: [
    {
      id: '1',
      title: 'Decreto Legislativo 285/1992',
      description: 'Nuovo codice della strada - Disposizioni per il trasporto pubblico locale',
      category: 'decreto',
      content: 'Contenuto completo del decreto legislativo...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Legge Regionale 15/2018',
      description: 'Disciplina del trasporto pubblico locale non di linea',
      category: 'legge_regionale',
      content: 'Testo completo della legge regionale...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  activity_logs: []
};

export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  // Simple mock query implementation
  console.log('Mock query:', text, params);
  
  // Parse basic SELECT queries
  if (text.includes('SELECT') && text.includes('users')) {
    if (text.includes('WHERE email')) {
      const email = params[0];
      const user = mockData.users.find(u => u.email === email);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    if (text.includes('WHERE id')) {
      const id = params[0];
      const user = mockData.users.find(u => u.id === id);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    return { rows: mockData.users, rowCount: mockData.users.length };
  }
  
  if (text.includes('SELECT') && text.includes('normatives')) {
    return { rows: mockData.normatives, rowCount: mockData.normatives.length };
  }
  
  // Mock INSERT for users
  if (text.includes('INSERT INTO users')) {
    const newUser = {
      id: Date.now().toString(),
      email: params[0],
      full_name: params[2],
      role: params[3] || 'user',
      created_at: new Date().toISOString()
    };
    mockData.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }
  
  return { rows: [], rowCount: 0 };
}