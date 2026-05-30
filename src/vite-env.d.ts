/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TARGET?: 'clientes' | 'caficultores' | 'negocios' | 'admin';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
