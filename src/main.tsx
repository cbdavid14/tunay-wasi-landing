import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/queryClient';
import './index.css';

const target = import.meta.env.VITE_APP_TARGET ?? 'clientes';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

async function mountApp() {
  let AppComponent;

  if (target === 'marketplace') {
    const mod = await import('./AppMarketplace');
    AppComponent = mod.default;
  } else {
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
