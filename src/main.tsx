import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/queryClient';
import './index.css';

/**
 * VITE_APP_TARGET controla qué SPA se monta:
 *
 *   marketplace   → Portal B2B unificado (todos los actores: caficultor, laboratorio, cafetería)
 *   admin         → Panel administrador Tunay Wasi
 *   clientes      → Landing B2C (tienda preventa)
 *
 * Por defecto se monta 'marketplace'.
 */
const urlTarget = new URLSearchParams(window.location.search).get('target');
const target = urlTarget ?? import.meta.env.VITE_APP_TARGET ?? 'marketplace';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

async function mountApp() {
  let AppComponent;

  if (target === 'admin') {
    const mod = await import('./AppAdmin');
    AppComponent = mod.default;
  } else if (target === 'clientes') {
    const mod = await import('./App');
    AppComponent = mod.default;
  } else {
    // marketplace — portal B2B unificado (default)
    const mod = await import('./AppMarketplace');
    AppComponent = mod.default;
  }

  createRoot(root!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppComponent />
      </QueryClientProvider>
    </StrictMode>,
  );
}

mountApp();
