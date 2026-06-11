import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/queryClient';
import './index.css';

/**
 * VITE_APP_TARGET controla qué SPA se monta:
 *
 *   clientes      → Landing B2C (tienda preventa)
 *   marketplace   → Portal cafetería sin laboratorio propio
 *   cafeteria_lab → Portal cafetería con laboratorio propio ("Mi laboratorio" activo)
 *   caficultor    → Portal caficultor (registro y publicación de lotes)
 *   laboratorio   → Portal laboratorio (catación + tueste)
 *   admin         → Panel administrador Tunay Wasi
 */
const target = import.meta.env.VITE_APP_TARGET ?? 'clientes';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

async function mountApp() {
  let AppComponent;

  if (target === 'marketplace' || target === 'cafeteria_lab') {
    const mod = await import('./AppMarketplace');
    AppComponent = mod.default;
  } else if (target === 'caficultor') {
    const mod = await import('./AppCaficultor');
    AppComponent = mod.default;
  } else if (target === 'laboratorio') {
    const mod = await import('./AppLaboratorio');
    AppComponent = mod.default;
  } else if (target === 'admin') {
    const mod = await import('./AppAdmin');
    AppComponent = mod.default;
  } else {
    // clientes — landing B2C por defecto
    const mod = await import('./App');
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
