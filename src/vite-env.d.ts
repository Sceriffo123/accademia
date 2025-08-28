/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATABASE_URL: string
  // Altre variabili d'ambiente...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
