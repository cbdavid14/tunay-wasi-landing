/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TARGET?: 'clientes' | 'caficultores' | 'negocios' | 'pitchdeck';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
