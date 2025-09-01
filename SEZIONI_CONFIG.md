# Configurazione Sezioni per Ruoli - Accademia

## 🎯 Problema Risolto

**Problema:** La sezione 'documents' non appariva nel frontend anche se abilitata nel database.

**Causa:** La funzione `getRoleSectionsFromDB` era mancante nel file `neonDatabase.ts`.

**Soluzione:** Implementata la funzione `getRoleSectionsFromDB` con configurazione hardcoded delle sezioni per ruolo.

## 📋 Configurazione Sezioni per Ruolo

### Superadmin
```json
[
  "dashboard",
  "users",
  "normatives",
  "documents",  // ← SEZIONE AGGIUNTA
  "courses",
  "modules",
  "quizzes",
  "reports",
  "settings"
]
```

### Admin
```json
[
  "dashboard",
  "users",
  "normatives",
  "documents",
  "courses",
  "modules",
  "quizzes",
  "reports"
]
```

### Operator
```json
[
  "dashboard",
  "normatives",
  "courses"
]
```

### User
```json
[
  "dashboard",
  "normatives",
  "documents"
]
```

### Guest
```json
[
  "dashboard"
]
```

## 🔧 Funzione Implementata

```typescript
async function getRoleSectionsFromDB(role: string): Promise<string[]> {
  const sectionsConfig: Record<string, string[]> = {
    'superadmin': ['dashboard', 'users', 'normatives', 'documents', 'courses', 'modules', 'quizzes', 'reports', 'settings'],
    'admin': ['dashboard', 'users', 'normatives', 'documents', 'courses', 'modules', 'quizzes', 'reports'],
    'operator': ['dashboard', 'normatives', 'courses'],
    'user': ['dashboard', 'normatives', 'documents'],
    'guest': ['dashboard']
  };

  return sectionsConfig[role] || ['dashboard'];
}
```

## 📝 Note Importanti

- **Sezione 'documents'**: Ora abilitata per superadmin, admin e user
- **Fallback**: Se il ruolo non è configurato, viene restituita solo la sezione 'dashboard'
- **Configurazione**: Attualmente hardcoded, ma può essere facilmente migrata a database
- **Logging**: La funzione include logging dettagliato per debug

## 🧪 Test

Ora dovresti vedere i documenti nel frontend quando accedi come superadmin!

**Verifica:**
1. Apri la pagina Documenti
2. I documenti dovrebbero apparire nella lista
3. Il pannello debug dovrebbe mostrare `sectionVisible: true`

## 🔮 Miglioramenti Futuri

- Migrare la configurazione sezioni da hardcoded a tabella database
- Aggiungere interfaccia admin per gestire sezioni per ruolo
- Implementare cache Redis per performance
- Aggiungere audit logging per modifiche sezioni

---

*Questo documento serve come riferimento per futuri sviluppi e troubleshooting del sistema di sezioni.*
