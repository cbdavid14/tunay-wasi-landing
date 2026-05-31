/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TARGET?: 'clientes' | 'caficultores' | 'negocios';
  readonly VITE_BRAND_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
